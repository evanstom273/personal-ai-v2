# Personal AI — Application Reference

This document describes how the **Personal AI** app works. It is injected into the assistant's system context on every chat message so the AI understands its own architecture, capabilities, and constraints.

**Repository:** `evanstom273/personal-ai`  
**Live site:** GitHub Pages PWA  
**Stack:** React 19 + TypeScript + Vite + Tailwind CSS 4 + IndexedDB (`idb`) + Google Gemini API

---

## 1. What this app is

Personal AI is a self-hosted progressive web app (PWA) with an optional **Capacitor Android** build. It provides:

- A **continuous Gemini chat** with streaming, tool use, and optional Google Search grounding
- **Image** and **music** generation via separate Gemini models (routed automatically from natural language)
- A **document library** with rich-text editing and inline AI writing assistance
- **Kanban projects** (todo / doing / done) with task cards, checklists, and document/reminder links
- **Scheduled reminders** that post chat messages and can trigger system notifications
- **Long-term memory** archived from chat batches
- **Speech-to-text** input and **Gemini TTS** read-aloud for replies
- **Import/export** of chat and documents

All user data lives **locally in the browser** (IndexedDB). The Gemini API key is stored in preferences on-device and sent directly to Google from the client.

---

## 2. Navigation and pages

The app uses React Router with a bottom navigation dock (Home, Chat, Library, Settings).

| Route | Page | Purpose |
|-------|------|---------|
| `/home` | HomePage | Dashboard / entry |
| `/chat` | ChatPage | Main continuous conversation |
| `/library` | LibraryPage | Schedule, Projects, Documents tabs |
| `/library/projects/:projectId` | ProjectBoardPage | Kanban board for one project |
| `/library/documents/:documentId` | DocumentEditorPage | Rich-text document editor |
| `/memory` | MemoryPage | Browse archived memory facts |
| `/settings` | SettingsPage | Profile, Memory, API, Voice, App tabs |

**Mobile UX:** Swipe left/right navigates between main tabs and settings sub-tabs with a short fade transition. Swipe is disabled on project boards and document editors.

**App shell:** `src/layout/AppShell.tsx` — header (hidden on document/project editors), main content outlet, bottom nav.

---

## 3. Data storage (IndexedDB)

Database name: `gemini-chat` (version 6). Generic API in `src/storage/storageService.ts`.

| Store | Type | Description |
|-------|------|-------------|
| `preferences` | `UserPreferences` | API key, model IDs, user/AI names, behaviour, TTS, memory interval |
| `conversations` | `ConversationRecord` | Single continuous chat thread |
| `documents` | `DocumentRecord` | Markdown or HTML documents |
| `projects` | `ProjectRecord` | Kanban projects with embedded tasks |
| `reminders` | `ReminderRecord` | Scheduled reminders with recurrence |
| `memories` | `MemoryEntry` | Facts archived from chat |
| `libraryMedia` | `LibraryMediaRecord` | Generated/uploaded images and audio |
| `cache` | misc | Internal cache |

### UserPreferences fields

- `geminiApiKey` — Google AI API key
- `defaultModelId` — chat model (e.g. `gemini-3.6-flash`)
- `defaultImageModelId` — image generation model
- `defaultMusicModelId` — music generation model
- `userName`, `aiName`, `aiBehaviorInstructions` — identity and custom instructions
- `allowMatureContent` — relaxes safety filters when true
- `memoryArchiveInterval` — messages between memory archive passes (5/10/15/20)
- `ttsReadAloudMode` — never / after_speech / always
- `ttsVoiceName` — Gemini TTS voice
- `allowCodebaseInspection` — whether read-only source code tools are available

---

## 4. AI system architecture

### 4.1 System instruction assembly

Every chat request builds a full system instruction in `src/services/gemini/documentContext.ts` → `buildFullSystemInstruction()`:

1. **Base instruction** (`systemInstruction.ts`) — AI name, user name, datetime, behaviour, mature content policy, app capability rules
2. **App reference** (`appReferenceContext.ts`) — this document (always injected)
3. **Memory context** (`memoryContext.ts`) — archived facts (up to ~48k chars)
4. **Schedule context** (`scheduleContext.ts`) — active reminders (up to 40)
5. **Project context** (`projectContext.ts`) — all kanban projects and tasks
6. **Document library context** (`documentContext.ts`) — all documents (12k each, 120k total cap)

Document inline AI (`documentWriting.ts`) uses only the base system instruction plus the current document slice.

### 4.2 Chat generation flow

`useChatGeneration` → `generateChatWithTools` (`chatWithTools.ts`):

1. Resolve intent (`intent.ts`) — chat vs image vs music from natural language
2. For chat: stream Gemini with tools, up to 8 tool-loop iterations
3. Messages include timestamps via `formatMessageForModel`
4. Optional Google Search grounding when web search is enabled
5. Background generation continues if user leaves chat; notification on completion

### 4.3 Available Gemini models

Defined in `src/services/gemini/models.ts`:

- **Chat:** gemini-3.6-flash, gemini-3.1-pro-preview
- **Image:** gemini-3-pro-image, gemini-3.1-flash-image, gemini-3.1-flash-lite-image
- **Music:** lyria-3-pro-preview, lyria-3-clip-preview
- **TTS:** gemini-3.1-flash-tts-preview (via synthesizeSpeech.ts)

### 4.4 Function-calling tools

**Document tools** (`documentTools.ts`):
- `list_documents`, `read_document`, `create_document`, `update_document`, `rename_document`, `delete_document` (delete requires UI confirmation)

**Project tools** (`projectTools.ts`):
- `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`
- `create_task`, `update_task`, `move_task`, `delete_task`

