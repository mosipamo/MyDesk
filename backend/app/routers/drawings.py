from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Drawing
from ..schemas import DrawingCreate, DrawingUpdate

router = APIRouter(prefix="/api/drawings", tags=["drawings"])


@router.get("", response_model=List[Drawing])
def list_drawings(session: Session = Depends(get_session)):
    return session.exec(select(Drawing).order_by(Drawing.updated_at.desc())).all()


@router.post("", response_model=Drawing)
def create_drawing(payload: DrawingCreate, session: Session = Depends(get_session)):
    drawing = Drawing(**payload.dict())
    session.add(drawing)
    session.commit()
    session.refresh(drawing)
    return drawing


@router.get("/{drawing_id}", response_model=Drawing)
def get_drawing(drawing_id: int, session: Session = Depends(get_session)):
    drawing = session.get(Drawing, drawing_id)
    if not drawing:
        raise HTTPException(404, "Drawing not found")
    return drawing


@router.patch("/{drawing_id}", response_model=Drawing)
def update_drawing(drawing_id: int, payload: DrawingUpdate, session: Session = Depends(get_session)):
    drawing = session.get(Drawing, drawing_id)
    if not drawing:
        raise HTTPException(404, "Drawing not found")
    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(drawing, key, value)
    drawing.updated_at = datetime.utcnow()
    session.add(drawing)
    session.commit()
    session.refresh(drawing)
    return drawing


@router.delete("/{drawing_id}")
def delete_drawing(drawing_id: int, session: Session = Depends(get_session)):
    drawing = session.get(Drawing, drawing_id)
    if not drawing:
        raise HTTPException(404, "Drawing not found")
    session.delete(drawing)
    session.commit()
    return {"ok": True}
