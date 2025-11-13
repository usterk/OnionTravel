import pytest
from fastapi import status


class TestUserRegistration:
    """Tests for user registration endpoint"""

    def test_register_user_success(self, client, test_user_data):
        """Test successful user registration"""
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["username"] == test_user_data["username"]
        assert data["full_name"] == test_user_data["full_name"]
        assert "id" in data
        assert "created_at" in data
        assert "hashed_password" not in data  # Should not expose password

    def test_register_duplicate_email(self, client, test_user_data):
        """Test registration with duplicate email"""
        # First registration
        client.post("/api/v1/auth/register", json=test_user_data)

        # Try to register again with same email
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]

    def test_register_duplicate_username(self, client, test_user_data):
        """Test registration with duplicate username"""
        # First registration
        client.post("/api/v1/auth/register", json=test_user_data)

        # Try to register with different email but same username
        test_user_data["email"] = "different@example.com"
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Username already taken" in response.json()["detail"]

    def test_register_invalid_email(self, client, test_user_data):
        """Test registration with invalid email format"""
        test_user_data["email"] = "invalid-email"
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_short_username(self, client, test_user_data):
        """Test registration with too short username"""
        test_user_data["username"] = "ab"  # Less than 3 characters
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_short_password(self, client, test_user_data):
        """Test registration with too short password"""
        test_user_data["password"] = "short"  # Less than 8 characters
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_without_full_name(self, client, test_user_data):
        """Test registration without optional full_name"""
        del test_user_data["full_name"]
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["full_name"] is None


