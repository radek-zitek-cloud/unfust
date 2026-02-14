import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(to_email: str, reset_token: str) -> None:
    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = "Unfust — Password Reset"
    message.set_content(
        f"You requested a password reset.\n\n"
        f"Click here to reset your password:\n{reset_url}\n\n"
        f"This link expires in 1 hour.\n\n"
        f"If you did not request this, ignore this email."
    )

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            use_tls=settings.smtp_use_tls,
        )
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
