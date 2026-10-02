from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.team import Team, TeamMember
from models.event import Event
from core.security import get_current_user
from models.user import User
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional

router = APIRouter(prefix="/teams", tags=["teams"])

MAX_MEMBERS = 30


class MemberInput(BaseModel):
    user_id: Optional[UUID] = None
    guest_name: Optional[str] = Field(default=None, max_length=100)
    guest_email: Optional[EmailStr] = None
    role: str = "member"  # капитан назначается только при создании команды

class TeamCreate(BaseModel):
    event_id: UUID
    name: str = Field(min_length=1, max_length=100)
    category: str = "adult"  # "adult" | "child"
    captain_name: Optional[str] = Field(default=None, max_length=100)
    captain_phone: Optional[str] = Field(default=None, max_length=30)
    member_count: Optional[int] = Field(default=None, ge=1, le=MAX_MEMBERS)
    description: Optional[str] = Field(default=None, max_length=2000)
    members: list[MemberInput] = Field(default=[], max_length=MAX_MEMBERS)

class TeamMemberOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    guest_name: Optional[str]
    guest_email: Optional[str]
    full_name: Optional[str] = None
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
    captain_name: Optional[str] = None
    captain_phone: Optional[str] = None
    member_count: Optional[int] = None
    description: Optional[str] = None
    members: list[TeamMemberOut]

    class Config:
        from_attributes = True

def _team_to_dict(team: Team, db: Session, private: bool = True) -> dict:
    """private=False — публичный вид: без email гостей и телефона капитана."""
    user_ids = [m.user_id for m in team.members if m.user_id]
    names = {}
    if user_ids:
        names = {u.id: u.full_name for u in db.query(User.id, User.full_name).filter(User.id.in_(user_ids))}
    members = [{
        "id": str(m.id),
        "user_id": str(m.user_id) if m.user_id else None,
        "guest_name": m.guest_name,
        "guest_email": m.guest_email if private else None,
        "full_name": names.get(m.user_id),
        "role": m.role,
        "is_registered": m.is_registered,
    } for m in team.members]
    return {
        "id": str(team.id),
        "event_id": str(team.event_id),
        "created_by": str(team.created_by),
        "name": team.name,
        "status": team.status,
        "category": team.category or "adult",
        "captain_name": team.captain_name,
        "captain_phone": team.captain_phone if private else None,
        "member_count": team.member_count,
        "description": team.description,
        "members": members,
    }


def _get_team_or_404(team_id: UUID, db: Session) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return team


def _is_captain(team: Team, user_id: str, db: Session) -> bool:
    return str(team.created_by) == str(user_id) or db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.user_id == user_id,
        TeamMember.role == "captain",
    ).first() is not None


def _require_captain(team_id: UUID, user_id: str, db: Session) -> Team:
    team = _get_team_or_404(team_id, db)
    if not _is_captain(team, user_id, db):
        raise HTTPException(status_code=403, detail="Только капитан может редактировать команду")
    return team


def _check_user_exists(user_id: Optional[UUID], db: Session) -> None:
    if user_id and not db.query(User.id).filter(User.id == user_id).first():
        raise HTTPException(status_code=400, detail="Пользователь не найден")


