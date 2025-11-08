import pytest
from datetime import timedelta
from jose import jwt

from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.config import settings


class TestPasswordHashing:
    """Tests for password hashing functions"""

    def test_hash_password(self):
        """Test password hashing"""
        password = "TestPass123"  # Short password for bcrypt
        hashed = get_password_hash(password)

        assert hashed != password
        assert hashed.startswith("$2b$")
        assert len(hashed) > 50

    def test_verify_correct_password(self):
        """Test verifying correct password"""
        password = "TestPass123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_wrong_password(self):
        """Test verifying wrong password"""
        password = "TestPass123"
        wrong_password = "WrongPass"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False

    def test_same_password_different_hashes(self):
        """Test that same password generates different hashes (salt)"""
        password = "TestPass123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestTokenGeneration:
    """Tests for JWT token generation"""

    def test_create_access_token(self):
        """Test access token creation"""
        user_id = 1
        token = create_access_token(user_id)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 100

        # Decode and verify
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert "exp" in payload
        assert "type" not in payload  # Access tokens don't have type field

    def test_create_refresh_token(self):
        """Test refresh token creation"""
        user_id = 1
        token = create_refresh_token(user_id)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 100

        # Decode and verify
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "refresh"
        assert "exp" in payload

    def test_access_token_with_custom_expiry(self):
        """Test access token with custom expiration"""
        user_id = 1
        expires_delta = timedelta(minutes=15)
        token = create_access_token(user_id, expires_delta=expires_delta)

        payload = decode_token(token)
        assert "exp" in payload

    def test_token_contains_user_id(self):
        """Test that token contains correct user ID"""
        user_id = 42
        token = create_access_token(user_id)

        payload = decode_token(token)
        assert int(payload["sub"]) == user_id

    def test_decode_valid_token(self):
        """Test decoding valid token"""
        user_id = 1
        token = create_access_token(user_id)

        payload = decode_token(token)
        assert payload is not None
        assert "sub" in payload
        assert "exp" in payload

    def test_decode_invalid_token(self):
        """Test decoding invalid token raises exception"""
        invalid_token = "invalid.token.here"

        with pytest.raises(Exception):
            decode_token(invalid_token)

    def test_decode_token_with_wrong_secret(self):
        """Test that token signed with different secret fails"""
        user_id = 1
        # Create token with different secret
        wrong_token = jwt.encode(
            {"sub": str(user_id)},
            "wrong_secret_key",
            algorithm=settings.ALGORITHM
        )

        with pytest.raises(Exception):
            decode_token(wrong_token)


class TestTokenSecurity:
    """Tests for token security"""

    def test_tokens_are_different_for_same_user(self):
        """Test that multiple tokens for same user can be the same in same second"""
        import time
        user_id = 1
        token1 = create_access_token(user_id)
        time.sleep(1)  # Wait 1 second for different exp timestamp
        token2 = create_access_token(user_id)

        # Tokens created at different times should have different exp
        payload1 = decode_token(token1)
        payload2 = decode_token(token2)
        assert payload1["exp"] != payload2["exp"]

    def test_access_and_refresh_tokens_are_different(self):
        """Test that access and refresh tokens are different"""
        user_id = 1
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)

        assert access_token != refresh_token

        access_payload = decode_token(access_token)
        refresh_payload = decode_token(refresh_token)

        assert "type" not in access_payload
        assert refresh_payload["type"] == "refresh"
