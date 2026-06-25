// ─────────────────────────────────────────────────────────────
// Unit tests for src/server/aiMemory.ts — session + message persistence
// Uses an in-memory deps adapter (same pattern as CF D1).
// ─────────────────────────────────────────────────────────────
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  appendMessage,
  getRecentMemory,
  listSessions,
  getSessionMessages,
  deleteSession,
  setSessionTitle,
  suggestTitle,
  type MemoryDeps,
} from "../aiMemory.ts";

// ── In-memory deps adapter (mirrors CF D1 PreparedStatement) ──

const _sessions: any[] = [];
const _messages: any[] = [];
let _tsCounter = 0;
const _now = () => {
  // Ensure unique timestamps by adding 1ms per call
  return new Date(Date.now() + _tsCounter++).toISOString();
};

const deps: MemoryDeps = {
  query: async <T = any>(sql: string, params: any[]): Promise<T[]> => {
    const s = sql.trim().toLowerCase();
    if (s.startsWith("select * from ai_sessions")) {
      const userId = params[0];
      const limit = params[1] || 10;
      return _sessions
        .filter((x) => x.user_id === userId)
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
        .slice(0, limit) as T[];
    }
    if (s.startsWith("select m.role, m.content, m.created_at, m.session_id")) {
      // ORDER BY m.created_at DESC LIMIT ? — match real SQL behavior
      // LEFT JOIN ai_sessions on s.id = m.session_id
      const userId = params[0];
      const exclude = params[1];
      const limit = params[2];
      return _messages
        .filter((m) => m.user_id === userId && m.session_id !== exclude)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
        .map((m) => {
          const sess = _sessions.find((s) => s.id === m.session_id);
          return { ...m, session_title: sess?.title ?? null };
        }) as T[];
    }
    if (s.startsWith("select * from ai_messages")) {
      const sessionId = params[0];
      const userId = params[1];
      return _messages
        .filter((m) => m.session_id === sessionId && m.user_id === userId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)) as T[];
    }
    return [] as T[];
  },
  exec: async (sql: string, params: any[]) => {
    const s = sql.trim().toLowerCase();
    if (s.startsWith("insert into ai_sessions")) {
      const [id, user_id, title, , ,] = params;
      _sessions.push({
        id, user_id, title,
        message_count: 0,
        created_at: _now(),
        last_message_at: _now(),
      });
      return { changes: 1 };
    }
    if (s.startsWith("insert into ai_messages")) {
      const [id, session_id, user_id, role, content, tool_calls, metadata] = params;
      _messages.push({
        id, session_id, user_id, role, content, tool_calls, metadata,
        created_at: _now(),
      });
      return { changes: 1 };
    }
    if (s.startsWith("update ai_sessions set title")) {
      // SET title = ? branch (more specific — check first)
      const [title, sessionId, userId] = params;
      const sess = _sessions.find((s) => s.id === sessionId && s.user_id === userId);
      if (sess) sess.title = title;
      return { changes: 1 };
    }
    if (s.startsWith("update ai_sessions")) {
      // message_count + last_message_at branch
      const sessionId = params[params.length - 1];
      const sess = _sessions.find((s) => s.id === sessionId);
      if (sess) {
        sess.message_count = (sess.message_count || 0) + 1;
        sess.last_message_at = _now();
      }
      return { changes: 1 };
    }
    if (s.startsWith("delete from ai_sessions")) {
      const [sessionId, userId] = params;
      const idx = _sessions.findIndex((s) => s.id === sessionId && s.user_id === userId);
      if (idx >= 0) {
        _sessions.splice(idx, 1);
        // CASCADE
        for (let i = _messages.length - 1; i >= 0; i--) {
          if (_messages[i].session_id === sessionId) _messages.splice(i, 1);
        }
      }
      return { changes: 1 };
    }
    return { changes: 0 };
  },
  newId: () => `id_${++counter}`,
};
let counter = 0;

beforeEach(() => {
  _sessions.length = 0;
  _messages.length = 0;
  counter = 0;
});

describe("createSession", () => {
  it("creates a session with auto id", async () => {
    const id = await createSession(deps, "user1");
    assert.ok(id.startsWith("id_"));
    assert.equal(_sessions.length, 1);
    assert.equal(_sessions[0].user_id, "user1");
    assert.equal(_sessions[0].message_count, 0);
  });

  it("accepts a title", async () => {
    const id = await createSession(deps, "user1", "My session");
    const sess = _sessions.find((s) => s.id === id);
    assert.equal(sess.title, "My session");
  });
});

