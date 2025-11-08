import pytest
from fastapi import HTTPException
from app.api.deps import get_current_user, get_current_active_user
from app.utils.security import create_access_token


class TestGetCurrentUser:
    """Tests for get_current_user dependency"""

    def test_get_current_user_valid_token(self, client, auth_headers):
        """Test get_current_user with valid token"""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        user_data = response.json()
        assert "email" in user_data
        assert "username" in user_data

    def test_get_current_user_invalid_user_id(self, client):
        """Test get_current_user with token containing non-existent user ID"""
        # Create token with user ID that doesn't exist
        invalid_token = create_access_token(user_id=9999)
        headers = {"Authorization": f"Bearer {invalid_token}"}

        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401

    def test_get_current_user_token_without_sub(self, client):
        """Test get_current_user with token missing 'sub' claim"""
        from jose import jwt
        from app.config import settings

        # Create token without 'sub'
        token = jwt.encode({"exp": 9999999999}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 401


class TestGetCurrentActiveUser:
    """Tests for get_current_active_user dependency"""

    def test_get_current_active_user(self, client, auth_headers):
        """Test get_current_active_user returns user correctly"""
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        user = response.json()
        assert user is not None
        assert "id" in user