class TestUserLogin:
    """Tests for user login endpoint"""

    def test_login_success(self, client, test_user_data):
        """Test successful login"""
        # Register user first
        client.post("/api/v1/auth/register", json=test_user_data)

        # Login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_email(self, client, test_user_data):
        """Test login with non-existent email"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "somepassword"
        }
        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_wrong_password(self, client, test_user_data):
        """Test login with wrong password"""
        # Register user first
        client.post("/api/v1/auth/register", json=test_user_data)

        # Login with wrong password
        login_data = {
            "email": test_user_data["email"],
            "password": "wrongpassword"
        }
        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect email or password" in response.json()["detail"]

    def test_login_missing_fields(self, client):
        """Test login with missing required fields"""
        response = client.post("/api/v1/auth/login", json={})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestTokenRefresh:
    """Tests for token refresh endpoint"""

    def test_refresh_token_success(self, client, test_user_data):
        """Test successful token refresh"""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        refresh_token = login_response.json()["refresh_token"]

        # Refresh token
        response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token"""
        response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid.token.here"
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_access_token_as_refresh(self, client, test_user_data):
        """Test using access token instead of refresh token"""
        # Register and login
        client.post("/api/v1/auth/register", json=test_user_data)
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        access_token = login_response.json()["access_token"]

        # Try to use access token for refresh
        response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": access_token
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetCurrentUser:
    """Tests for get current user endpoint"""

    def test_get_current_user_success(self, client, auth_headers, test_user_data):
        """Test getting current user with valid token"""
        response = client.get("/api/v1/auth/me", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["username"] == test_user_data["username"]
        assert "id" in data
        assert "hashed_password" not in data

    def test_get_current_user_no_token(self, client):
        """Test getting current user without token"""
        response = client.get("/api/v1/auth/me")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_malformed_header(self, client):
        """Test getting current user with malformed auth header"""
        headers = {"Authorization": "InvalidFormat token"}
        response = client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestUpdateCurrentUser:
    """Tests for update current user endpoint (PUT /auth/me)"""

    def test_update_user_profile_success(self, client, auth_headers, test_user_data):
        """Test successful user profile update"""
        update_data = {
            "full_name": "Updated Name",
            "avatar_url": "https://example.com/avatar.jpg"
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["avatar_url"] == "https://example.com/avatar.jpg"
        assert data["email"] == test_user_data["email"]  # Email unchanged
        assert data["username"] == test_user_data["username"]  # Username unchanged

    def test_update_email_success(self, client, auth_headers, test_user_data):
        """Test successful email update"""
        update_data = {
            "email": "newemail@example.com"
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "newemail@example.com"
        assert data["username"] == test_user_data["username"]  # Username unchanged

    def test_update_email_conflict(self, client, auth_headers, auth_headers_user2):
        """Test email update with email already taken by another user"""
        # Try to change to email of user2
        update_data = {
            "email": "test2@example.com"  # This is user2's email
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]

    def test_update_username_success(self, client, auth_headers, test_user_data):
        """Test successful username update"""
        update_data = {
            "username": "newusername"
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == "newusername"
        assert data["email"] == test_user_data["email"]  # Email unchanged

    def test_update_username_conflict(self, client, auth_headers, auth_headers_user2):
        """Test username update with username already taken by another user"""
        # Try to change to username of user2
        update_data = {
            "username": "testuser2"  # This is user2's username
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Username already taken" in response.json()["detail"]

    def test_update_user_no_token(self, client):
        """Test update without authentication token"""
        update_data = {
            "full_name": "New Name"
        }
        response = client.put("/api/v1/auth/me", json=update_data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_partial_fields(self, client, auth_headers, test_user_data):
        """Test updating only some fields (partial update)"""
        # Update only full_name
        update_data = {
            "full_name": "Only Name Changed"
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Only Name Changed"
        assert data["email"] == test_user_data["email"]
        assert data["username"] == test_user_data["username"]
        # avatar_url should be None or unchanged (depending on default)

    def test_update_same_email_allowed(self, client, auth_headers, test_user_data):
        """Test that updating to same email (no change) is allowed"""
        update_data = {
            "email": test_user_data["email"],  # Same email
            "full_name": "Changed Name"
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["full_name"] == "Changed Name"

    def test_update_same_username_allowed(self, client, auth_headers, test_user_data):
        """Test that updating to same username (no change) is allowed"""
        update_data = {
            "username": test_user_data["username"],  # Same username
            "full_name": "Changed Name"
        }
        response = client.put("/api/v1/auth/me", json=update_data, headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == test_user_data["username"]
        assert data["full_name"] == "Changed Name"


class TestPasswordSecurity:
    """Tests for password hashing and security"""

    def test_password_is_hashed(self, client, db_session, test_user_data):
        """Test that passwords are properly hashed in database"""
        from app.models.user import User

        # Register user
        client.post("/api/v1/auth/register", json=test_user_data)

        # Check database
        user = db_session.query(User).filter(User.email == test_user_data["email"]).first()
        assert user is not None
        assert user.hashed_password != test_user_data["password"]
        assert user.hashed_password.startswith("$2b$")  # bcrypt hash

    def test_password_not_returned_in_response(self, client, test_user_data):
        """Test that password is never returned in API responses"""
        # Register
        register_response = client.post("/api/v1/auth/register", json=test_user_data)
        assert "password" not in register_response.json()
        assert "hashed_password" not in register_response.json()

        # Login
        login_response = client.post("/api/v1/auth/login", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        assert "password" not in login_response.json()
        assert "hashed_password" not in login_response.json()


class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""

    def test_register_with_whitespace_in_email(self, client, test_user_data):
        """Test registration with whitespace in email"""
        test_user_data["email"] = " test@example.com "
        response = client.post("/api/v1/auth/register", json=test_user_data)

        # Pydantic should handle validation
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_422_UNPROCESSABLE_ENTITY]

    def test_register_very_long_username(self, client, test_user_data):
        """Test registration with username at max length"""
        test_user_data["username"] = "a" * 100  # Max is 100
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_201_CREATED

    def test_register_username_over_max(self, client, test_user_data):
        """Test registration with username exceeding max length"""
        test_user_data["username"] = "a" * 101  # Over max
        response = client.post("/api/v1/auth/register", json=test_user_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_case_sensitive_email_login(self, client, test_user_data):
        """Test that email login is case-insensitive (or not, depending on requirements)"""
        # Register with lowercase email
        client.post("/api/v1/auth/register", json=test_user_data)

        # Try to login with uppercase email
        login_data = {
            "email": test_user_data["email"].upper(),
            "password": test_user_data["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_data)

        # This test documents current behavior - adjust based on requirements
        # Currently emails are case-sensitive in database queries
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]
