"""Регистрация закрывается сама, когда проходит дедлайн."""
from datetime import datetime, timedelta, timezone

# Даты мероприятий вводятся по времени Тбилиси (UTC+4, без перехода на летнее время)
TBILISI = timezone(timedelta(hours=4))


def now_tbilisi() -> datetime:
    return datetime.now(TBILISI).replace(tzinfo=None)


def deadline_passed(event) -> bool:
    return bool(event.reg_deadline) and event.reg_deadline.replace(tzinfo=None) < now_tbilisi()


def effective_status(event) -> str:
    """Статус для публики: «открыта» после дедлайна показывается как «закрыта»."""
    if event.status == "open" and deadline_passed(event):
        return "closed"
    return event.status
