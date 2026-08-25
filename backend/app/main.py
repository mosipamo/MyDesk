from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import notes, todos, events, drawings

app = FastAPI(title="Personal Workspace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(notes.router)
app.include_router(todos.router)
app.include_router(events.router)
app.include_router(drawings.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
