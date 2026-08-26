from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field


def now() -> datetime:
    return datetime.utcnow()


class Note(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = "Untitled"
    content: str = ""  # markdown source
    pinned: bool = False
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class Todo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    description: str = ""
    done: bool = False
    completed_at: Optional[datetime] = None
    priority: int = 3
    due_date: Optional[date] = None
    position: int = 0
    created_at: datetime = Field(default_factory=now)


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    event_date: date
    start_time: Optional[str] = None  # "HH:MM", kept as string for simplicity
    end_time: Optional[str] = None
    notes: str = ""
    all_day: bool = True


class Drawing(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = "Untitled drawing"
    # JSON-encoded list of strokes: [{color, size, points: [{x,y,p}]}]
    strokes: str = "[]"
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)
