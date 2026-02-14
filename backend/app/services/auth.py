import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import PasswordResetToken, RefreshToken, User
from app.security import hash_password, hash_token, verify_password


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(
        self, email: str, first_name: str, last_name: str, password: str
    ) -> User:
        # Check if this is the first user
        result = await self.db.execute(select(func.count(User.id)))
        user_count = result.scalar_one()

        user = User(
            email=email.lower().strip(),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            password_hash=hash_password(password),
            is_active=user_count == 0,
            is_admin=user_count == 0,
        )
        self.db.add(user)
        try:
            await self.db.commit()
            await self.db.refresh(user)
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Email already registered")
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        user = result.scalar_one_or_none()
        if user is None:
            return None
        if not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    async def create_refresh_token(self, user_id: str) -> str:
        raw_token = secrets.token_urlsafe(64)
        db_token = RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.jwt_refresh_token_expire_days),
        )
        self.db.add(db_token)
        await self.db.commit()
        return raw_token

    async def validate_refresh_token(self, raw_token: str) -> User | None:
        token_hash_value = hash_token(raw_token)
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash_value,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        db_token = result.scalar_one_or_none()
        if db_token is None:
            return None
        result = await self.db.execute(
            select(User).where(User.id == db_token.user_id, User.is_active == True)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, raw_token: str) -> None:
        token_hash_value = hash_token(raw_token)
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash_value)
            .values(revoked=True)
        )
        await self.db.commit()

    async def revoke_all_refresh_tokens(self, user_id: str) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked == False)
            .values(revoked=True)
        )
        await self.db.commit()

    async def rotate_refresh_token(self, old_raw_token: str) -> tuple[str, User] | None:
        """Validate old token, revoke it, issue new one. Returns (new_token, user) or None."""
        token_hash_value = hash_token(old_raw_token)
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash_value)
        )
        db_token = result.scalar_one_or_none()
        if db_token is None:
            return None

        # Replay detection: if token is already revoked, revoke ALL tokens for the user
        if db_token.revoked:
            await self.revoke_all_refresh_tokens(db_token.user_id)
            return None

        if db_token.expires_at < datetime.now(timezone.utc):
            return None

        # Revoke old token
        db_token.revoked = True
        await self.db.commit()

        # Verify user is still active
        result = await self.db.execute(
            select(User).where(User.id == db_token.user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        if user is None:
            return None

        # Issue new token
        new_token = await self.create_refresh_token(user.id)
        return new_token, user

    async def create_password_reset_token(self, email: str) -> str | None:
        """Returns the raw reset token, or None if user not found."""
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        user = result.scalar_one_or_none()
        if user is None:
            return None

        raw_token = secrets.token_urlsafe(64)
        db_token = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        self.db.add(db_token)
        await self.db.commit()
        return raw_token

    async def reset_password(self, raw_token: str, new_password: str) -> bool:
        token_hash_value = hash_token(raw_token)
        result = await self.db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash_value,
                PasswordResetToken.used == False,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
        )
        db_token = result.scalar_one_or_none()
        if db_token is None:
            return False

        # Mark token as used
        db_token.used = True

        # Update password
        result = await self.db.execute(
            select(User).where(User.id == db_token.user_id)
        )
        user = result.scalar_one()
        user.password_hash = hash_password(new_password)
        await self.db.commit()

        # Revoke all refresh tokens
        await self.revoke_all_refresh_tokens(user.id)
        return True

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> bool:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            return False
        if not verify_password(current_password, user.password_hash):
            return False
        user.password_hash = hash_password(new_password)
        await self.db.commit()
        await self.revoke_all_refresh_tokens(user_id)
        return True
