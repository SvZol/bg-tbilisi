from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.event import Event
from core.security import get_current_user
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter(prefix="/events", tags=["events"])

class EventCreate(BaseModel):
    title: str
    description: str | None = None
    starts_at: datetime
    ends_at: datetime
    reg_deadline: datetime
    min_team_size: int = 1
    max_team_size: int = 10

class EventOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    city: str | None = None
    starts_at: datetime
    ends_at: datetime
    reg_deadline: datetime
    min_team_size: int
    max_team_size: int
    status: str

    class Config:
        from_attributes = True

@router.post("/", response_model=EventOut)
def create_event(data: EventCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    event = Event(**data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("/", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).filter(Event.status.in_(["open", "closed", "finished"])).order_by(Event.starts_at.desc()).all()

@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: UUID, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")
    return event