**Reminder tools** (`reminderTools.ts`):
- `list_reminders`, `create_reminder`, `update_reminder`, `delete_reminder`

**Codebase tools** (`codebaseTools.ts`) — read-only, when enabled in settings:
- `list_source_files` — list bundled source paths
- `read_source_file` — read a source file by path
- `search_source_code` — search text/regex across source

**Server-side:** Google Search when web search toggle is on in chat.

---

## 5. Documents

### Storage

`DocumentRecord`: id, title, content, `contentFormat` (markdown | html), `source` (user | assistant | upload), `readOnly`, timestamps.

### Editor

TipTap rich-text editor (`DocumentEditor.tsx`) with:
- Formatting: bold, italic, headings 1–4, lists, quotes, links, colours, highlight, alignment, horizontal rule
- Toolbar at **bottom** of editor (above nav dock) for mobile selection-bar compatibility
- **Inline AI writing:** Expand, Rewrite, Shorten, Make clearer, Continue writing, Ask AI — preview before accept
- Autosave every 800ms silently in background

### Content pipeline

`documentContent.ts` converts HTML ↔ Markdown for storage. User documents are shared between the user and the assistant — no separate AI document store.

---

## 6. Projects (Kanban)

`ProjectRecord` contains title, description, linked document IDs, and `tasks[]`.

Each `ProjectTaskRecord` has: title, note, status (todo | doing | done), position, checklist items, linked document IDs, optional reminder ID.

**Board UX** (`ProjectBoardPage.tsx`):
- Vertical collapsible columns
- Drag-and-drop between columns (`@dnd-kit`)
- Inline checklist toggles on cards
- Task editor dialog with auto-save (350ms debounce, silent, optimistic local updates)

---

## 7. Reminders

`ReminderRecord`: title, note, delivery message, scheduledAt, recurrence (none/daily/weekly/monthly/yearly), enabled, source.

**Delivery** (`reminderDelivery.ts`, `reminderScheduler.ts`):
- When due: posts assistant chat message, may show notification
- One-shot reminders are **deleted** after firing
- Capacitor Android: `LocalNotifications` for background alerts
- PWA: notification triggers where supported

---

## 8. Memory

After every N new chat messages (`memoryArchiveInterval`), `memoryArchive.ts` sends a batch to Gemini to extract durable facts into `memories` store.

Categories: preference, fact, project, decision, other.

Memory index is injected on every chat message. Older chat messages are not all in the prompt — only recent window + memory index.

---

## 9. Library media

Generated images and music from chat are saved to `libraryMedia` store as data URLs.

Library page tabs: Docs, Images, Music. Upload support for documents and media.

---

## 10. Chat features

- **Single continuous conversation** — no per-thread model; one `ConversationRecord`
- **Streaming** assistant replies with markdown rendering
- **Edit & resend** messages (truncates subsequent messages)
- **Attachments:** images, audio, PDF text extraction
- **Document mentions** in chat input (`@document`)
- **Export:** ZIP with separate media files
- **Web search** toggle for Google Search grounding
- **PWA auto-update:** service worker skips waiting and reloads on new deploy

---

## 11. Settings

| Tab | Contents |
|-----|----------|
| Profile | User name, AI name, behaviour instructions, mature content toggle |
| Memory | Archive interval slider, link to Memory page |
| API | Gemini API key, validation, model catalog, web search info |
| Voice | STT notes, TTS read-aloud mode, voice picker |
| App | Notifications, reminders behaviour, background replies, **app reference download**, codebase inspection toggle |

---

## 12. PWA and Android

- **Vite PWA plugin** with Workbox — precaches assets, `skipWaiting` + `clientsClaim`
- **Capacitor 8** Android project in `/android` for native APK builds
- **Safe areas** respected for notched devices and bottom nav inset
- Deployed to GitHub Pages (`/personal-ai/` base path)

---

## 13. Key source files

```
src/
  App.tsx                    — routes
  main.tsx                   — entry, PWA registration
  layout/AppShell.tsx        — shell, header, bottom nav
  layout/BottomNav.tsx       — navigation dock
  pages/                     — route pages
  components/                — UI components
    chat/                    — chat input, messages, markdown
    documents/               — editor, AI preview dialogs
    projects/                — project list
    schedule/                — reminders UI
  providers/ChatProvider.tsx — wires preferences, chat, TTS, reminders
  hooks/                     — React hooks for data and features
  services/
    gemini/                  — API client, chat, tools, context builders
    documents/               — document CRUD
    projects/                — project CRUD + tools
    reminders/               — reminder CRUD, scheduler, notifications
    memory/                  — archive + memory service
    library/                 — media persistence
  storage/                   — IndexedDB types, db, storageService
  utils/                     — helpers (downloads, export, speech, etc.)
  data/
    appReference.md          — this document
    sourceCodeIndex.generated.ts — bundled source for inspection tools
```

---

## 14. Constraints the AI must respect

1. **Video generation is not supported** — offer image or music instead
2. **One continuous chat** — no separate conversation threads
3. **Documents are shared** — no private AI-only document store
4. **Delete document requires UI confirmation** — tool returns `confirmation_required`
5. **All data is local** — cannot access server-side user data beyond what's in IndexedDB context
6. **Codebase inspection is read-only** — use codebase tools only when the user asks about how the app works internally; never imply you can modify source code
7. **API key is user-provided** — stored locally, not in this document

---

## 15. Context limits

When data is too large for the prompt, sections are truncated with a notice. Use tools to fetch full content:

- `read_document` for full document text
- `get_project` for full project/task detail
- `read_source_file` / `search_source_code` for implementation details

---

*This reference is bundled with the app and updated on each deploy. The user can download a copy from Settings → App.*
