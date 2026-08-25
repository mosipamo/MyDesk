from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Event
from ..schemas import EventCreate, EventUpdate

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[Event])
def list_events(
    start: Optional[date] = None,
    end: Optional[date] = None,
    session: Session = Depends(get_session),
):
    query = select(Event)
    if start:
        query = query.where(Event.event_date >= start)
    if end:
        query = query.where(Event.event_date <= end)
    return session.exec(query.order_by(Event.event_date)).all()


@router.post("", response_model=Event)
def create_event(payload: EventCreate, session: Session = Depends(get_session)):
    event = Event(**payload.dict())
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.patch("/{event_id}", response_model=Event)
def update_event(event_id: int, payload: EventUpdate, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(event, key, value)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    session.delete(event)
    session.commit()
    return {"ok": True}
