-- ─────────────────────────────────────────────────────────────
-- Migration 0002: AI Chat memory (Quantbit AI Depth Upgrade)
--
-- Per-user session + message persistence. Each page load creates a
-- new ai_sessions row. Messages from prior sessions are injected as
-- "memory" into the AI system prompt (see src/server/aiChatHandler.ts).
--
-- Idempotent — safe to re-run on existing D1.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_message_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant' | 'tool'
  content TEXT NOT NULL,
  tool_calls TEXT,    -- JSON array of AIToolCall
  metadata TEXT,      -- JSON (provider, action approvals, etc.)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON ai_messages(user_id, created_at);