@router.post("/")
def create_team(data: TeamCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено")
    if event.status != "open":
        raise HTTPException(status_code=400, detail="Регистрация закрыта")

    # Валидация: детский зачёт требует 2+ участников
    cat = data.category if data.category in ("adult", "child") else "adult"
    total_members = 1 + len([m for m in data.members if m.guest_name])  # капитан + гости
    member_count = data.member_count or total_members
    if cat == "child" and member_count < 2:
        raise HTTPException(status_code=400,
            detail="Добавьте участников в команду или отметьте её как Лосей (взрослый зачёт)")

    for m in data.members:
        _check_user_exists(m.user_id, db)

    existing = db.query(Team).filter(Team.event_id == data.event_id, Team.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Команда с таким названием уже зарегистрирована на это мероприятие")

    # Имя капитана по умолчанию — full_name владельца
    captain_name = data.captain_name
    if not captain_name:
        owner = db.query(User).filter(User.id == user_id).first()
        if owner:
            captain_name = owner.full_name

    team = Team(
        event_id=data.event_id,
        created_by=user_id,
        name=data.name,
        category=cat,
        captain_name=captain_name,
        captain_phone=data.captain_phone,
        member_count=member_count,
        description=data.description,
    )
    db.add(team)
    db.flush()

    captain = TeamMember(
        team_id=team.id,
        user_id=user_id,
        role="captain",
        is_registered=True,
    )
    db.add(captain)

    for m in data.members:
        member = TeamMember(
            team_id=team.id,
            user_id=m.user_id,
            guest_name=m.guest_name,
            guest_email=m.guest_email,
            role="member",
            is_registered=m.user_id is not None,
        )
        db.add(member)

    db.commit()
    db.refresh(team)
    return _team_to_dict(team, db)

@router.get("/event/{event_id}")
def list_teams(event_id: UUID, db: Session = Depends(get_db)):
    teams = db.query(Team).filter(Team.event_id == event_id).all()
    return [_team_to_dict(t, db, private=False) for t in teams]

@router.post("/{team_id}/members")
def add_member(team_id: UUID, member: MemberInput, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = _require_captain(team_id, user_id, db)
    _check_user_exists(member.user_id, db)
    if not member.user_id and not member.guest_name:
        raise HTTPException(status_code=400, detail="Укажите имя участника")
    if db.query(TeamMember).filter(TeamMember.team_id == team.id).count() >= MAX_MEMBERS:
        raise HTTPException(status_code=400, detail="Слишком много участников в команде")

    new_member = TeamMember(
        team_id=team_id,
        user_id=member.user_id,
        guest_name=member.guest_name,
        guest_email=member.guest_email,
        role="member",
        is_registered=member.user_id is not None,
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.delete("/{team_id}/members/{member_id}")
def remove_member(team_id: UUID, member_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = _require_captain(team_id, user_id, db)

    member = db.query(TeamMember).filter(TeamMember.id == member_id, TeamMember.team_id == team_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Участник не найден")
    if member.role == 'captain':
        raise HTTPException(status_code=400, detail="Нельзя удалить капитана")

    db.delete(member)
    db.flush()
    # Если остался 1 участник — автоматически переключаем на взрослый зачёт
    remaining = db.query(TeamMember).filter(TeamMember.team_id == team_id).count()
    if remaining < 2 and team.category == "child":
        team.category = "adult"
    db.commit()
    return {"ok": True}

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    category: Optional[str] = None
    captain_name: Optional[str] = Field(default=None, max_length=100)
    captain_phone: Optional[str] = Field(default=None, max_length=30)
    member_count: Optional[int] = Field(default=None, ge=1, le=MAX_MEMBERS)
    description: Optional[str] = Field(default=None, max_length=2000)

@router.patch("/{team_id}")
def update_team(team_id: UUID, data: TeamUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = _require_captain(team_id, user_id, db)
    if data.name and data.name != team.name:
        if db.query(Team).filter(Team.event_id == team.event_id, Team.name == data.name).first():
            raise HTTPException(status_code=400, detail="Команда с таким названием уже зарегистрирована на это мероприятие")
        team.name = data.name
    if data.category in ("adult", "child"):
        if data.category == "child":
            member_count = db.query(TeamMember).filter(TeamMember.team_id == team_id).count()
            if member_count < 2:
                raise HTTPException(status_code=400, detail="Для детского зачёта (Лосята) нужно минимум 2 участника")
        team.category = data.category
    if data.captain_name is not None:
        team.captain_name = data.captain_name
    if data.captain_phone is not None:
        team.captain_phone = data.captain_phone
    if data.member_count is not None:
        team.member_count = data.member_count
    if data.description is not None:
        team.description = data.description
    db.commit()
    db.refresh(team)
    return _team_to_dict(team, db)

@router.get("/by-invite/{code}")
def get_team_by_invite(code: str, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.invite_code == code).first()
    if not team:
        raise HTTPException(status_code=404, detail="Код не найден или уже использован")
    return {
        "id": str(team.id),
        "name": team.name,
        "event_id": str(team.event_id),
        "category": team.category,
        "captain_name": team.captain_name,
    }


class ClaimInput(BaseModel):
    invite_code: str = Field(min_length=1, max_length=12)

@router.post("/claim")
def claim_team(data: ClaimInput, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = db.query(Team).filter(Team.invite_code == data.invite_code).first()
    if not team:
        raise HTTPException(status_code=404, detail="Код не найден или уже использован")

    # Проверяем что у команды ещё нет зарегистрированного владельца
    existing_captain = db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.role == "captain",
        TeamMember.is_registered == True,
        TeamMember.user_id != None,
    ).first()
    if existing_captain:
        raise HTTPException(status_code=400, detail="У команды уже есть владелец")

    # Обновляем или создаём капитана
    captain_member = db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.role == "captain",
    ).first()
    if captain_member:
        captain_member.user_id = user_id
        captain_member.is_registered = True
        captain_member.guest_name = None
    else:
        db.add(TeamMember(team_id=team.id, user_id=user_id, role="captain", is_registered=True))

    team.created_by = user_id
    team.invite_code = None  # код одноразовый
    db.commit()
    db.refresh(team)
    return _team_to_dict(team, db)


@router.get("/{team_id}/public")
def get_team_public(team_id: UUID, db: Session = Depends(get_db)):
    team = _get_team_or_404(team_id, db)
    return {"id": str(team.id), "name": team.name, "event_id": str(team.event_id)}


@router.get("/{team_id}")
def get_team(team_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    """Полные данные (email, телефон) — только участникам команды и админу."""
    team = _get_team_or_404(team_id, db)
    is_member = db.query(TeamMember.id).filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id).first()
    if not (is_member or _is_captain(team, user_id, db)):
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.role != "admin":
            raise HTTPException(status_code=403, detail="Нет доступа к этой команде")
    return _team_to_dict(team, db)


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
        .filter(EventQuestion.is_published == True)
        .all()
    )

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
            kp_map[kp_num] = {'kp_type': q.kp_type}
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
