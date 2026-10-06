import logging
import smtplib
import ssl
import os
from html import escape
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "ТБИссектриса")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

log = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str):
    if not SMTP_USER or not SMTP_PASS:
        log.warning("SMTP не настроен, письмо не отправлено: to=%s subject=%s", to, subject)
        return

    if any(c in to for c in "\r\n"):
        raise ValueError("Некорректный адрес получателя")
    subject = " ".join(subject.split())
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if SMTP_PORT == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as smtp:
                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.sendmail(FROM_EMAIL, to, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.sendmail(FROM_EMAIL, to, msg.as_string())
        log.info("Письмо отправлено: %s", to)
    except Exception as e:
        log.error("Ошибка отправки письма: %s: %s", type(e).__name__, e)
        raise


def send_verification_email(to: str, token: str):
    link = f"{FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#1c1917;">Подтверждение email</h2>
      <p style="color:#57534e;">Спасибо за регистрацию в <strong>ТБИссектриса</strong>!</p>
      <p style="color:#57534e;">Нажмите кнопку, чтобы подтвердить ваш email:</p>
      <a href="{link}"
         style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;
                border-radius:12px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Подтвердить email
      </a>
      <p style="color:#a8a29e;font-size:12px;">Ссылка действительна 24 часа.<br>
         Если вы не регистрировались — проигнорируйте это письмо.</p>
    </div>
    """
    send_email(to, "Подтвердите ваш email — ТБИссектриса", html)


def _fmt_date(d) -> str:
    return d.strftime('%d.%m.%Y') if hasattr(d, 'strftime') else str(d)[:10]


def default_new_event_message(title: str, starts_at, reg_deadline) -> tuple[str, str]:
    """Тема и текст рассылки о новом мероприятии по умолчанию (админ может их отредактировать)."""
    subject = "Скоро игра! — ТБИссектриса"
    message = (
        f"Привет! У нас новое мероприятие — «{title}» 🎉\n\n"
        f"📅 Когда: {_fmt_date(starts_at)}\n"
        f"⏰ Успей зарегистрировать команду до: {_fmt_date(reg_deadline)}\n\n"
        "До встречи на улицах Тбилиси!\nКоманда ТБИссектрисы"
    )
    return subject, message


def send_event_announcement(to: str, subject: str, message: str, event_id: str):
    """Рассылка с произвольным текстом (обычный текст, HTML экранируется) и кнопкой на мероприятие."""
    link = f"{FRONTEND_URL}/events/{event_id}"
    paragraphs = "".join(
        f'<p style="color:#44403c;">{escape(par).replace(chr(10), "<br>")}</p>'
        for par in message.split("\n\n") if par.strip()
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <img src="{FRONTEND_URL}/logo-text.PNG" alt="ТБИссектриса" style="height:40px;margin-bottom:20px;" />
      {paragraphs}
      <a href="{link}"
         style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;
                border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Зарегистрироваться →
      </a>
    </div>
    """
    send_email(to, subject, html)


def send_reschedule_email(to: str, title: str, team_name: str, starts_at, reg_deadline):
    starts = _fmt_date(starts_at)
    deadline = _fmt_date(reg_deadline)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <img src="{FRONTEND_URL}/logo-text.PNG" alt="ТБИссектриса" style="height:40px;margin-bottom:20px;" />
      <h2 style="color:#dc2626;">Важно: «{escape(title)}» переносится</h2>
      <p style="color:#44403c;">Привет! Сообщаем, что мероприятие <strong>«{escape(title)}»</strong> переносится.</p>
      <p style="color:#44403c;">📅 <strong>Новая дата:</strong> {starts}<br>
      ⏰ <strong>Регистрация продлена до:</strong> {deadline}</p>
      <p style="color:#44403c;">Ваша команда <strong>«{escape(team_name)}»</strong> остаётся в игре — ничего делать не нужно.</p>
      <p style="color:#a8a29e;font-size:13px;">До встречи!<br>Команда ТБИссектрисы</p>
    </div>
    """
    send_email(to, f"Важно: «{title}» переносится", html)


def send_results_email(to: str, title: str, team_name: str, rank: int | None, score, event_id: str):
    link = f"{FRONTEND_URL}/events/{event_id}"
    rank_str = f"место {rank}" if rank else "—"
    score_str = str(score) if score is not None else "—"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <img src="{FRONTEND_URL}/logo-text.PNG" alt="ТБИссектриса" style="height:40px;margin-bottom:20px;" />
      <h2 style="color:#dc2626;">Результаты «{escape(title)}» опубликованы!</h2>
      <p style="color:#44403c;">Привет! Результаты мероприятия <strong>«{escape(title)}»</strong> уже на сайте.</p>
      <p style="color:#44403c;">🏆 Ваша команда <strong>«{escape(team_name)}»</strong>: {escape(rank_str)}, баллы: {escape(score_str)}</p>
      <a href="{link}"
         style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;
                border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Смотреть результаты →
      </a>
      <p style="color:#a8a29e;font-size:13px;">Спасибо что играли с нами!<br>Команда ТБИссектрисы</p>
    </div>
    """
    send_email(to, f"Результаты «{title}» опубликованы!", html)


def send_invite_email(to: str, team_name: str, event_title: str, temp_password: str, event_id: str):
    link = f"{FRONTEND_URL}/login"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <img src="{FRONTEND_URL}/logo-text.PNG" alt="ТБИссектриса" style="height:40px;margin-bottom:20px;" />
      <h2 style="color:#dc2626;">Привет от ТБИссектрисы!</h2>
      <p style="color:#44403c;">Ваша команда <strong>«{escape(team_name)}»</strong> зарегистрирована на <strong>«{escape(event_title)}»</strong> 🎉</p>
      <p style="color:#44403c;">Мы создали для вас аккаунт на сайте — зайдите и заполните данные команды:</p>
      <table style="background:#f5f5f4;border-radius:10px;padding:16px;margin:16px 0;width:100%;">
        <tr><td style="color:#78716c;font-size:13px;">Email:</td><td style="font-weight:bold;color:#1c1917;">{escape(to)}</td></tr>
        <tr><td style="color:#78716c;font-size:13px;">Пароль:</td><td style="font-weight:bold;color:#1c1917;font-size:18px;letter-spacing:2px;">{escape(temp_password)}</td></tr>
      </table>
      <a href="{link}"
         style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;
                border-radius:10px;text-decoration:none;font-weight:bold;margin:8px 0;">
        Войти на сайт →
      </a>
      <p style="color:#78716c;font-size:13px;margin-top:20px;">После входа вы сможете: изменить пароль, уточнить состав команды и следить за результатами.</p>
      <p style="color:#a8a29e;font-size:13px;">До встречи на улицах Тбилиси!<br>Команда ТБИссектрисы</p>
    </div>
    """
    send_email(to, f"Ваша команда «{team_name}» зарегистрирована!", html)


def send_reset_email(to: str, token: str):
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#1c1917;">Сброс пароля</h2>
      <p style="color:#57534e;">Вы запросили сброс пароля для <strong>ТБИссектриса</strong>.</p>
      <p style="color:#57534e;">Нажмите кнопку для создания нового пароля:</p>
      <a href="{link}"
         style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;
                border-radius:12px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Сбросить пароль
      </a>
      <p style="color:#a8a29e;font-size:12px;">Ссылка действительна 1 час.<br>
         Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
    </div>
    """
    send_email(to, "Сброс пароля — ТБИссектриса", html)
