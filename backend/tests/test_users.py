import pytest
from fastapi import status


class TestGetCurrentUserProfile:
    """Tests for GET /api/v1/users/me endpoint"""

    def test_get_current_user_success(self, client, auth_headers):
        """Test getting current user profile"""
        response = client.get("/api/v1/users/me", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "username" in data
        assert "created_at" in data
        assert "hashed_password" not in data

    def test_get_current_user_unauthenticated(self, client):
        """Test getting profile without authentication"""
        response = client.get("/api/v1/users/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUpdateCurrentUserProfile:
    """Tests for PUT /api/v1/users/me endpoint"""

    def test_update_user_full_name(self, client, auth_headers):
        """Test updating user's full name"""
        update_data = {"full_name": "Updated Name"}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Updated Name"

    def test_update_user_avatar_url(self, client, auth_headers):
        """Test updating user's avatar URL"""
        update_data = {"avatar_url": "https://example.com/avatar.jpg"}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["avatar_url"] == "https://example.com/avatar.jpg"

    def test_update_user_username(self, client, auth_headers, test_user_data):
        """Test updating username"""
        new_username = test_user_data["username"] + "_updated"
        update_data = {"username": new_username}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["username"] == new_username

    def test_update_user_email(self, client, auth_headers):
        """Test updating email"""
        update_data = {"email": "newemail@example.com"}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "newemail@example.com"

    def test_update_user_duplicate_username(self, client, auth_headers, test_user_data):
        """Test updating to a username that already exists"""
        # Create second user
        second_user_data = {
            "email": "second@example.com",
            "username": "seconduser",
            "full_name": "Second User",
            "password": "SecondPassword123!"
        }
        client.post("/api/v1/auth/register", json=second_user_data)

        # Try to update first user's username to second user's username
        update_data = {"username": "seconduser"}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Username already taken" in response.json()["detail"]

    def test_update_user_duplicate_email(self, client, auth_headers):
        """Test updating to an email that already exists"""
        # Create second user
        second_user_data = {
            "email": "second@example.com",
            "username": "seconduser",
            "full_name": "Second User",
            "password": "SecondPassword123!"
        }
        client.post("/api/v1/auth/register", json=second_user_data)

        # Try to update first user's email to second user's email
        update_data = {"email": "second@example.com"}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]

    def test_update_user_unauthenticated(self, client):
        """Test updating profile without authentication"""
        update_data = {"full_name": "New Name"}
        response = client.put("/api/v1/users/me", json=update_data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_user_partial_update(self, client, auth_headers):
        """Test updating only some fields"""
        # Update only full_name, leaving other fields unchanged
        update_data = {"full_name": "Partially Updated"}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["full_name"] == "Partially Updated"
        # Other fields should remain unchanged
        assert "email" in data
        assert "username" in data

    def test_update_user_empty_update(self, client, auth_headers):
        """Test updating with no fields changed"""
        update_data = {}
        response = client.put("/api/v1/users/me", headers=auth_headers, json=update_data)

        # Should succeed but not change anything
        assert response.status_code == status.HTTP_200_OK


class TestSearchUsers:
    """Tests for GET /api/v1/users/search endpoint"""

    def test_search_users_by_username(self, client, auth_headers):
        """Test searching users by username"""
        # Create some users for searching
        test_users = [
            {"email": "search1@example.com", "username": "searchable_user_1", "full_name": "Search User 1", "password": "Password123!"},
            {"email": "search2@example.com", "username": "searchable_user_2", "full_name": "Search User 2", "password": "Password123!"},
            {"email": "search3@example.com", "username": "different_name_3", "full_name": "Search User 3", "password": "Password123!"},
        ]

        for user in test_users:
            client.post("/api/v1/auth/register", json=user)

        # Search for "searchable"
        response = client.get("/api/v1/users/search?q=searchable", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

        usernames = [u["username"] for u in data]
        assert "searchable_user_1" in usernames
        assert "searchable_user_2" in usernames

    def test_search_users_by_email(self, client, auth_headers):
        """Test searching users by email"""
        # Create a user
        user_data = {
            "email": "findbyme@example.com",
            "username": "findableuser",
            "full_name": "Findable User",
            "password": "Password123!"
        }
        client.post("/api/v1/auth/register", json=user_data)

        # Search by email pattern
        response = client.get("/api/v1/users/search?q=findbyme", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        emails = [u["email"] for u in data]
        assert "findbyme@example.com" in emails

    def test_search_users_by_full_name(self, client, auth_headers):
        """Test searching users by full name"""
        user_data = {
            "email": "nametest@example.com",
            "username": "nameuser",
            "full_name": "Unique Full Name Test",
            "password": "Password123!"
        }
        client.post("/api/v1/auth/register", json=user_data)

        # Search by full name
        response = client.get("/api/v1/users/search?q=Unique Full", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        names = [u["full_name"] for u in data]
        assert "Unique Full Name Test" in names

    def test_search_users_case_insensitive(self, client, auth_headers):
        """Test that search is case-insensitive"""
        user_data = {
            "email": "casetest@example.com",
            "username": "CaseSensitive",
            "full_name": "Case Test User",
            "password": "Password123!"
        }
        client.post("/api/v1/auth/register", json=user_data)

        # Search with different case
        response = client.get("/api/v1/users/search?q=casesensitive", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1

    def test_search_users_minimum_query_length(self, client, auth_headers):
        """Test that search requires at least 2 characters"""
        # Query with only 1 character should fail validation
        response = client.get("/api/v1/users/search?q=a", headers=auth_headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_search_users_respects_limit(self, client, auth_headers):
        """Test that search respects the limit parameter"""
        # Create multiple users
        for i in range(5):
            user_data = {
                "email": f"limituser{i}@example.com",
                "username": f"limituser{i}",
                "full_name": f"Limit User {i}",
                "password": "Password123!"
            }
            client.post("/api/v1/auth/register", json=user_data)

        # Search with limit of 2
        response = client.get("/api/v1/users/search?q=limituser&limit=2", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) <= 2

    def test_search_users_no_results(self, client, auth_headers):
        """Test searching with a query that returns no results"""
        response = client.get("/api/v1/users/search?q=nonexistentuser12345", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_search_users_unauthenticated(self, client):
        """Test that search requires authentication"""
        response = client.get("/api/v1/users/search?q=test")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_search_users_missing_query_parameter(self, client, auth_headers):
        """Test search without query parameter"""
        response = client.get("/api/v1/users/search", headers=auth_headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_search_users_no_password_exposure(self, client, auth_headers):
        """Test that search results don't expose passwords"""
        user_data = {
            "email": "securitytest@example.com",
            "username": "securityuser",
            "full_name": "Security Test",
            "password": "Password123!"
        }
        client.post("/api/v1/auth/register", json=user_data)

        response = client.get("/api/v1/users/search?q=securityuser", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for user in data:
            assert "hashed_password" not in user
            assert "password" not in user
