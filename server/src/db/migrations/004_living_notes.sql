ALTER TABLE knowledge_notes ADD COLUMN living_note_mode TEXT NOT NULL DEFAULT 'off'
	CHECK(living_note_mode IN ('off', 'suggest', 'automatic'));
ALTER TABLE knowledge_notes ADD COLUMN living_note_last_consolidated_at INTEGER;
ALTER TABLE knowledge_notes ADD COLUMN living_note_pending_content TEXT;
ALTER TABLE knowledge_notes ADD COLUMN living_note_pending_summary TEXT;
