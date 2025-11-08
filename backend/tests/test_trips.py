import pytest
from fastapi import status
from datetime import date


class TestTripCreation:
    """Tests for trip creation endpoint"""

    def test_create_trip_with_both_budgets(self, client, auth_headers, test_trip_data):
        """Test creating trip with both total and daily budget specified"""
        test_trip_data["daily_budget"] = 3500.00
        # Both budgets provided - should use both as-is

        response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert float(data["total_budget"]) == 50000.00
        assert float(data["daily_budget"]) == 3500.00

    def test_create_trip_success(self, client, auth_headers, test_trip_data):
        """Test successful trip creation"""
        response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == test_trip_data["name"]
        assert data["description"] == test_trip_data["description"]
        assert data["start_date"] == test_trip_data["start_date"]
        assert data["end_date"] == test_trip_data["end_date"]
        assert data["currency_code"] == test_trip_data["currency_code"]
        assert "id" in data
        assert "owner_id" in data
        assert "created_at" in data
        assert "daily_budget" in data  # Should be auto-calculated

    def test_create_trip_with_daily_budget(self, client, auth_headers, test_trip_data):
        """Test creating trip with daily budget instead of total"""
        test_trip_data["daily_budget"] = 3500.00
        del test_trip_data["total_budget"]

        response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert float(data["daily_budget"]) == 3500.00
        assert "total_budget" in data  # Should be auto-calculated

    def test_create_trip_invalid_dates(self, client, auth_headers, test_trip_data):
        """Test creating trip with end date before start date"""
        test_trip_data["start_date"] = "2025-07-14"
        test_trip_data["end_date"] = "2025-07-01"

        response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Start date must be before" in response.json()["detail"]

    def test_create_trip_missing_required_fields(self, client, auth_headers):
        """Test creating trip with missing required fields"""
        invalid_data = {
            "name": "Test Trip"
            # Missing start_date, end_date, currency_code
        }

        response = client.post(
            "/api/v1/trips/",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_trip_unauthorized(self, client, test_trip_data):
        """Test creating trip without authentication"""
        response = client.post("/api/v1/trips/", json=test_trip_data)

        # FastAPI returns 403 when no credentials are provided
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_trip_invalid_currency(self, client, auth_headers, test_trip_data):
        """Test creating trip with invalid currency code"""
        test_trip_data["currency_code"] = "INVALID"  # Too long

        response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestTripRetrieval:
    """Tests for trip retrieval endpoints"""

    def test_list_trips_empty(self, client, auth_headers):
        """Test listing trips when user has no trips"""
        response = client.get("/api/v1/trips/", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_list_trips_with_data(self, client, auth_headers, test_trip_data):
        """Test listing trips after creating one"""
        # Create a trip
        client.post("/api/v1/trips/", json=test_trip_data, headers=auth_headers)

        # List trips
        response = client.get("/api/v1/trips/", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["name"] == test_trip_data["name"]

    def test_get_trip_by_id(self, client, auth_headers, test_trip_data):
        """Test getting trip by ID"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Get trip
        response = client.get(f"/api/v1/trips/{trip_id}", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == trip_id
        assert data["name"] == test_trip_data["name"]
        assert "members" in data
        assert isinstance(data["members"], list)

    def test_get_trip_not_found(self, client, auth_headers):
        """Test getting non-existent trip"""
        response = client.get("/api/v1/trips/99999", headers=auth_headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_trip_no_access(self, client, auth_headers, auth_headers_user2, test_trip_data):
        """Test getting trip user doesn't have access to"""
        # User 1 creates a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # User 2 tries to access it
        response = client.get(f"/api/v1/trips/{trip_id}", headers=auth_headers_user2)

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestTripUpdate:
    """Tests for trip update endpoint"""

    def test_update_trip_total_budget(self, client, auth_headers, test_trip_data):
        """Test updating only total budget"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Update only total budget
        update_data = {"total_budget": 60000.00}
        response = client.put(
            f"/api/v1/trips/{trip_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Daily budget should be recalculated
        trip_days = 14  # July 1-14
        expected_daily = 60000.00 / trip_days
        assert float(data["total_budget"]) == 60000.00
        assert abs(float(data["daily_budget"]) - expected_daily) < 0.01

    def test_update_trip_daily_budget(self, client, auth_headers, test_trip_data):
        """Test updating only daily budget"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Update only daily budget
        update_data = {"daily_budget": 4000.00}
        response = client.put(
            f"/api/v1/trips/{trip_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Total budget should be recalculated
        trip_days = 14  # July 1-14
        expected_total = 4000.00 * trip_days
        assert float(data["daily_budget"]) == 4000.00
        assert abs(float(data["total_budget"]) - expected_total) < 0.01

    def test_update_trip_success(self, client, auth_headers, test_trip_data):
        """Test successfully updating a trip"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Update trip
        update_data = {
            "name": "Updated Trip Name",
            "description": "Updated description"
        }
        response = client.put(
            f"/api/v1/trips/{trip_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]

    def test_update_trip_dates(self, client, auth_headers, test_trip_data):
        """Test updating trip dates"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Update dates
        update_data = {
            "start_date": "2025-08-01",
            "end_date": "2025-08-15"
        }
        response = client.put(
            f"/api/v1/trips/{trip_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["start_date"] == update_data["start_date"]
        assert data["end_date"] == update_data["end_date"]

    def test_update_trip_invalid_dates(self, client, auth_headers, test_trip_data):
        """Test updating trip with invalid dates"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Try to update with invalid dates
        update_data = {
            "start_date": "2025-08-15",
            "end_date": "2025-08-01"
        }
        response = client.put(
            f"/api/v1/trips/{trip_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_trip_no_permission(self, client, auth_headers, auth_headers_user2, test_trip_data):
        """Test updating trip without permission"""
        # User 1 creates a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # User 2 tries to update it
        update_data = {"name": "Hacked Trip"}
        response = client.put(
            f"/api/v1/trips/{trip_id}",
            json=update_data,
            headers=auth_headers_user2
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestTripDeletion:
    """Tests for trip deletion endpoint"""

    def test_delete_trip_success(self, client, auth_headers, test_trip_data):
        """Test successfully deleting a trip"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Delete trip
        response = client.delete(f"/api/v1/trips/{trip_id}", headers=auth_headers)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify it's deleted - should return 404 since trip doesn't exist
        get_response = client.get(f"/api/v1/trips/{trip_id}", headers=auth_headers)
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_trip_not_owner(self, client, auth_headers, auth_headers_user2, test_trip_data):
        """Test deleting trip as non-owner"""
        # User 1 creates a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # User 2 tries to delete it
        response = client.delete(f"/api/v1/trips/{trip_id}", headers=auth_headers_user2)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_trip_not_found(self, client, auth_headers):
        """Test deleting non-existent trip"""
        response = client.delete("/api/v1/trips/99999", headers=auth_headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestTripMembers:
    """Tests for trip member management endpoints"""

    def test_add_member_success(self, client, auth_headers, test_trip_data):
        """Test successfully adding a member to a trip"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Register second user
        user2_data = {
            "email": "user2@example.com",
            "username": "user2",
            "password": "Password123"
        }
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        user2_id = user2_response.json()["id"]

        # Add member
        member_data = {"user_id": user2_id}
        response = client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_id"] == user2_id
        assert data["trip_id"] == trip_id
        assert data["role"] == "member"

    def test_add_member_already_exists(self, client, auth_headers, test_trip_data):
        """Test adding a member who is already in the trip"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Register second user
        user2_data = {
            "email": "user2@example.com",
            "username": "user2",
            "password": "Password123"
        }
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        user2_id = user2_response.json()["id"]

        # Add member first time
        member_data = {"user_id": user2_id}
        client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Try to add again
        response = client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already a member" in response.json()["detail"]

    def test_add_member_user_not_found(self, client, auth_headers, test_trip_data):
        """Test adding non-existent user as member"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Try to add non-existent user
        member_data = {"user_id": 99999}
        response = client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "User not found" in response.json()["detail"]

    def test_remove_member_success(self, client, auth_headers, test_trip_data):
        """Test successfully removing a member"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Register and add second user
        user2_data = {
            "email": "user2@example.com",
            "username": "user2",
            "password": "Password123"
        }
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        user2_id = user2_response.json()["id"]

        member_data = {"user_id": user2_id}
        client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Remove member
        response = client.delete(
            f"/api/v1/trips/{trip_id}/members/{user2_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_remove_member_not_in_trip(self, client, auth_headers, test_trip_data):
        """Test removing user who is not a member"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Register second user but don't add to trip
        user2_data = {
            "email": "user2@example.com",
            "username": "user2",
            "password": "Password123"
        }
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        user2_id = user2_response.json()["id"]

        # Try to remove
        response = client.delete(
            f"/api/v1/trips/{trip_id}/members/{user2_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_member_role_success(self, client, auth_headers, test_trip_data):
        """Test successfully updating member role"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Register and add second user
        user2_data = {
            "email": "user2@example.com",
            "username": "user2",
            "password": "Password123"
        }
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        user2_id = user2_response.json()["id"]

        member_data = {"user_id": user2_id}
        client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Update role
        role_data = {"role": "admin"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/members/{user2_id}",
            json=role_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "admin"

    def test_update_member_role_invalid_role(self, client, auth_headers, test_trip_data):
        """Test updating member role with invalid role"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Register and add second user
        user2_data = {
            "email": "user2@example.com",
            "username": "user2",
            "password": "Password123"
        }
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        user2_id = user2_response.json()["id"]

        member_data = {"user_id": user2_id}
        client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Try invalid role
        role_data = {"role": "invalid_role"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/members/{user2_id}",
            json=role_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_member_role_not_owner(self, client, auth_headers, test_trip_data):
        """Test updating member role as non-owner"""
        # User 1 creates a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Register user 2 and add as member
        user2_data = {
            "email": "user2_unique@example.com",
            "username": "user2unique",
            "password": "Password123"
        }
        user2_response = client.post("/api/v1/auth/register", json=user2_data)
        user2_id = user2_response.json()["id"]

        # Login user2 to get their auth headers
        login_response = client.post("/api/v1/auth/login", json={
            "email": user2_data["email"],
            "password": user2_data["password"]
        })
        user2_token = login_response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        member_data = {"user_id": user2_id}
        client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Register third user and add as member
        user3_data = {
            "email": "user3@example.com",
            "username": "user3",
            "password": "Password123"
        }
        user3_response = client.post("/api/v1/auth/register", json=user3_data)
        user3_id = user3_response.json()["id"]

        member_data3 = {"user_id": user3_id}
        client.post(
            f"/api/v1/trips/{trip_id}/members",
            json=member_data3,
            headers=auth_headers
        )

        # User 2 tries to update user 3's role (should fail - only owner can)
        role_data = {"role": "admin"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/members/{user3_id}",
            json=role_data,
            headers=user2_headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_remove_owner_fails(self, client, auth_headers, test_trip_data):
        """Test that removing trip owner is not allowed"""
        # Create a trip
        create_response = client.post(
            "/api/v1/trips/",
            json=test_trip_data,
            headers=auth_headers
        )
        trip_id = create_response.json()["id"]

        # Get current user to find owner_id
        me_response = client.get("/api/v1/auth/me", headers=auth_headers)
        owner_id = me_response.json()["id"]

        # Try to remove owner
        response = client.delete(
            f"/api/v1/trips/{trip_id}/members/{owner_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot remove trip owner" in response.json()["detail"]
