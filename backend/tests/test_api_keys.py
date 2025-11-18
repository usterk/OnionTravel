import pytest
from sqlalchemy.orm import Session

from app.models.api_key import ApiKey
from app.utils.security import generate_api_key, hash_api_key, verify_api_key


class TestApiKeySecurityFunctions:
    """Tests for API key security utility functions"""

    def test_generate_api_key(self):
        """Test API key generation"""
        full_key, prefix = generate_api_key()

        assert full_key is not None
        assert prefix is not None
        assert full_key.startswith("ak_")
        assert len(full_key) > 40  # ak_ + 43 chars from token_urlsafe(32)
        assert prefix == full_key[:12]
        assert prefix.startswith("ak_")

    def test_generate_unique_api_keys(self):
        """Test that generated API keys are unique"""
        key1, prefix1 = generate_api_key()
        key2, prefix2 = generate_api_key()

        assert key1 != key2
        assert prefix1 != prefix2

    def test_hash_api_key(self):
        """Test API key hashing"""
        api_key = "ak_test_key_12345"
        hashed = hash_api_key(api_key)

        assert hashed != api_key
        assert hashed.startswith("$2b$")
        assert len(hashed) > 50

    def test_verify_correct_api_key(self):
        """Test verifying correct API key"""
        api_key = "ak_test_key_12345"
        hashed = hash_api_key(api_key)

        assert verify_api_key(api_key, hashed) is True

    def test_verify_wrong_api_key(self):
        """Test verifying wrong API key"""
        api_key = "ak_test_key_12345"
        wrong_key = "ak_wrong_key_67890"
        hashed = hash_api_key(api_key)

        assert verify_api_key(wrong_key, hashed) is False

    def test_same_key_different_hashes(self):
        """Test that same key generates different hashes (salt)"""
        api_key = "ak_test_key_12345"
        hash1 = hash_api_key(api_key)
        hash2 = hash_api_key(api_key)

        assert hash1 != hash2
        assert verify_api_key(api_key, hash1) is True
        assert verify_api_key(api_key, hash2) is True


