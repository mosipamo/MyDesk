from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Note
from ..schemas import NoteCreate, NoteUpdate

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=List[Note])
def list_notes(session: Session = Depends(get_session)):
    return session.exec(
        select(Note).order_by(Note.pinned.desc(), Note.updated_at.desc())
    ).all()


@router.post("", response_model=Note)
def create_note(payload: NoteCreate, session: Session = Depends(get_session)):
    note = Note(**payload.dict())
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.get("/{note_id}", response_model=Note)
def get_note(note_id: int, session: Session = Depends(get_session)):
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    return note


@router.patch("/{note_id}", response_model=Note)
def update_note(note_id: int, payload: NoteUpdate, session: Session = Depends(get_session)):
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(note, key, value)
    note.updated_at = datetime.utcnow()
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(note_id: int, session: Session = Depends(get_session)):
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    session.delete(note)
    session.commit()
    return {"ok": True}
