from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.team import Team, TeamMember
from models.event import Event
from core.security import get_current_user
from pydantic import BaseModel
from uuid import UUID
from typing import Optional

router = APIRouter(prefix="/teams", tags=["teams"])

class MemberInput(BaseModel):
    user_id: Optional[UUID] = None
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    role: str = "member"

class TeamCreate(BaseModel):
    event_id: UUID
    name: str
    category: str = "adult"  # "adult" | "child"
    members: list[MemberInput] = []

class TeamMemberOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    guest_name: Optional[str]
    guest_email: Optional[str]
    role: str
    is_registered: bool

    class Config:
        from_attributes = True

class TeamOut(BaseModel):
    id: UUID
    event_id: UUID
    created_by: UUID
    name: str
    status: str
    category: str
    members: list[TeamMemberOut]

    class Config:
        from_attributes = True

@router.post("/", response_model=TeamOut)
def create_team(data: TeamCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")
    if event.status != "open":
        raise HTTPException(status_code=400, detail="Регистрация закрыта")

    existing = db.query(Team).filter(Team.event_id == data.event_id, Team.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Команда с таким названием уже зарегистрирована на это мероприятие")

    team = Team(
        event_id=data.event_id,
        created_by=user_id,
        name=data.name,
        category=data.category if data.category in ("adult", "child") else "adult",
    )
    db.add(team)
    db.flush()

    # Добавляем создателя как капитана
    captain = TeamMember(
        team_id=team.id,
        user_id=user_id,
        role="captain",
        is_registered=True,
    )
    db.add(captain)

    # Добавляем остальных участников
    for m in data.members:
        member = TeamMember(
            team_id=team.id,
            user_id=m.user_id,
            guest_name=m.guest_name,
            guest_email=m.guest_email,
            role=m.role,
            is_registered=m.user_id is not None,
        )
        db.add(member)

    db.commit()
    db.refresh(team)
    return team

@router.get("/event/{event_id}", response_model=list[TeamOut])
def list_teams(event_id: UUID, db: Session = Depends(get_db)):
    return db.query(Team).filter(Team.event_id == event_id).all()

@router.post("/{team_id}/members")
def add_member(team_id: UUID, member: MemberInput, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    if str(team.created_by) != str(user_id):
        raise HTTPException(status_code=403, detail="Только капитан может редактировать команду")
    
    new_member = TeamMember(
        team_id=team_id,
        user_id=member.user_id,
        guest_name=member.guest_name,
        guest_email=member.guest_email,
        role=member.role,
        is_registered=member.user_id is not None,
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.delete("/{team_id}/members/{member_id}")
def remove_member(team_id: UUID, member_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    if str(team.created_by) != str(user_id):
        raise HTTPException(status_code=403, detail="Только капитан может редактировать команду")
    
    member = db.query(TeamMember).filter(TeamMember.id == member_id, TeamMember.team_id == team_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Участник не найден")
    if member.role == 'captain':
        raise HTTPException(status_code=400, detail="Нельзя удалить капитана")
    
    db.delete(member)
    db.commit()
    return {"ok": True}

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None

@router.patch("/{team_id}", response_model=TeamOut)
def update_team(team_id: UUID, data: TeamUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    if str(team.created_by) != str(user_id):
        raise HTTPException(status_code=403, detail="Только капитан может редактировать команду")
    if data.name:
        team.name = data.name
    if data.category in ("adult", "child"):
        team.category = data.category
    db.commit()
    db.refresh(team)
    return team

@router.get("/{team_id}/public")
def get_team_public(team_id: UUID, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return {"id": str(team.id), "name": team.name, "event_id": str(team.event_id)}


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return team


@router.get("/{team_id}/results")
def get_team_results(team_id: UUID, db: Session = Depends(get_db)):
    from models.content import EventQuestion, TeamQuestionResult
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")

    results = (
        db.query(TeamQuestionResult)
        .join(EventQuestion)
        .filter(TeamQuestionResult.team_id == team_id)
        .all()
    )

    # Группируем по КП: задание (number < 100) и задача (number >= 100)
    kp_map: dict = {}
    for r in results:
        q = r.question
        if q.number < 100:
            kp_num = q.number
            key = 'zadanie'
        else:
            kp_num = q.number - 100
            key = 'zadacha'

        if kp_num not in kp_map:
            kp_map[kp_num] = {}
        kp_map[kp_num][key] = {
            'text': q.text,
            'correct_answer': q.correct_answer,
            'team_answer': r.team_answer,
            'points_earned': r.points_earned,
        }

    return [
        {'kp_number': kp_num, **data}
        for kp_num, data in sorted(kp_map.items())
    ]