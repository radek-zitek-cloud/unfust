from datetime import timedelta

import pytest

from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)


def test_hash_and_verify_password():
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert verify_password("mysecretpassword", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_and_decode_access_token():
    token = create_access_token(subject="user-123", is_admin=True)
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["is_admin"] is True


def test_expired_access_token():
    token = create_access_token(
        subject="user-123", expires_delta=timedelta(seconds=-1)
    )
    assert decode_access_token(token) is None


def test_hash_token_deterministic():
    token = "some-refresh-token"
    assert hash_token(token) == hash_token(token)
    assert hash_token(token) != hash_token("different-token")
