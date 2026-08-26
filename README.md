# MyDesk

A personal workspace in the spirit of Notion and Obsidian: a dashboard that
greets you, pressure-sensitive drawing canvas, todo list, live-preview
markdown notes, and a calendar. FastAPI backend (SQLite, one file, zero
config), React + Vite frontend.

## Run it

**Backend** (from `backend/`):
```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
This creates `backend/workspace.db` (SQLite) on first run — that's your entire database, one file, easy to back up or move.

**Frontend** (from `frontend/`, in a second terminal):
```bash
npm install
npm run dev
```
Open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend on port 8000 (see `vite.config.js`), so both need to be running.

## What's here

- **Home** (`/`) — dashboard with a greeting, due-today & overdue tasks you can check off inline, this week's events, recent notes, and drawing thumbnails.
- **Canvas** (`/canvas`) — pen/stylus drawing with pressure-sensitive stroke width (mouse/touch fallback), live thumbnails of saved drawings, `Ctrl+S` save, `Ctrl+Z` undo.
- **Todos** (`/todos`) — titles, descriptions, priorities 1–5; progress ring, animated checkboxes, All/Active/Done filters, search, sorting, optional due dates.
- **Notes** (`/notes`) — Obsidian-style **live preview**: type markdown and it renders instantly on the page; syntax characters reveal themselves only on the line you're editing (`Ctrl+E` toggles raw source). Notes autosave as you type and can be pinned to the top.
- **Calendar** (`/calendar`) — month grid with slide transitions; events plus todo titles on their due dates; click a day to add events or check off tasks.
- **Quick find** (`Ctrl+K` anywhere) — command palette searching pages, notes, todos, and events.

## Project layout

```
backend/
  app/
    main.py        FastAPI app + CORS + router registration
    database.py     SQLite engine/session (SQLModel) + idempotent startup column migration
    models.py       Note, Todo, Event, Drawing table models
    schemas.py       Create/Update request bodies
    routers/         one CRUD router per resource
frontend/
  src/
    pages/           DashboardPage, CanvasPage, TodosPage, NotesPage, CalendarPage
    components/      Sidebar, CommandPalette, LiveMarkdown (live preview engine),
                     DrawingThumb, EmptyState, ProgressRing, ThemeToggle, Logo,
                     ErrorBoundary
    api.js            fetch wrapper for the backend
    index.css          design tokens (light/dark themes) + animation library
```

## Extending it

- **Multi-device sync**: swap SQLite for Postgres (change `DATABASE_URL` in `database.py`) and deploy the backend somewhere reachable; the frontend only talks to `/api`, so nothing else changes.
- **Auth**: everything is currently single-user/open. Add a login and scope queries by user before exposing this beyond localhost.
- **Drawing export**: `Drawing.strokes` stores raw stroke JSON; render it to PNG/SVG server-side for sharing.
- **Backlinks between notes**: notes are plain markdown, so an `[[wiki-link]]` pass over `Note.content` is all it takes.
