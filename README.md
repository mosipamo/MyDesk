# Personal Workspace

A minimal Notion-style app for yourself: pen/pressure drawing canvas, todo list,
markdown notes, and a calendar. FastAPI backend (SQLite, one file, zero config),
React + Vite frontend.

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

- **Canvas** (`/`) — pen/stylus drawing with pressure-sensitive stroke width (falls back to mouse/touch), save/reload named drawings.
- **Todos** (`/todos`) — titles, descriptions, and priority 1–5; stats row, All/Active/Done filter, search, sorting by priority or title, inline edit with complete/delete, optional due dates.
- **Notes** (`/notes`) — markdown editor with live preview (autosaves as you type).
- **Calendar** (`/calendar`) — month grid of events plus todo titles on their due dates; click a day to view/add events and check off tasks due then.
- **Quick find** (`Ctrl+K` anywhere) — command palette that searches pages, notes, todos, and events; jump straight to a note or the calendar date it belongs to.

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
    pages/           CanvasPage, TodosPage, NotesPage, CalendarPage
    components/       Sidebar
    api.js            fetch wrapper for the backend
    index.css          design tokens + layout
```

## Extending it

- **Multi-device sync**: swap SQLite for Postgres (change `DATABASE_URL` in `database.py`) and deploy the backend somewhere reachable; the frontend only talks to `/api`, so nothing else changes.
- **Auth**: everything is currently single-user/open. Add a login and scope queries by user before exposing this beyond localhost.
- **Drawing thumbnails**: the `Drawing.strokes` field stores raw stroke JSON; you could render a small PNG snapshot on save for nicer list previews.
- **Rich text in notes**: markdown is stored as plain text in `Note.content`, so it's easy to pipe into other tools or export.