describe("appendMessage", () => {
  it("inserts message and updates session counter", async () => {
    const id = await createSession(deps, "user1");
    const before = _sessions[0].message_count;
    await appendMessage(deps, {
      sessionId: id,
      userId: "user1",
      role: "user",
      content: "hello",
    });
    assert.equal(_messages.length, 1);
    assert.equal(_messages[0].content, "hello");
    assert.equal(_messages[0].role, "user");
    assert.equal(_sessions[0].message_count, before + 1);
  });

  it("stores toolCalls + metadata as JSON", async () => {
    const id = await createSession(deps, "user1");
    await appendMessage(deps, {
      sessionId: id,
      userId: "user1",
      role: "assistant",
      content: "ok",
      toolCalls: [{ id: "tc_test", name: "x", args: {} }],
      metadata: { provider: "openrouter" },
    });
    const m = _messages[0];
    assert.ok(JSON.parse(m.tool_calls).length === 1);
    assert.ok(JSON.parse(m.metadata).provider === "openrouter");
  });
});

describe("getRecentMemory", () => {
  it("returns messages in chronological order, excluding current session", async () => {
    const s1 = await createSession(deps, "user1", "older");
    await appendMessage(deps, { sessionId: s1, userId: "user1", role: "user", content: "old1" });
    await new Promise((r) => setTimeout(r, 2));
    await appendMessage(deps, { sessionId: s1, userId: "user1", role: "assistant", content: "old2" });

    const s2 = await createSession(deps, "user1", "current");
    const recent = await getRecentMemory(deps, "user1", { limit: 10, excludeSessionId: s2 });
    assert.equal(recent.length, 2);
    assert.equal(recent[0].content, "old1");
    assert.equal(recent[1].content, "old2");
    assert.equal(recent[0].session_title, "older");
  });

  it("respects limit", async () => {
    const s1 = await createSession(deps, "user1");
    for (let i = 0; i < 10; i++) {
      await appendMessage(deps, { sessionId: s1, userId: "user1", role: "user", content: `msg${i}` });
    }
    const recent = await getRecentMemory(deps, "user1", { limit: 3, excludeSessionId: "x" });
    assert.equal(recent.length, 3);
  });

  it("filters by user_id", async () => {
    const s1 = await createSession(deps, "user1");
    await appendMessage(deps, { sessionId: s1, userId: "user1", role: "user", content: "u1" });
    await appendMessage(deps, { sessionId: s1, userId: "user2", role: "user", content: "u2" });
    const recent = await getRecentMemory(deps, "user1", { limit: 10, excludeSessionId: "x" });
    assert.equal(recent.length, 1);
    assert.equal(recent[0].content, "u1");
  });
});

describe("listSessions", () => {
  it("returns user's sessions newest-first", async () => {
    await createSession(deps, "user1", "s1");
    await new Promise((r) => setTimeout(r, 5));
    await createSession(deps, "user1", "s2");
    const list = await listSessions(deps, "user1", 10);
    assert.equal(list.length, 2);
    assert.equal(list[0].title, "s2");  // newer first
    assert.equal(list[1].title, "s1");
  });
});

describe("getSessionMessages", () => {
  it("returns all messages for a session, oldest first", async () => {
    const id = await createSession(deps, "user1");
    await appendMessage(deps, { sessionId: id, userId: "user1", role: "user", content: "first" });
    await appendMessage(deps, { sessionId: id, userId: "user1", role: "assistant", content: "second" });
    const msgs = await getSessionMessages(deps, id, "user1");
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].content, "first");
    assert.equal(msgs[1].content, "second");
  });
});

describe("deleteSession", () => {
  it("removes session + cascades to messages", async () => {
    const id = await createSession(deps, "user1");
    await appendMessage(deps, { sessionId: id, userId: "user1", role: "user", content: "x" });
    assert.equal(_sessions.length, 1);
    assert.equal(_messages.length, 1);
    await deleteSession(deps, id, "user1");
    assert.equal(_sessions.length, 0);
    assert.equal(_messages.length, 0);
  });

  it("does not delete other users' sessions", async () => {
    const id = await createSession(deps, "user1");
    await deleteSession(deps, id, "user2");
    assert.equal(_sessions.length, 1);
  });
});

describe("setSessionTitle", () => {
  it("updates title", async () => {
    const id = await createSession(deps, "user1");
    await setSessionTitle(deps, id, "user1", "New title");
    const sess = _sessions.find((s) => s.id === id);
    assert.equal(sess.title, "New title");
  });
});

describe("suggestTitle", () => {
  it("strips whitespace and shortens to 60 chars", () => {
    assert.equal(suggestTitle("hello world"), "hello world");
    assert.equal(suggestTitle("  hello   world  "), "hello world");
    const long = "a".repeat(100);
    const result = suggestTitle(long);
    assert.equal(result.length, 60);
    assert.ok(result.endsWith("..."));
  });

  it("preserves short messages as-is", () => {
    assert.equal(suggestTitle("Hi"), "Hi");
    assert.equal(suggestTitle(""), "");
  });
});
