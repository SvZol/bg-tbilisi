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
    captain_name: Optional[str] = None
    captain_phone: Optional[str] = None
    member_count: Optional[int] = None
    description: Optional[str] = None
    members: list[MemberInput] = []

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

def _team_to_dict(team: Team, db: Session) -> dict:
    from models.user import User
    members = []
    for m in team.members:
        full_name = None
        if m.user_id:
            u = db.query(User).filter(User.id == m.user_id).first()
            if u:
                full_name = u.full_name
        members.append({
            "id": str(m.id),
            "user_id": str(m.user_id) if m.user_id else None,
            "guest_name": m.guest_name,
            "guest_email": m.guest_email,
            "full_name": full_name,
            "role": m.role,
            "is_registered": m.is_registered,
        })
    return {
        "id": str(team.id),
        "event_id": str(team.event_id),
        "created_by": str(team.created_by),
        "name": team.name,
        "status": team.status,
        "category": team.category or "adult",
        "captain_name": team.captain_name,
        "captain_phone": team.captain_phone,
        "member_count": team.member_count,
        "description": team.description,
        "members": members,
    }

@router.post("/")
def create_team(data: TeamCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    from models.user import User
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
            role=m.role,
            is_registered=m.user_id is not None,
        )
        db.add(member)

    db.commit()
    db.refresh(team)
    return _team_to_dict(team, db)

@router.get("/event/{event_id}")
def list_teams(event_id: UUID, db: Session = Depends(get_db)):
    teams = db.query(Team).filter(Team.event_id == event_id).all()
    return [_team_to_dict(t, db) for t in teams]

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
    captain_name: Optional[str] = None
    captain_phone: Optional[str] = None
    member_count: Optional[int] = None
    description: Optional[str] = None

@router.patch("/{team_id}")
def update_team(team_id: UUID, data: TeamUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    is_captain = str(team.created_by) == str(user_id) or db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id,
        TeamMember.role == "captain"
    ).first() is not None
    if not is_captain:
        raise HTTPException(status_code=403, detail="Только капитан может редактировать команду")
    if data.name:
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
    invite_code: str

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
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return {"id": str(team.id), "name": team.name, "event_id": str(team.event_id)}


@router.get("/{team_id}")
def get_team(team_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
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
