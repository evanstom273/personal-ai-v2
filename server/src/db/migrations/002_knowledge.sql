PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS knowledge_collections (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	parent_id TEXT REFERENCES knowledge_collections(id) ON DELETE SET NULL,
	kind TEXT NOT NULL DEFAULT 'folder' CHECK(kind IN ('folder', 'system')),
	system_key TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_collections_parent ON knowledge_collections(parent_id);

CREATE TABLE IF NOT EXISTS knowledge_notes (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	content TEXT NOT NULL DEFAULT '',
	collection_id TEXT REFERENCES knowledge_collections(id) ON DELETE SET NULL,
	source TEXT NOT NULL DEFAULT 'user' CHECK(source IN ('upload', 'user', 'assistant')),
	content_format TEXT NOT NULL DEFAULT 'markdown' CHECK(content_format IN ('markdown', 'html')),
	read_only INTEGER NOT NULL DEFAULT 0,
	pinned INTEGER NOT NULL DEFAULT 0,
	archived INTEGER NOT NULL DEFAULT 0,
	daily_note_date TEXT,
	last_edited_by TEXT NOT NULL DEFAULT 'user' CHECK(last_edited_by IN ('user', 'assistant')),
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_notes_collection ON knowledge_notes(collection_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_updated ON knowledge_notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_daily ON knowledge_notes(daily_note_date);
CREATE INDEX IF NOT EXISTS idx_knowledge_notes_archived ON knowledge_notes(archived);

CREATE TABLE IF NOT EXISTS knowledge_tags (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE COLLATE NOCASE,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_note_tags (
	note_id TEXT NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
	tag_id TEXT NOT NULL REFERENCES knowledge_tags(id) ON DELETE CASCADE,
	PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE IF NOT EXISTS knowledge_links (
	id TEXT PRIMARY KEY,
	source_note_id TEXT NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
	target_note_id TEXT REFERENCES knowledge_notes(id) ON DELETE SET NULL,
	target_title TEXT NOT NULL,
	link_text TEXT,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_links_source ON knowledge_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_target ON knowledge_links(target_note_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_target_title ON knowledge_links(target_title);

CREATE TABLE IF NOT EXISTS knowledge_revisions (
	id TEXT PRIMARY KEY,
	note_id TEXT NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	content TEXT NOT NULL,
	editor TEXT NOT NULL CHECK(editor IN ('user', 'assistant')),
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_revisions_note ON knowledge_revisions(note_id, created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_notes_fts USING fts5(
	note_id UNINDEXED,
	title,
	content,
	tags,
	tokenize='porter unicode61'
);
