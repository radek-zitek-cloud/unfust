from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.security import create_access_token
from app.services.auth import AuthService
from app.services.email import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

REFRESH_COOKIE_KEY = "refresh_token"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=raw_token,
        httponly=True,
        secure=False,  # Set True in production behind HTTPS
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_KEY, path="/api/auth")


@router.post("/register", response_model=TokenResponse)
async def register(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    try:
        user = await service.register(
            email=body.email,
            first_name=body.first_name,
            last_name=body.last_name,
            password=body.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    access_token = create_access_token(subject=user.id, is_admin=user.is_admin)
    raw_refresh = await service.create_refresh_token(user.id)
    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.authenticate(body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = create_access_token(subject=user.id, is_admin=user.is_admin)
    raw_refresh = await service.create_refresh_token(user.id)
    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token"
        )
    service = AuthService(db)
    result = await service.rotate_refresh_token(refresh_token)
    if result is None:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    new_raw_token, user = result
    access_token = create_access_token(subject=user.id, is_admin=user.is_admin)
    _set_refresh_cookie(response, new_raw_token)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        service = AuthService(db)
        await service.revoke_refresh_token(refresh_token)
    _clear_refresh_cookie(response)


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    token = await service.create_password_reset_token(body.email)
    if token is not None:
        await send_password_reset_email(body.email, token)
    # Always return 200 to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    success = await service.reset_password(body.token, body.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    return {"message": "Password reset successfully."}
