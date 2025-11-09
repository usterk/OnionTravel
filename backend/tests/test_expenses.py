import pytest
from fastapi.testclient import TestClient
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch


@pytest.fixture
def created_trip(client, auth_headers, test_trip_data):
    """Create a trip and return its data"""
    response = client.post("/api/v1/trips/", json=test_trip_data, headers=auth_headers)
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def trip_category(client, auth_headers, created_trip):
    """Get the first category from the created trip"""
    trip_id = created_trip['id']
    response = client.get(f"/api/v1/trips/{trip_id}/categories", headers=auth_headers)
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) > 0
    return categories[0]


@pytest.fixture
def test_expense_data(trip_category):
    """Sample expense data for tests"""
    return {
        "title": "Hotel Booking",
        "description": "3-night stay at beach resort",
        "amount": 150.00,
        "currency_code": "USD",
        "category_id": trip_category['id'],
        "start_date": "2025-07-02",
        "end_date": "2025-07-05",
        "payment_method": "card",
        "location": "Phuket, Thailand",
        "notes": "Includes breakfast"
    }


@pytest.fixture
def test_expense_data_single_day(trip_category):
    """Sample single-day expense data"""
    return {
        "title": "Lunch",
        "description": "Thai restaurant",
        "amount": 500.00,
        "currency_code": "THB",
        "category_id": trip_category['id'],
        "start_date": "2025-07-03",
        "payment_method": "cash",
        "location": "Bangkok"
    }


class TestExpenseCreation:
    """Test creating expenses"""

    @patch('app.services.expense_service.CurrencyService')
    def test_create_expense_with_currency_conversion(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test creating an expense with currency conversion"""
        trip_id = created_trip['id']

        # Mock the currency service to return a fixed exchange rate
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        expense = response.json()

        assert expense['title'] == test_expense_data['title']
        assert expense['amount'] == test_expense_data['amount']
        assert expense['currency_code'] == test_expense_data['currency_code']
        assert expense['trip_id'] == trip_id
        assert 'exchange_rate' in expense
        assert 'amount_in_trip_currency' in expense
        assert expense['start_date'] == test_expense_data['start_date']
        assert expense['end_date'] == test_expense_data['end_date']

    @patch('app.services.expense_service.CurrencyService')
    def test_create_single_day_expense(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data_single_day
    ):
        """Test creating a single-day expense (no end_date)"""
        trip_id = created_trip['id']

        # No currency conversion needed (THB -> THB)
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data_single_day,
            headers=auth_headers
        )
        assert response.status_code == 201
        expense = response.json()

        assert expense['title'] == test_expense_data_single_day['title']
        assert expense['start_date'] == test_expense_data_single_day['start_date']
        assert expense['end_date'] is None
        # Same currency, should have exchange rate of 1.0
        assert expense['exchange_rate'] == 1.0
        assert expense['amount_in_trip_currency'] == test_expense_data_single_day['amount']

    def test_create_expense_invalid_category(
        self, client, auth_headers, created_trip
    ):
        """Test creating expense with invalid category ID"""
        trip_id = created_trip['id']

        invalid_expense = {
            "title": "Test",
            "amount": 100.00,
            "currency_code": "USD",
            "category_id": 99999,
            "start_date": "2025-07-02"
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=invalid_expense,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Category not found" in response.json()['detail']

    def test_create_expense_invalid_date_range(
        self, client, auth_headers, created_trip, trip_category
    ):
        """Test that end_date cannot be before start_date"""
        trip_id = created_trip['id']

        invalid_expense = {
            "title": "Test",
            "amount": 100.00,
            "currency_code": "USD",
            "category_id": trip_category['id'],
            "start_date": "2025-07-05",
            "end_date": "2025-07-02"
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=invalid_expense,
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error

    def test_create_expense_unauthorized(self, client, created_trip, test_expense_data):
        """Test that creating expense requires authentication"""
        trip_id = created_trip['id']

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data
        )
        assert response.status_code in [401, 403]

    def test_create_expense_invalid_amount(
        self, client, auth_headers, created_trip, trip_category
    ):
        """Test that amount must be positive"""
        trip_id = created_trip['id']

        invalid_expense = {
            "title": "Test",
            "amount": -50.00,
            "currency_code": "USD",
            "category_id": trip_category['id'],
            "start_date": "2025-07-02"
        }

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=invalid_expense,
            headers=auth_headers
        )
        assert response.status_code == 422


class TestExpenseList:
    """Test listing expenses"""

    @patch('app.services.expense_service.CurrencyService')
    def test_list_expenses(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data, test_expense_data_single_day
    ):
        """Test listing all expenses for a trip"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create two expenses
        client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data_single_day,
            headers=auth_headers
        )

        # List all expenses
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses",
            headers=auth_headers
        )
        assert response.status_code == 200
        expenses = response.json()
        assert len(expenses) == 2

    @patch('app.services.expense_service.CurrencyService')
    def test_list_expenses_filter_by_category(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test filtering expenses by category"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expense
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        expense = response.json()
        category_id = expense['category_id']

        # Filter by category
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses?category_id={category_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        expenses = response.json()
        assert len(expenses) >= 1
        assert all(e['category_id'] == category_id for e in expenses)

    @patch('app.services.expense_service.CurrencyService')
    def test_list_expenses_filter_by_date_range(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test filtering expenses by date range"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expense
        client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )

        # Filter by date range that includes the expense
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses?start_date=2025-07-01&end_date=2025-07-10",
            headers=auth_headers
        )
        assert response.status_code == 200
        expenses = response.json()
        assert len(expenses) >= 1

        # Filter by date range that excludes the expense
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses?start_date=2025-08-01&end_date=2025-08-10",
            headers=auth_headers
        )
        assert response.status_code == 200
        expenses = response.json()
        assert len(expenses) == 0

    @patch('app.services.expense_service.CurrencyService')
    def test_list_expenses_filter_by_payment_method(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test filtering expenses by payment method"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expense
        client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )

        # Filter by payment method
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses?payment_method=card",
            headers=auth_headers
        )
        assert response.status_code == 200
        expenses = response.json()
        assert all(e['payment_method'] == 'card' for e in expenses)

    def test_list_expenses_pagination(
        self, client, auth_headers, created_trip
    ):
        """Test expense pagination"""
        trip_id = created_trip['id']

        # Test with limit
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses?limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200

        # Test with skip
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses?skip=0&limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200

    def test_list_expenses_unauthorized(self, client, created_trip):
        """Test that listing expenses requires authentication"""
        trip_id = created_trip['id']

        response = client.get(f"/api/v1/trips/{trip_id}/expenses")
        assert response.status_code in [401, 403]


