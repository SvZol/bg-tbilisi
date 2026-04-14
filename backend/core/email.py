import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "ТБИссектриса")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_email(to: str, subject: str, html: str):
    print(f"[EMAIL] host={SMTP_HOST} port={SMTP_PORT} user={SMTP_USER} to={to}")

    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL MOCK] SMTP не настроен")
        print(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if SMTP_PORT == 465:
            import ssl
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as smtp:
                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.sendmail(FROM_EMAIL, to, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.login(SMTP_USER, SMTP_PASS)
                smtp.sendmail(FROM_EMAIL, to, msg.as_string())
        print(f"[EMAIL] Успешно отправлено на {to}")
    except Exception as e:
        print(f"[EMAIL ERROR] {type(e).__name__}: {e}")
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
