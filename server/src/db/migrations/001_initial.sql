PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
	version INTEGER PRIMARY KEY,
	applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	model TEXT NOT NULL,
	system_prompt TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
	id TEXT PRIMARY KEY,
	conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
	role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
	content TEXT NOT NULL DEFAULT '',
	thinking_content TEXT,
	model TEXT,
	tokens_per_sec REAL,
	duration_ms INTEGER,
	is_error INTEGER NOT NULL DEFAULT 0,
	stream_status TEXT NOT NULL DEFAULT 'complete' CHECK(stream_status IN ('streaming', 'complete', 'error')),
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS message_attachments (
	id TEXT PRIMARY KEY,
	message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
	filename TEXT NOT NULL,
	mime_type TEXT NOT NULL,
	storage_path TEXT,
	size_bytes INTEGER NOT NULL,
	kind TEXT NOT NULL CHECK(kind IN ('image', 'text')),
	content_text TEXT,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
	id TEXT PRIMARY KEY,
	filename TEXT NOT NULL,
	storage_path TEXT NOT NULL,
	mime_type TEXT,
	size_bytes INTEGER,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_message ON message_attachments(message_id);
