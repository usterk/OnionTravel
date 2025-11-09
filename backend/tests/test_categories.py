import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def created_trip(client, auth_headers, test_trip_data):
    """Create a trip and return its data"""
    response = client.post("/api/v1/trips/", json=test_trip_data, headers=auth_headers)
    assert response.status_code == 201
    return response.json()


class TestCategoryDefaultsCreation:
    """Test default categories initialization"""

    def test_default_categories_created_on_trip_creation(self, client, auth_headers, test_trip_data):
        """Test that 8 default categories are created when a trip is created"""
        # Create trip
        response = client.post("/api/v1/trips/", json=test_trip_data, headers=auth_headers)
        assert response.status_code == 201
        trip = response.json()

        # Get categories
        response = client.get(f"/api/v1/trips/{trip['id']}/categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()

        # Should have 8 default categories
        assert len(categories) == 8

        # Check default category names
        category_names = {cat['name'] for cat in categories}
        expected_names = {
            "Accommodation", "Transportation", "Food & Dining", "Activities",
            "Shopping", "Health & Medical", "Entertainment", "Other"
        }
        assert category_names == expected_names

        # All should be marked as default
        assert all(cat['is_default'] for cat in categories)

    def test_default_categories_have_correct_budget_percentages(self, client, auth_headers, created_trip):
        """Test that default categories have the correct budget percentages"""
        trip_id = created_trip['id']

        # Get categories
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()

        # Create a dict for easy lookup
        cat_dict = {cat['name']: cat for cat in categories}

        # Verify budget percentages
        assert cat_dict['Accommodation']['budget_percentage'] == 35.0
        assert cat_dict['Transportation']['budget_percentage'] == 20.0
        assert cat_dict['Food & Dining']['budget_percentage'] == 25.0
        assert cat_dict['Activities']['budget_percentage'] == 15.0
        assert cat_dict['Shopping']['budget_percentage'] == 5.0
        assert cat_dict['Health & Medical']['budget_percentage'] == 0.0
        assert cat_dict['Entertainment']['budget_percentage'] == 0.0
        assert cat_dict['Other']['budget_percentage'] == 0.0

        # Total should be 100%
        total = sum(cat['budget_percentage'] for cat in categories)
        assert total == 100.0

    def test_default_categories_have_colors_and_icons(self, client, auth_headers, created_trip):
        """Test that default categories have colors and icons"""
        trip_id = created_trip['id']

        # Get categories
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()

        for category in categories:
            # All should have color (hex format)
            assert category['color']
            assert category['color'].startswith('#')
            assert len(category['color']) == 7

            # All should have icon
            assert category['icon']


class TestCategoryList:
    """Test listing categories"""

    def test_list_categories_success(self, client, auth_headers, created_trip):
        """Test successfully listing categories for a trip"""
        trip_id = created_trip['id']

        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()

        assert isinstance(categories, list)
        assert len(categories) == 8  # 8 default categories

    def test_list_categories_unauthorized(self, client, created_trip):
        """Test that listing categories requires authentication"""
        trip_id = created_trip['id']

        response = client.get(f"/api/v1/trips/{trip_id}/categories")
        # Returns 403 because the trip exists but user is not authenticated
        assert response.status_code in [401, 403]

    def test_list_categories_nonexistent_trip(self, client, auth_headers):
        """Test listing categories for a non-existent trip"""
        response = client.get("/api/v1/trips/99999/categories", headers=auth_headers)
        assert response.status_code == 404

    def test_list_categories_with_stats(self, client, auth_headers, created_trip):
        """Test listing categories with statistics"""
        trip_id = created_trip['id']

        response = client.get(f"/api/v1/trips/{trip_id}/categories/stats", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()

        assert isinstance(categories, list)
        assert len(categories) == 8

        # Check that stats are included
        for category in categories:
            assert 'total_spent' in category
            assert 'allocated_budget' in category
            assert 'remaining_budget' in category
            assert 'percentage_used' in category


class TestCategoryCreation:
    """Test creating custom categories"""

    def test_create_category_success(self, client, auth_headers, created_trip):
        """Test successfully creating a custom category"""
        trip_id = created_trip['id']

        new_category = {
            "name": "Coffee & Snacks",
            "color": "#8B4513",
            "icon": "coffee",
            "budget_percentage": 0.0
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/categories",
            json=new_category,
            headers=auth_headers
        )
        assert response.status_code == 201
        category = response.json()

        assert category['name'] == new_category['name']
        assert category['color'] == new_category['color']
        assert category['icon'] == new_category['icon']
        assert category['budget_percentage'] == new_category['budget_percentage']
        assert category['is_default'] is False
        assert category['trip_id'] == trip_id

    def test_create_category_exceeds_budget(self, client, auth_headers, created_trip):
        """Test that creating a category that would exceed 100% budget fails"""
        trip_id = created_trip['id']

        # Try to create a category with 5% when we already have 100%
        new_category = {
            "name": "Extra Category",
            "color": "#000000",
            "icon": "star",
            "budget_percentage": 5.0
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/categories",
            json=new_category,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "exceed 100%" in response.json()['detail']

    def test_create_category_invalid_color(self, client, auth_headers, created_trip):
        """Test that creating a category with invalid color format fails"""
        trip_id = created_trip['id']

        new_category = {
            "name": "Test Category",
            "color": "red",  # Invalid: should be hex
            "icon": "star",
            "budget_percentage": 0.0
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/categories",
            json=new_category,
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error

    def test_create_category_invalid_percentage(self, client, auth_headers, created_trip):
        """Test that creating a category with invalid percentage fails"""
        trip_id = created_trip['id']

        # Try with negative percentage
        new_category = {
            "name": "Test Category",
            "color": "#000000",
            "icon": "star",
            "budget_percentage": -5.0
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/categories",
            json=new_category,
            headers=auth_headers
        )
        assert response.status_code == 422

        # Try with percentage > 100
        new_category['budget_percentage'] = 150.0
        response = client.post(
            f"/api/v1/trips/{trip_id}/categories",
            json=new_category,
            headers=auth_headers
        )
        assert response.status_code == 422

    def test_create_category_unauthorized(self, client, created_trip):
        """Test that creating a category requires authentication"""
        trip_id = created_trip['id']

        new_category = {
            "name": "Test Category",
            "color": "#000000",
            "icon": "star",
            "budget_percentage": 0.0
        }

        response = client.post(f"/api/v1/trips/{trip_id}/categories", json=new_category)
        # Returns 403 because the trip exists but user is not authenticated
        assert response.status_code in [401, 403]


class TestCategoryUpdate:
    """Test updating categories"""

    def test_update_category_name(self, client, auth_headers, created_trip):
        """Test updating a category's name"""
        trip_id = created_trip['id']

        # Get a category
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()
        category = categories[0]

        # Update name
        update_data = {"name": "Updated Name"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated['name'] == "Updated Name"
        assert updated['color'] == category['color']  # Other fields unchanged

    def test_update_category_color(self, client, auth_headers, created_trip):
        """Test updating a category's color"""
        trip_id = created_trip['id']

        # Get a category
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()
        category = categories[0]

        # Update color
        update_data = {"color": "#FF00FF"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated['color'] == "#FF00FF"

    def test_update_category_icon(self, client, auth_headers, created_trip):
        """Test updating a category's icon"""
        trip_id = created_trip['id']

        # Get a category
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()
        category = categories[0]

        # Update icon
        update_data = {"icon": "new-icon"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated['icon'] == "new-icon"

    def test_update_category_budget_percentage(self, client, auth_headers, created_trip):
        """Test updating a category's budget percentage"""
        trip_id = created_trip['id']

        # Get a category with 0% budget
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()
        category = next(cat for cat in categories if cat['budget_percentage'] == 0)

        # Update budget percentage (we have room since it's 0%)
        update_data = {"budget_percentage": 0.0}  # Keep it at 0 to not exceed 100%
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200

    def test_update_category_exceeds_budget(self, client, auth_headers, created_trip):
        """Test that updating a category to exceed 100% total budget fails"""
        trip_id = created_trip['id']

        # Get a category
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()
        category = categories[0]

        # Try to update to a percentage that would exceed 100%
        # Current total is 100%, so changing any category to 100% would exceed
        update_data = {"budget_percentage": 100.0}
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "exceed 100%" in response.json()['detail']

    def test_update_nonexistent_category(self, client, auth_headers, created_trip):
        """Test updating a non-existent category"""
        trip_id = created_trip['id']

        update_data = {"name": "New Name"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/99999",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 404


class TestCategoryDeletion:
    """Test deleting categories"""

    def test_delete_custom_category(self, client, auth_headers, created_trip):
        """Test deleting a custom category"""
        trip_id = created_trip['id']

        # Create a custom category
        new_category = {
            "name": "Test Category",
            "color": "#000000",
            "icon": "star",
            "budget_percentage": 0.0
        }
        response = client.post(
            f"/api/v1/trips/{trip_id}/categories",
            json=new_category,
            headers=auth_headers
        )
        assert response.status_code == 201
        category = response.json()

        # Delete it
        response = client.delete(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            headers=auth_headers
        )
        assert response.status_code == 204

        # Verify it's gone
        response = client.get(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_delete_default_category(self, client, auth_headers, created_trip):
        """Test deleting a default category (should work if no expenses)"""
        trip_id = created_trip['id']

        # Get a default category
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()
        category = categories[0]

        # Delete it (should work since no expenses)
        response = client.delete(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            headers=auth_headers
        )
        assert response.status_code == 204

    def test_delete_nonexistent_category(self, client, auth_headers, created_trip):
        """Test deleting a non-existent category"""
        trip_id = created_trip['id']

        response = client.delete(
            f"/api/v1/trips/{trip_id}/categories/99999",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestCategoryGet:
    """Test getting a single category"""

    def test_get_category_success(self, client, auth_headers, created_trip):
        """Test getting a specific category by ID"""
        trip_id = created_trip['id']

        # Get all categories
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()
        category = categories[0]

        # Get specific category
        response = client.get(
            f"/api/v1/trips/{trip_id}/categories/{category['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        fetched_category = response.json()
        assert fetched_category['id'] == category['id']
        assert fetched_category['name'] == category['name']

    def test_get_nonexistent_category(self, client, auth_headers, created_trip):
        """Test getting a non-existent category"""
        trip_id = created_trip['id']

        response = client.get(
            f"/api/v1/trips/{trip_id}/categories/99999",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestBudgetPercentageValidation:
    """Test budget percentage validation"""

    def test_total_budget_percentage_calculation(self, client, auth_headers, created_trip):
        """Test that total budget percentage is calculated correctly"""
        trip_id = created_trip['id']

        # Get categories
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()

        # Calculate total
        total = sum(cat['budget_percentage'] for cat in categories)
        assert total == 100.0

    def test_cannot_create_category_exceeding_100_percent(self, client, auth_headers, created_trip):
        """Test that creating a category that would exceed 100% fails"""
        trip_id = created_trip['id']

        # Already at 100%, so adding any more should fail
        new_category = {
            "name": "Extra",
            "color": "#000000",
            "icon": "star",
            "budget_percentage": 1.0
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/categories",
            json=new_category,
            headers=auth_headers
        )
        assert response.status_code == 400

    def test_can_adjust_percentages_within_100(self, client, auth_headers, created_trip):
        """Test that we can adjust percentages as long as total stays within 100%"""
        trip_id = created_trip['id']

        # Get a category with allocation
        response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
        categories = response.json()

        # Find Accommodation (35%) and Shopping (5%)
        accommodation = next(cat for cat in categories if cat['name'] == 'Accommodation')
        shopping = next(cat for cat in categories if cat['name'] == 'Shopping')

        # Reduce Accommodation by 5%
        update_data = {"budget_percentage": 30.0}
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/{accommodation['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200

        # Now we can increase Shopping by 5%
        update_data = {"budget_percentage": 10.0}
        response = client.put(
            f"/api/v1/trips/{trip_id}/categories/{shopping['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200


class TestCategoryAccessControl:
    """Test category access control"""

    def test_cannot_access_other_users_trip_categories(
        self, client, auth_headers, auth_headers_user2, created_trip
    ):
        """Test that user cannot access categories of another user's trip"""
        trip_id = created_trip['id']

        # Try to get categories with different user's auth
        response = client.get(
            f"/api/v1/trips/{trip_id}/categories",
            headers=auth_headers_user2
        )
        assert response.status_code == 403