class TestApiKeyEndpoints:
    """Tests for API key management endpoints"""

    def test_create_api_key(self, client, auth_headers):
        """Test creating a new API key"""
        response = client.post(
            "/api/v1/api-keys",
            json={"name": "Test API Key"},
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test API Key"
        assert data["prefix"].startswith("ak_")
        assert len(data["prefix"]) == 12
        assert "key" in data  # Full key should be returned
        assert data["key"].startswith("ak_")
        assert len(data["key"]) > 40
        assert data["is_active"] is True
        assert "created_at" in data
        assert data["last_used_at"] is None

    def test_create_api_key_without_auth(self, client):
        """Test creating API key without authentication fails"""
        response = client.post(
            "/api/v1/api-keys",
            json={"name": "Test API Key"}
        )

        assert response.status_code == 403

    def test_create_api_key_with_empty_name(self, client, auth_headers):
        """Test creating API key with empty name fails"""
        response = client.post(
            "/api/v1/api-keys",
            json={"name": ""},
            headers=auth_headers
        )

        assert response.status_code == 422

    def test_list_api_keys(self, client, auth_headers):
        """Test listing API keys"""
        # Create two API keys
        client.post(
            "/api/v1/api-keys",
            json={"name": "Key 1"},
            headers=auth_headers
        )
        client.post(
            "/api/v1/api-keys",
            json={"name": "Key 2"},
            headers=auth_headers
        )

        # List API keys
        response = client.get("/api/v1/api-keys", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] in ["Key 1", "Key 2"]
        assert data[1]["name"] in ["Key 1", "Key 2"]
        # Full key should NOT be in list response
        assert "key" not in data[0]
        assert "key" not in data[1]

    def test_list_api_keys_without_auth(self, client):
        """Test listing API keys without authentication fails"""
        response = client.get("/api/v1/api-keys")

        assert response.status_code == 403

    def test_list_api_keys_only_shows_own_keys(self, client, auth_headers, auth_headers_user2):
        """Test that users only see their own API keys"""
        # User 1 creates a key
        client.post(
            "/api/v1/api-keys",
            json={"name": "User 1 Key"},
            headers=auth_headers
        )

        # User 2 creates a key
        client.post(
            "/api/v1/api-keys",
            json={"name": "User 2 Key"},
            headers=auth_headers_user2
        )

        # User 1 lists keys
        response1 = client.get("/api/v1/api-keys", headers=auth_headers)
        data1 = response1.json()
        assert len(data1) == 1
        assert data1[0]["name"] == "User 1 Key"

        # User 2 lists keys
        response2 = client.get("/api/v1/api-keys", headers=auth_headers_user2)
        data2 = response2.json()
        assert len(data2) == 1
        assert data2[0]["name"] == "User 2 Key"

    def test_delete_api_key(self, client, auth_headers):
        """Test deleting an API key"""
        # Create a key
        create_response = client.post(
            "/api/v1/api-keys",
            json={"name": "Key to Delete"},
            headers=auth_headers
        )
        key_id = create_response.json()["id"]

        # Delete the key
        delete_response = client.delete(
            f"/api/v1/api-keys/{key_id}",
            headers=auth_headers
        )

        assert delete_response.status_code == 204

        # Verify key is deleted
        list_response = client.get("/api/v1/api-keys", headers=auth_headers)
        data = list_response.json()
        assert len(data) == 0

    def test_delete_api_key_not_found(self, client, auth_headers):
        """Test deleting non-existent API key"""
        response = client.delete("/api/v1/api-keys/99999", headers=auth_headers)

        assert response.status_code == 404

    def test_delete_api_key_without_auth(self, client, auth_headers):
        """Test deleting API key without authentication fails"""
        # Create a key
        create_response = client.post(
            "/api/v1/api-keys",
            json={"name": "Key to Delete"},
            headers=auth_headers
        )
        key_id = create_response.json()["id"]

        # Try to delete without auth
        response = client.delete(f"/api/v1/api-keys/{key_id}")

        assert response.status_code == 403

    def test_delete_other_users_key_fails(self, client, auth_headers, auth_headers_user2):
        """Test that users cannot delete other users' API keys"""
        # User 1 creates a key
        create_response = client.post(
            "/api/v1/api-keys",
            json={"name": "User 1 Key"},
            headers=auth_headers
        )
        key_id = create_response.json()["id"]

        # User 2 tries to delete User 1's key
        delete_response = client.delete(
            f"/api/v1/api-keys/{key_id}",
            headers=auth_headers_user2
        )

        assert delete_response.status_code == 404  # Should not find the key


class TestApiKeyAuthentication:
    """Tests for API key authentication

    Note: API key management endpoints (/api-keys) only accept JWT for security.
    API keys are meant for accessing other endpoints like AI expenses.
    """

    def test_api_key_cannot_manage_itself(self, client, auth_headers):
        """Test that API keys cannot be used to manage API keys (requires JWT)"""
        # Create an API key
        create_response = client.post(
            "/api/v1/api-keys",
            json={"name": "Test Key"},
            headers=auth_headers
        )
        api_key = create_response.json()["key"]

        # Try to list API keys using the API key itself (should fail)
        response = client.get(
            "/api/v1/api-keys",
            headers={"X-API-Key": api_key}
        )

        # Should fail with 403 because API keys can't manage themselves
        assert response.status_code == 403

    def test_jwt_still_works_for_api_key_management(self, client, auth_headers):
        """Test that JWT authentication still works for API key management"""
        response = client.get("/api/v1/api-keys", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestApiKeyDatabaseModel:
    """Tests for API key database model"""

    def test_create_api_key_model(self, db_session):
        """Test creating an API key in the database"""
        from app.models.user import User

        # Create a user first
        user = User(
            email="test@example.com",
            username="testuser",
            hashed_password="hashedpassword"
        )
        db_session.add(user)
        db_session.commit()

        # Create an API key
        api_key = ApiKey(
            user_id=user.id,
            name="Test Key",
            key_hash="hashed_key",
            prefix="ak_test1234",
            is_active=True
        )
        db_session.add(api_key)
        db_session.commit()

        # Verify
        assert api_key.id is not None
        assert api_key.user_id == user.id
        assert api_key.created_at is not None

    def test_api_key_relationship_with_user(self, db_session):
        """Test relationship between API key and user"""
        from app.models.user import User

        # Create a user
        user = User(
            email="test@example.com",
            username="testuser",
            hashed_password="hashedpassword"
        )
        db_session.add(user)
        db_session.commit()

        # Create API keys
        api_key1 = ApiKey(
            user_id=user.id,
            name="Key 1",
            key_hash="hash1",
            prefix="ak_key00001"
        )
        api_key2 = ApiKey(
            user_id=user.id,
            name="Key 2",
            key_hash="hash2",
            prefix="ak_key00002"
        )
        db_session.add_all([api_key1, api_key2])
        db_session.commit()

        # Refresh user to load relationships
        db_session.refresh(user)

        # Verify relationship
        assert len(user.api_keys) == 2
        assert api_key1.user == user
        assert api_key2.user == user

    def test_cascade_delete_api_keys_when_user_deleted(self, db_session):
        """Test that API keys are deleted when user is deleted"""
        from app.models.user import User

        # Create a user with API keys
        user = User(
            email="test@example.com",
            username="testuser",
            hashed_password="hashedpassword"
        )
        db_session.add(user)
        db_session.commit()

        api_key = ApiKey(
            user_id=user.id,
            name="Test Key",
            key_hash="hashed",
            prefix="ak_test1234"
        )
        db_session.add(api_key)
        db_session.commit()

        key_id = api_key.id

        # Delete user
        db_session.delete(user)
        db_session.commit()

        # Verify API key is also deleted
        deleted_key = db_session.query(ApiKey).filter(ApiKey.id == key_id).first()
        assert deleted_key is None


# Tests for AI expenses with API key are in test_ai_expenses.py
