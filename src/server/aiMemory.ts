// ─────────────────────────────────────────────────────────────
// AI Memory — per-user chat session storage.
//
// One ai_sessions row per page load. All messages from a session
// are appended to ai_messages. When user opens a new session, the
// last N messages from prior sessions are fetched and passed to the
// AI as "memory" context.
//
// This module is runtime-agnostic: it accepts a `query` function
// (CF D1 `.prepare(...).bind(...).all()` or SQLite `db.prepare`) and
// an `exec` function for writes. Both CF Pages Functions and the
// local Express server wire these up to their own DB.
// ─────────────────────────────────────────────────────────────
import type { AIToolCall } from "../types/ai.ts";

export interface AiSession {
  id: string;
  user_id: string;
  title: string | null;
  message_count: number;
  created_at: string;
  last_message_at: string;
}

export type AiMessageRole = "user" | "assistant" | "tool";

export interface AiMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: AiMessageRole;
  content: string;
  tool_calls: string | null;   // JSON
  metadata: string | null;     // JSON
  created_at: string;
}

export interface MemoryDeps {
  /** Run a SELECT query and return rows. */
  query: <T = any>(sql: string, params: any[]) => Promise<T[]>;
  /** Run an INSERT/UPDATE/DELETE statement. */
  exec: (sql: string, params: any[]) => Promise<{ changes?: number }>;
  /** Generate a unique ID. Default: timestamp + random hex. */
  newId?: () => string;
}

const defaultNewId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Create a new session for a user. Returns the session ID. */
export async function createSession(
  deps: MemoryDeps,
  userId: string,
  title?: string,
): Promise<string> {
  const id = (deps.newId ?? defaultNewId)();
  await deps.exec(
    `INSERT INTO ai_sessions (id, user_id, title, message_count, created_at, last_message_at)
     VALUES (?, ?, ?, 0, datetime('now'), datetime('now'))`,
    [id, userId, title ?? null],
  );
  return id;
}

/** Append a message to a session. Updates session counters. */
export async function appendMessage(
  deps: MemoryDeps,
  params: {
    sessionId: string;
    userId: string;
    role: AiMessageRole;
    content: string;
    toolCalls?: AIToolCall[];
    metadata?: Record<string, any>;
  },
): Promise<string> {
  const id = (deps.newId ?? defaultNewId)();
  await deps.exec(
    `INSERT INTO ai_messages (id, session_id, user_id, role, content, tool_calls, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      params.sessionId,
      params.userId,
      params.role,
      params.content,
      params.toolCalls ? JSON.stringify(params.toolCalls) : null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  );
  await deps.exec(
    `UPDATE ai_sessions
     SET message_count = message_count + 1,
         last_message_at = datetime('now')
     WHERE id = ?`,
    [params.sessionId],
  );
  return id;
}

/** Auto-generate a session title from the first user message
 *  (truncate to 60 chars, strip newlines). */
export function suggestTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 57) + "...";
}

export interface MemoryMessage {
  role: AiMessageRole;
  content: string;
  created_at: string;
  session_id: string;
  session_title: string | null;
}

/** Fetch the last N messages across all of the user's previous sessions
 *  (excluding the current session). Returns them in chronological order
 *  with session title context. */
export async function getRecentMemory(
  deps: MemoryDeps,
  userId: string,
  options: { limit?: number; excludeSessionId?: string } = {},
): Promise<MemoryMessage[]> {
  const limit = options.limit ?? 20;
  const exclude = options.excludeSessionId ?? "";
  const rows = await deps.query<MemoryMessage>(
    `SELECT m.role, m.content, m.created_at, m.session_id, s.title AS session_title
     FROM ai_messages m
     LEFT JOIN ai_sessions s ON s.id = m.session_id
     WHERE m.user_id = ?
       AND m.session_id != ?
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [userId, exclude, limit],
  );
  // Reverse to chronological order (oldest first)
  return rows.reverse();
}

/** List user's most recent sessions, newest first. */
export async function listSessions(
  deps: MemoryDeps,
  userId: string,
  limit = 10,
): Promise<AiSession[]> {
  return deps.query<AiSession>(
    `SELECT * FROM ai_sessions
     WHERE user_id = ?
     ORDER BY last_message_at DESC
     LIMIT ?`,
    [userId, limit],
  );
}

/** Get all messages for a specific session. */
export async function getSessionMessages(
  deps: MemoryDeps,
  sessionId: string,
  userId: string,
): Promise<AiMessage[]> {
  return deps.query<AiMessage>(
    `SELECT * FROM ai_messages
     WHERE session_id = ? AND user_id = ?
     ORDER BY created_at ASC`,
    [sessionId, userId],
  );
}

/** Delete a session (and its messages via CASCADE). */
export async function deleteSession(
  deps: MemoryDeps,
  sessionId: string,
  userId: string,
): Promise<void> {
  await deps.exec(
    `DELETE FROM ai_sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId],
  );
}

/** Set a session's title (auto-generated from first message). */
export async function setSessionTitle(
  deps: MemoryDeps,
  sessionId: string,
  userId: string,
  title: string,
): Promise<void> {
  await deps.exec(
    `UPDATE ai_sessions SET title = ? WHERE id = ? AND user_id = ?`,
    [title, sessionId, userId],
  );
}
