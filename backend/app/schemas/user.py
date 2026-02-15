from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool
    is_admin: bool
    notes: str | None
    location: str | None
    habit_xp: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    notes: str | None = None
    location: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateUserAdminRequest(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None
    notes: str | None = None


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
