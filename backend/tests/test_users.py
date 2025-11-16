"""Tests for user endpoints"""
import pytest
from fastapi.testclient import TestClient


class TestUserSearch:
    """Test GET /users/search endpoint"""

    def test_search_users_by_email(self, client, auth_headers, test_user_data):
        """Test searching users by email"""
        # Create additional test user
        test_user_data2 = {
            "email": "searchtest@example.com",
            "username": "searchuser",
            "password": "testpass123",
            "full_name": "Search Test User"
        }
        client.post("/api/v1/auth/register", json=test_user_data2)

        # Search for the user
        response = client.get(
            "/api/v1/users/search?q=searchtest",
            headers=auth_headers
        )

        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1
        assert any(user['email'] == 'searchtest@example.com' for user in users)

    def test_search_users_by_username(self, client, auth_headers, test_user_data):
        """Test searching users by username"""
        # Create additional test user
        test_user_data2 = {
            "email": "username@example.com",
            "username": "uniqueuser123",
            "password": "testpass123",
            "full_name": "Unique User"
        }
        client.post("/api/v1/auth/register", json=test_user_data2)

        # Search for the user
        response = client.get(
            "/api/v1/users/search?q=uniqueuser",
            headers=auth_headers
        )

        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1
        assert any(user['username'] == 'uniqueuser123' for user in users)

    def test_search_users_case_insensitive(self, client, auth_headers, test_user_data):
        """Test that search is case-insensitive"""
        # Create test user
        test_user_data2 = {
            "email": "CaseTest@Example.com",
            "username": "CaseTestUser",
            "password": "testpass123",
            "full_name": "Case Test"
        }
        client.post("/api/v1/auth/register", json=test_user_data2)

        # Search with lowercase
        response = client.get(
            "/api/v1/users/search?q=casetest",
            headers=auth_headers
        )

        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1
        # Should find the user regardless of case
        assert any('casetest' in user['email'].lower() or 'casetest' in user['username'].lower() for user in users)

    def test_search_users_partial_match(self, client, auth_headers, test_user_data):
        """Test that search supports partial matches"""
        # Create test user
        test_user_data2 = {
            "email": "partialmatch@example.com",
            "username": "partialmatchuser",
            "password": "testpass123",
            "full_name": "Partial Match"
        }
        client.post("/api/v1/auth/register", json=test_user_data2)

        # Search with partial string
        response = client.get(
            "/api/v1/users/search?q=partial",
            headers=auth_headers
        )

        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1

    def test_search_users_no_results(self, client, auth_headers):
        """Test searching with query that returns no results"""
        response = client.get(
            "/api/v1/users/search?q=nonexistentuser12345",
            headers=auth_headers
        )

        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        # May be empty or contain other users, but should not error

    def test_search_users_min_length(self, client, auth_headers):
        """Test that search requires minimum 2 characters"""
        response = client.get(
            "/api/v1/users/search?q=a",
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    def test_search_users_unauthorized(self, client):
        """Test that search requires authentication"""
        response = client.get("/api/v1/users/search?q=test")

        assert response.status_code in [401, 403]

    def test_search_users_max_results(self, client, auth_headers):
        """Test that search returns max 10 results"""
        # Create many users
        for i in range(15):
            test_user_data = {
                "email": f"bulkuser{i}@example.com",
                "username": f"bulkuser{i}",
                "password": "testpass123",
                "full_name": f"Bulk User {i}"
            }
            client.post("/api/v1/auth/register", json=test_user_data)

        # Search for all bulk users
        response = client.get(
            "/api/v1/users/search?q=bulkuser",
            headers=auth_headers
        )

        assert response.status_code == 200
        users = response.json()
        # Should return max 10 results
        assert len(users) <= 10

    def test_search_users_returns_correct_fields(self, client, auth_headers, test_user_data):
        """Test that search returns correct user fields"""
        # Create test user
        test_user_data2 = {
            "email": "fieldstest@example.com",
            "username": "fieldstest",
            "password": "testpass123",
            "full_name": "Fields Test User"
        }
        client.post("/api/v1/auth/register", json=test_user_data2)

        # Search for the user
        response = client.get(
            "/api/v1/users/search?q=fieldstest",
            headers=auth_headers
        )

        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1

        # Check that user object has expected fields
        user = next((u for u in users if u['username'] == 'fieldstest'), None)
        assert user is not None
        assert 'id' in user
        assert 'email' in user
        assert 'username' in user
        assert 'full_name' in user
        # Should NOT include password
        assert 'password' not in user
        assert 'hashed_password' not in user
