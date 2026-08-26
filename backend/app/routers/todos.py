from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Todo, now
from ..schemas import TodoCreate, TodoUpdate

router = APIRouter(prefix="/api/todos", tags=["todos"])


@router.get("", response_model=List[Todo])
def list_todos(session: Session = Depends(get_session)):
    return session.exec(select(Todo).order_by(Todo.position, Todo.created_at)).all()


@router.post("", response_model=Todo)
def create_todo(payload: TodoCreate, session: Session = Depends(get_session)):
    todo = Todo(**payload.dict())
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


@router.patch("/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, payload: TodoUpdate, session: Session = Depends(get_session)):
    todo = session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(404, "Todo not found")
    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(todo, key, value)
    if "done" in data:
        # Track when work actually happened so the stats page can plot it.
        todo.completed_at = now() if todo.done else None
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo


@router.delete("/{todo_id}")
def delete_todo(todo_id: int, session: Session = Depends(get_session)):
    todo = session.get(Todo, todo_id)
    if not todo:
        raise HTTPException(404, "Todo not found")
    session.delete(todo)
    session.commit()
    return {"ok": True}
