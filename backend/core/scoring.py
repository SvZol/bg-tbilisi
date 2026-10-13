"""Подсчёт очков и мест команд: баллы за КП и задачи плюс штраф (штраф хранится отрицательным числом)."""
import re
from datetime import datetime, time, timedelta

from sqlalchemy.orm import Session

from models.content import EventQuestion, TeamQuestionResult
from models.team import Team

TASK_NUMBER_OFFSET = 100  # номер вопроса >= 100 — это «задача» к КП (number - 100)


def team_scores(db: Session, event_id) -> dict[str, dict]:
    """{team_id: {"kp", "tasks", "penalty", "total", "finish_time"}} для всех команд мероприятия."""
    scores = {
        str(t.id): {"kp": 0, "tasks": 0, "penalty": t.penalty or 0, "finish_time": t.finish_time}
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


def parse_finish_time(value) -> str | None:
    """Время финиша из ячейки Excel (время, дата-время, доля суток или текст) -> «ЧЧ:ММ:СС» либо None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        value = value.time()
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    if isinstance(value, timedelta):
        seconds = int(value.total_seconds())
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        if not 0 <= value < 1:
            return None
        seconds = round(value * 86400)
    else:
        m = re.fullmatch(r"\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*", str(value))
        if not m:
            return None
        h, mi, se = int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)
        if mi > 59 or se > 59:
            return None
        seconds = h * 3600 + mi * 60 + se
    return f"{seconds // 3600 % 24:02d}:{seconds // 60 % 60:02d}:{seconds % 60:02d}"


def _seconds(finish_time: str | None) -> float:
    if not finish_time:
        return float("inf")  # времени нет — при равных баллах такая команда не обгоняет тех, у кого оно есть
    h, m, s = (int(x) for x in finish_time.split(":"))
    return h * 3600 + m * 60 + s


def rank_teams(teams: list, scores: dict[str, dict]) -> dict[str, int]:
    """Место в зачёте: больше очков — выше, при равенстве раньше финиш.

    Команды с равными очками и временем делят место (1, 2, 2, 2, 5).
    """
    def key(t):
        sc = scores[str(t.id)]
        return (-sc["total"], _seconds(sc["finish_time"]))

    keys = {str(t.id): key(t) for t in teams}
    return {tid: 1 + sum(1 for other in keys.values() if other < k) for tid, k in keys.items()}
