"""Подсчёт очков команд: баллы за КП и задачи плюс штраф (штраф хранится отрицательным числом)."""
from sqlalchemy.orm import Session

from models.content import EventQuestion, TeamQuestionResult
from models.team import Team

TASK_NUMBER_OFFSET = 100  # номер вопроса >= 100 — это «задача» к КП (number - 100)


def team_scores(db: Session, event_id) -> dict[str, dict]:
    """{team_id: {"kp", "tasks", "penalty", "total"}} для всех команд мероприятия."""
    scores = {
        str(t.id): {"kp": 0, "tasks": 0, "penalty": t.penalty or 0}
        for t in db.query(Team).filter(Team.event_id == event_id).all()
    }
    rows = (
        db.query(TeamQuestionResult.team_id, EventQuestion.number, TeamQuestionResult.points_earned)
        .join(EventQuestion, TeamQuestionResult.question_id == EventQuestion.id)
        .filter(EventQuestion.event_id == event_id)
        .all()
    )
    for team_id, number, points in rows:
        entry = scores.get(str(team_id))
        if entry is None:
            continue
        entry["tasks" if number >= TASK_NUMBER_OFFSET else "kp"] += points or 0
    for entry in scores.values():
        entry["total"] = entry["kp"] + entry["tasks"] + entry["penalty"]
    return scores


def rank_teams(teams: list, scores: dict[str, dict]) -> dict[str, int]:
    """Место внутри зачёта: больше очков — выше, при равенстве — больше баллов за КП."""
    ordered = sorted(teams, key=lambda t: (-scores[str(t.id)]["total"], -scores[str(t.id)]["kp"]))
    return {str(t.id): i + 1 for i, t in enumerate(ordered)}
