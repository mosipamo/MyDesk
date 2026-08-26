from typing import Optional
from datetime import date
from sqlmodel import SQLModel, Field


class NoteCreate(SQLModel):
    title: str = "Untitled"
    content: str = ""
    pinned: bool = False


class NoteUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None
    pinned: Optional[bool] = None


class TodoCreate(SQLModel):
    text: str
    description: str = ""
    priority: int = Field(default=3, ge=1, le=5)
    due_date: Optional[date] = None
    position: int = 0


class TodoUpdate(SQLModel):
    text: Optional[str] = None
    description: Optional[str] = None
    done: Optional[bool] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    due_date: Optional[date] = None
    position: Optional[int] = None


class EventCreate(SQLModel):
    title: str
    event_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: str = ""
    all_day: bool = True


class EventUpdate(SQLModel):
    title: Optional[str] = None
    event_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None
    all_day: Optional[bool] = None


class DrawingCreate(SQLModel):
    title: str = "Untitled drawing"
    strokes: str = "[]"


class DrawingUpdate(SQLModel):
    title: Optional[str] = None
    strokes: Optional[str] = None