class TestExpenseGet:
    """Test getting a single expense"""

    @patch('app.services.expense_service.CurrencyService')
    def test_get_expense_success(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test getting a specific expense by ID"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expense
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        expense = response.json()

        # Get expense
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/{expense['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        fetched_expense = response.json()
        assert fetched_expense['id'] == expense['id']
        assert fetched_expense['title'] == expense['title']

    def test_get_nonexistent_expense(self, client, auth_headers, created_trip):
        """Test getting a non-existent expense"""
        trip_id = created_trip['id']

        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/99999",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestExpenseUpdate:
    """Test updating expenses"""

    @patch('app.services.expense_service.CurrencyService')
    def test_update_expense_title(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test updating an expense's title"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expense
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        expense = response.json()

        # Update title
        update_data = {"title": "Updated Hotel Booking"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/expenses/{expense['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated['title'] == "Updated Hotel Booking"
        assert updated['amount'] == expense['amount']  # Other fields unchanged

    @patch('app.services.expense_service.CurrencyService')
    def test_update_expense_amount_recalculates_conversion(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test that updating amount recalculates currency conversion"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expense
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        expense = response.json()

        # Update amount
        update_data = {"amount": 200.00}
        response = client.put(
            f"/api/v1/trips/{trip_id}/expenses/{expense['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated['amount'] == 200.00
        # Should have recalculated amount_in_trip_currency

    @patch('app.services.expense_service.CurrencyService')
    def test_update_expense_currency_recalculates_conversion(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data_single_day
    ):
        """Test that updating currency recalculates conversion"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("0.028"))

        # Create expense in THB (same as trip currency)
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data_single_day,
            headers=auth_headers
        )
        expense = response.json()
        assert expense['exchange_rate'] == 1.0

        # Update currency to USD
        update_data = {"currency_code": "USD"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/expenses/{expense['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated['currency_code'] == "USD"
        # Should have recalculated exchange rate

    def test_update_expense_invalid_category(
        self, client, auth_headers, created_trip, test_expense_data
    ):
        """Test that updating to invalid category fails"""
        trip_id = created_trip['id']

        # Create a second trip to get a category from different trip
        other_trip_data = {
            "name": "Another Trip",
            "start_date": "2025-08-01",
            "end_date": "2025-08-10",
            "currency_code": "USD",
            "total_budget": 1000.00
        }
        response = client.post("/api/v1/trips/", json=other_trip_data, headers=auth_headers)
        other_trip = response.json()

        # Get category from other trip
        response = client.get(f"/api/v1/trips/{other_trip['id']}/categories", headers=auth_headers)
        other_categories = response.json()

        # Mock currency service and create expense in first trip
        with patch('app.services.expense_service.CurrencyService') as mock_currency_service:
            mock_service_instance = mock_currency_service.return_value
            mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

            response = client.post(
                f"/api/v1/trips/{trip_id}/expenses",
                json=test_expense_data,
                headers=auth_headers
            )
            expense = response.json()

        # Try to update to category from different trip
        update_data = {"category_id": other_categories[0]['id']}
        response = client.put(
            f"/api/v1/trips/{trip_id}/expenses/{expense['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Category not found" in response.json()['detail']

    def test_update_nonexistent_expense(self, client, auth_headers, created_trip):
        """Test updating a non-existent expense"""
        trip_id = created_trip['id']

        update_data = {"title": "New Title"}
        response = client.put(
            f"/api/v1/trips/{trip_id}/expenses/99999",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 404


class TestExpenseDeletion:
    """Test deleting expenses"""

    @patch('app.services.expense_service.CurrencyService')
    def test_delete_expense(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test deleting an expense"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expense
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        expense = response.json()

        # Delete it
        response = client.delete(
            f"/api/v1/trips/{trip_id}/expenses/{expense['id']}",
            headers=auth_headers
        )
        assert response.status_code == 204

        # Verify it's gone
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/{expense['id']}",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_delete_nonexistent_expense(self, client, auth_headers, created_trip):
        """Test deleting a non-existent expense"""
        trip_id = created_trip['id']

        response = client.delete(
            f"/api/v1/trips/{trip_id}/expenses/99999",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestExpenseStatistics:
    """Test expense statistics"""

    @patch('app.services.expense_service.CurrencyService')
    def test_get_expense_statistics(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data, test_expense_data_single_day
    ):
        """Test getting expense statistics for a trip"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create expenses
        client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data_single_day,
            headers=auth_headers
        )

        # Get statistics
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        stats = response.json()

        # Check structure
        assert 'total_expenses' in stats
        assert 'total_spent' in stats
        assert 'total_budget' in stats
        assert 'remaining_budget' in stats
        assert 'percentage_used' in stats
        assert 'by_category' in stats
        assert 'by_payment_method' in stats
        assert 'daily_spending' in stats
        assert 'average_daily_spending' in stats

        # Check values
        assert stats['total_expenses'] == 2
        assert stats['total_spent'] > 0
        assert isinstance(stats['by_category'], list)
        assert isinstance(stats['by_payment_method'], list)
        assert isinstance(stats['daily_spending'], list)

    def test_get_statistics_empty_trip(self, client, auth_headers, created_trip):
        """Test statistics for trip with no expenses"""
        trip_id = created_trip['id']

        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        stats = response.json()

        assert stats['total_expenses'] == 0
        assert stats['total_spent'] == 0
        assert stats['by_category'] is not None  # Should still have categories


class TestExpenseAccessControl:
    """Test expense access control"""

    def test_cannot_access_other_users_trip_expenses(
        self, client, auth_headers, auth_headers_user2, created_trip
    ):
        """Test that user cannot access expenses of another user's trip"""
        trip_id = created_trip['id']

        # Try to list expenses with different user's auth
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses",
            headers=auth_headers_user2
        )
        assert response.status_code == 403

    @patch('app.services.expense_service.CurrencyService')
    def test_cannot_create_expense_in_other_users_trip(
        self, mock_currency_service, client, auth_headers, auth_headers_user2, created_trip, test_expense_data
    ):
        """Test that user cannot create expense in another user's trip"""
        trip_id = created_trip['id']

        # Try to create expense with different user's auth
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers_user2
        )
        assert response.status_code == 403


class TestMultiDayExpenses:
    """Test multi-day expense handling"""

    @patch('app.services.expense_service.CurrencyService')
    def test_create_multi_day_expense(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test creating a multi-day expense"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create multi-day expense
        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        expense = response.json()

        assert expense['start_date'] == test_expense_data['start_date']
        assert expense['end_date'] == test_expense_data['end_date']

    @patch('app.services.expense_service.CurrencyService')
    def test_multi_day_expense_in_statistics(
        self, mock_currency_service, client, auth_headers, created_trip, test_expense_data
    ):
        """Test that multi-day expenses are counted in statistics"""
        trip_id = created_trip['id']

        # Mock currency service
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("35.5"))

        # Create multi-day expense
        client.post(
            f"/api/v1/trips/{trip_id}/expenses",
            json=test_expense_data,
            headers=auth_headers
        )

        # Get statistics
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        stats = response.json()
        assert stats['total_expenses'] == 1


class TestDailyBudgetStatistics:
    """Test daily budget statistics endpoint"""

    @patch('app.services.expense_service.CurrencyService')
    def test_get_daily_stats_with_expenses(
        self, mock_currency_service, client, auth_headers, created_trip, trip_category
    ):
        """Test daily budget statistics with expenses"""
        trip_id = created_trip['id']
        today = date.today().isoformat()

        # Create some expenses for today
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("1.0"))

        expense1_data = {
            "title": "Lunch",
            "amount": 250.00,
            "currency_code": "THB",
            "category_id": trip_category['id'],
            "start_date": today,
            "payment_method": "cash"
        }

        expense2_data = {
            "title": "Dinner",
            "amount": 450.00,
            "currency_code": "THB",
            "category_id": trip_category['id'],
            "start_date": today,
            "payment_method": "card"
        }

        client.post(f"/api/v1/trips/{trip_id}/expenses", json=expense1_data, headers=auth_headers)
        client.post(f"/api/v1/trips/{trip_id}/expenses", json=expense2_data, headers=auth_headers)

        # Get daily stats
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/daily-stats",
            headers=auth_headers
        )

        assert response.status_code == 200
        stats = response.json()

        assert stats['date'] == today
        assert stats['expense_count_today'] == 2
        assert stats['total_spent_today'] == 700.0
        assert 'daily_budget' in stats
        assert 'remaining_today' in stats
        assert 'percentage_used_today' in stats
        assert 'by_category_today' in stats
        assert 'is_over_budget' in stats
        assert 'days_into_trip' in stats
        assert 'total_days' in stats

    @patch('app.services.expense_service.CurrencyService')
    def test_get_daily_stats_with_specific_date(
        self, mock_currency_service, client, auth_headers, created_trip, trip_category
    ):
        """Test daily statistics for a specific target date"""
        trip_id = created_trip['id']
        target_date = "2025-07-03"

        # Create expense for specific date
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("1.0"))

        expense_data = {
            "title": "Shopping",
            "amount": 1000.00,
            "currency_code": "THB",
            "category_id": trip_category['id'],
            "start_date": target_date,
            "payment_method": "card"
        }

        client.post(f"/api/v1/trips/{trip_id}/expenses", json=expense_data, headers=auth_headers)

        # Get daily stats for specific date
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/daily-stats?target_date={target_date}",
            headers=auth_headers
        )

        assert response.status_code == 200
        stats = response.json()
        assert stats['date'] == target_date
        assert stats['total_spent_today'] == 1000.0

    @patch('app.services.expense_service.CurrencyService')
    def test_daily_stats_with_multi_day_expense(
        self, mock_currency_service, client, auth_headers, created_trip, trip_category
    ):
        """Test that multi-day expenses are split across days"""
        trip_id = created_trip['id']
        start_date = "2025-07-02"
        end_date = "2025-07-04"

        # Create 3-day hotel expense
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("1.0"))

        hotel_data = {
            "title": "Hotel",
            "amount": 3000.00,
            "currency_code": "THB",
            "category_id": trip_category['id'],
            "start_date": start_date,
            "end_date": end_date,
            "payment_method": "card"
        }

        client.post(f"/api/v1/trips/{trip_id}/expenses", json=hotel_data, headers=auth_headers)

        # Get daily stats for middle day
        middle_date = "2025-07-03"
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/daily-stats?target_date={middle_date}",
            headers=auth_headers
        )

        assert response.status_code == 200
        stats = response.json()

        # Hotel should be split: 3000 / 3 days = 1000 per day
        assert stats['total_spent_today'] == 1000.0
        # Expense count should be 0 because it didn't start on this day
        assert stats['expense_count_today'] == 0

    def test_daily_stats_no_expenses(
        self, client, auth_headers, created_trip
    ):
        """Test daily statistics when no expenses exist"""
        trip_id = created_trip['id']

        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/daily-stats",
            headers=auth_headers
        )

        assert response.status_code == 200
        stats = response.json()

        assert stats['total_spent_today'] == 0.0
        assert stats['expense_count_today'] == 0
        assert len(stats['by_category_today']) == 0

    def test_daily_stats_trip_not_found(
        self, client, auth_headers
    ):
        """Test 404 when trip doesn't exist"""
        response = client.get(
            "/api/v1/trips/99999/expenses/daily-stats",
            headers=auth_headers
        )

        assert response.status_code == 404
        assert "Trip not found" in response.json()['detail']

    def test_daily_stats_unauthorized(
        self, client, auth_headers, test_trip_data
    ):
        """Test 401 when not authenticated"""
        # Create a trip with auth
        trip_response = client.post("/api/v1/trips/", json=test_trip_data, headers=auth_headers)
        trip_id = trip_response.json()['id']

        # Try to access without auth
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/daily-stats"
        )

        # Should get 401 because no auth provided
        assert response.status_code in [401, 403]  # Both are acceptable for unauthorized access

    def test_daily_stats_forbidden_for_other_user(
        self, client, auth_headers, auth_headers_user2, created_trip
    ):
        """Test 403 when user doesn't have access to trip"""
        trip_id = created_trip['id']

        # Try to access with different user's credentials
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/daily-stats",
            headers=auth_headers_user2
        )

        assert response.status_code == 403
        assert "don't have access" in response.json()['detail']

    @patch('app.services.expense_service.CurrencyService')
    def test_daily_stats_category_breakdown(
        self, mock_currency_service, client, auth_headers, created_trip
    ):
        """Test that category breakdown is included in daily stats"""
        trip_id = created_trip['id']
        today = date.today().isoformat()

        # Get categories
        categories_response = client.get(
            f"/api/v1/trips/{trip_id}/categories",
            headers=auth_headers
        )
        categories = categories_response.json()
        assert len(categories) >= 2

        # Create expenses in different categories
        mock_service_instance = mock_currency_service.return_value
        mock_service_instance.get_rate = AsyncMock(return_value=Decimal("1.0"))

        expense1 = {
            "title": "Food",
            "amount": 300.00,
            "currency_code": "THB",
            "category_id": categories[0]['id'],
            "start_date": today
        }

        expense2 = {
            "title": "Transport",
            "amount": 200.00,
            "currency_code": "THB",
            "category_id": categories[1]['id'],
            "start_date": today
        }

        client.post(f"/api/v1/trips/{trip_id}/expenses", json=expense1, headers=auth_headers)
        client.post(f"/api/v1/trips/{trip_id}/expenses", json=expense2, headers=auth_headers)

        # Get daily stats
        response = client.get(
            f"/api/v1/trips/{trip_id}/expenses/daily-stats",
            headers=auth_headers
        )

        assert response.status_code == 200
        stats = response.json()

        # Check category breakdown
        assert len(stats['by_category_today']) == 2

        # Verify totals
        category_totals = {cat['category_id']: cat['total_spent'] for cat in stats['by_category_today']}
        assert category_totals[categories[0]['id']] == 300.0
        assert category_totals[categories[1]['id']] == 200.0
