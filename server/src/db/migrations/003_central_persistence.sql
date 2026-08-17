PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	description TEXT,
	document_ids TEXT NOT NULL DEFAULT '[]',
	source TEXT NOT NULL DEFAULT 'user' CHECK(source IN ('user', 'assistant')),
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);

CREATE TABLE IF NOT EXISTS project_tasks (
	id TEXT PRIMARY KEY,
	project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	note TEXT,
	status TEXT NOT NULL CHECK(status IN ('todo', 'doing', 'done')),
	position INTEGER NOT NULL DEFAULT 0,
	checklist TEXT NOT NULL DEFAULT '[]',
	document_ids TEXT NOT NULL DEFAULT '[]',
	reminder_id TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id, status, position);

CREATE TABLE IF NOT EXISTS memories (
	id TEXT PRIMARY KEY,
	content TEXT NOT NULL,
	category TEXT NOT NULL CHECK(category IN ('preference', 'fact', 'project', 'decision', 'other')),
	archived_from_message_count INTEGER NOT NULL DEFAULT 0,
	archived INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);

CREATE TABLE IF NOT EXISTS reminders (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	note TEXT,
	delivery_message TEXT,
	scheduled_at INTEGER NOT NULL,
	recurrence TEXT NOT NULL DEFAULT 'none' CHECK(recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
	enabled INTEGER NOT NULL DEFAULT 1,
	source TEXT NOT NULL DEFAULT 'user' CHECK(source IN ('user', 'assistant')),
	last_fired_at INTEGER,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(enabled, scheduled_at);
