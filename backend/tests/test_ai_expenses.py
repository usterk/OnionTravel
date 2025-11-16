"""
Tests for AI Expenses API endpoints and parser service
"""
import pytest
import base64
from unittest.mock import Mock, patch, MagicMock
from datetime import date
from decimal import Decimal

from app.schemas.ai_expense import ParsedExpenseData
from app.models.category import Category
from app.models.trip import Trip


# Mock currency API for all tests in this module
@pytest.fixture(autouse=True)
def mock_currency_fetch():
    """Auto-mock currency API for all tests in this module"""
    with patch('app.services.currency.CurrencyService.fetch_rate_from_api') as mock:
        mock.return_value = Decimal("1.0")
        yield mock


@pytest.fixture
def test_trip_with_categories(client, auth_headers, test_trip_data, db_session):
    """Create a trip with default categories for testing"""
    # Create trip
    response = client.post(
        "/api/v1/trips/",  # Note: trailing slash required
        headers=auth_headers,
        json=test_trip_data
    )
    assert response.status_code == 201, f"Failed to create trip: {response.json()}"
    trip = response.json()

    return trip


@pytest.fixture
def mock_audio_base64():
    """Mock base64 encoded audio data"""
    # Create a simple base64 string (simulating audio)
    return "data:audio/webm;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA"


class TestAIExpensesEndpoint:
    """Tests for POST /api/v1/trips/{trip_id}/expenses/voice-parse"""

    @patch('app.services.ai_expense_parser.AIExpenseParser.parse_expense_from_text')
    @patch('app.services.ai_expense_parser.AIExpenseParser.transcribe_audio')
    def test_parse_voice_expense_single_item(
        self,
        mock_transcribe,
        mock_parse,
        client,
        auth_headers,
        test_trip_with_categories,
        mock_audio_base64,
        db_session
    ):
        """Test creating single expense from voice input"""
        trip_id = test_trip_with_categories["id"]

        # Mock transcription
        mock_transcribe.return_value = "Lunch at restaurant for 50 USD"

        # Mock parsing - return single expense
        mock_parse.return_value = [
            ParsedExpenseData(
                title="Lunch at restaurant",
                amount=50.0,
                currency_code="USD",
                category_id=1,  # Will use first category from trip
                notes="Nice place",
                location="Downtown"
            )
        ]

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses/voice-parse",
            headers=auth_headers,
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1

        expense = data[0]
        assert expense["title"] == "Lunch at restaurant"
        assert expense["amount"] == 50.0
        assert expense["currency_code"] == "USD"
        assert expense["notes"] == "Nice place"
        assert expense["location"] == "Downtown"

        # Verify mocks were called
        mock_transcribe.assert_called_once()
        mock_parse.assert_called_once()

    @patch('app.services.ai_expense_parser.AIExpenseParser.parse_expense_from_text')
    @patch('app.services.ai_expense_parser.AIExpenseParser.transcribe_audio')
    def test_parse_voice_expense_multiple_items(
        self,
        mock_transcribe,
        mock_parse,
        client,
        auth_headers,
        test_trip_with_categories,
        mock_audio_base64
    ):
        """Test creating multiple expenses from voice input"""
        trip_id = test_trip_with_categories["id"]

        # Mock transcription
        mock_transcribe.return_value = "Milk for 5 PLN and bread for 3 PLN"

        # Mock parsing - return multiple expenses
        mock_parse.return_value = [
            ParsedExpenseData(
                title="Milk",
                amount=5.0,
                currency_code="PLN",
                category_id=1,
                notes=None,
                location="Biedronka"
            ),
            ParsedExpenseData(
                title="Bread",
                amount=3.0,
                currency_code="PLN",
                category_id=1,
                notes=None,
                location="Biedronka"
            )
        ]

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses/voice-parse",
            headers=auth_headers,
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

        # Check first expense
        assert data[0]["title"] == "Milk"
        assert data[0]["amount"] == 5.0
        assert data[0]["currency_code"] == "PLN"

        # Check second expense
        assert data[1]["title"] == "Bread"
        assert data[1]["amount"] == 3.0
        assert data[1]["currency_code"] == "PLN"

    @patch('app.services.ai_expense_parser.AIExpenseParser.transcribe_audio')
    def test_parse_voice_expense_transcription_failure(
        self,
        mock_transcribe,
        client,
        auth_headers,
        test_trip_with_categories,
        mock_audio_base64
    ):
        """Test handling transcription failure"""
        from app.services.ai_expense_parser import AIExpenseParserError

        trip_id = test_trip_with_categories["id"]

        # Mock transcription failure
        mock_transcribe.side_effect = AIExpenseParserError("Failed to transcribe audio")

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses/voice-parse",
            headers=auth_headers,
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        assert response.status_code == 400
        assert "Transcription failed" in response.json()["detail"]

    @patch('app.services.ai_expense_parser.AIExpenseParser.parse_expense_from_text')
    @patch('app.services.ai_expense_parser.AIExpenseParser.transcribe_audio')
    def test_parse_voice_expense_parsing_failure_with_retries(
        self,
        mock_transcribe,
        mock_parse,
        client,
        auth_headers,
        test_trip_with_categories,
        mock_audio_base64
    ):
        """Test handling parsing failure after all retries"""
        from app.services.ai_expense_parser import AIExpenseParserError

        trip_id = test_trip_with_categories["id"]

        # Mock transcription success
        mock_transcribe.return_value = "Some unclear text"

        # Mock parsing failure for all retries
        mock_parse.side_effect = AIExpenseParserError("Failed to parse expense")

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses/voice-parse",
            headers=auth_headers,
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        assert response.status_code == 400
        assert "Failed to parse expense after" in response.json()["detail"]
        # Should have tried 4 times (max_retries = 4)
        assert mock_parse.call_count == 4

    def test_parse_voice_expense_trip_not_found(
        self,
        client,
        auth_headers,
        mock_audio_base64
    ):
        """Test with non-existent trip"""
        response = client.post(
            "/api/v1/trips/99999/expenses/voice-parse",
            headers=auth_headers,
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        assert response.status_code == 404
        assert "Trip not found" in response.json()["detail"]

    def test_parse_voice_expense_unauthorized(
        self,
        client,
        test_trip_with_categories,
        mock_audio_base64
    ):
        """Test unauthorized access"""
        trip_id = test_trip_with_categories["id"]

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses/voice-parse",
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        assert response.status_code in [401, 403]

    @patch('app.services.ai_expense_parser.AIExpenseParser.parse_expense_from_text')
    @patch('app.services.ai_expense_parser.AIExpenseParser.transcribe_audio')
    def test_parse_voice_expense_no_category_fallback(
        self,
        mock_transcribe,
        mock_parse,
        client,
        auth_headers,
        test_trip_with_categories,
        mock_audio_base64
    ):
        """Test fallback to first category when AI doesn't return category_id"""
        trip_id = test_trip_with_categories["id"]

        mock_transcribe.return_value = "Some expense"

        # Mock parsing - return expense without category_id
        mock_parse.return_value = [
            ParsedExpenseData(
                title="Unknown expense",
                amount=10.0,
                currency_code="USD",
                category_id=None,  # No category matched
                notes=None,
                location=None
            )
        ]

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses/voice-parse",
            headers=auth_headers,
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert len(data) == 1
        # Should have assigned first category
        assert data[0]["category_id"] is not None

    @patch('app.api.v1.ai_expenses.get_ai_parser')
    def test_parse_voice_expense_ai_service_not_configured(
        self,
        mock_get_parser,
        client,
        auth_headers,
        test_trip_with_categories,
        mock_audio_base64
    ):
        """Test handling when AI service is not configured"""
        trip_id = test_trip_with_categories["id"]

        # Mock AI parser not available
        mock_get_parser.side_effect = ValueError("OPENAI_API_KEY environment variable not set")

        response = client.post(
            f"/api/v1/trips/{trip_id}/expenses/voice-parse",
            headers=auth_headers,
            json={
                "audio_base64": mock_audio_base64,
                "expense_date": "2025-07-05"
            }
        )

        # API returns 500 when AI service is not configured properly
        assert response.status_code == 500
        assert "AI service not configured" in response.json()["detail"]


class TestAIExpenseParser:
    """Tests for AIExpenseParser service"""

    @patch('app.services.ai_expense_parser.OpenAI')
    def test_transcribe_audio(self, mock_openai_class):
        """Test audio transcription"""
        from app.services.ai_expense_parser import AIExpenseParser

        # Mock OpenAI client
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        # Mock transcription response
        mock_transcription = Mock()
        mock_transcription.strip.return_value = "Lunch for 50 USD"
        mock_client.audio.transcriptions.create.return_value = mock_transcription

        # Create parser (with mocked settings)
        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            parser = AIExpenseParser()

        # Test transcription
        audio_b64 = "data:audio/webm;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA"
        result = parser.transcribe_audio(audio_b64)

        assert result == "Lunch for 50 USD"
        mock_client.audio.transcriptions.create.assert_called_once()

    @patch('app.services.ai_expense_parser.OpenAI')
    def test_parse_expense_from_text_single(self, mock_openai_class):
        """Test parsing single expense from text"""
        from app.services.ai_expense_parser import AIExpenseParser

        # Mock OpenAI client
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        # Mock chat completion response
        mock_response = Mock()
        mock_message = Mock()
        mock_message.content = '''
        {
            "expenses": [
                {
                    "title": "Lunch",
                    "amount": 50.0,
                    "currency_code": "USD",
                    "category_name": "Food & Dining",
                    "location": "Restaurant",
                    "notes": "Delicious"
                }
            ]
        }
        '''
        mock_choice = Mock()
        mock_choice.message = mock_message
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        # Create parser
        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            parser = AIExpenseParser()

        # Test parsing
        categories = [
            {"id": 1, "name": "Food & Dining", "color": "#FF0000"}
        ]
        result = parser.parse_expense_from_text(
            "Lunch for 50 USD",
            "USD",
            categories,
            retry_attempt=0
        )

        assert len(result) == 1
        assert result[0].title == "Lunch"
        assert result[0].amount == 50.0
        assert result[0].currency_code == "USD"
        assert result[0].category_id == 1

    @patch('app.services.ai_expense_parser.OpenAI')
    def test_parse_expense_from_text_multiple(self, mock_openai_class):
        """Test parsing multiple expenses from text"""
        from app.services.ai_expense_parser import AIExpenseParser

        # Mock OpenAI client
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        # Mock chat completion response with multiple expenses
        mock_response = Mock()
        mock_message = Mock()
        mock_message.content = '''
        {
            "expenses": [
                {
                    "title": "Milk",
                    "amount": 5.0,
                    "currency_code": "PLN",
                    "category_name": "Shopping",
                    "location": "Store",
                    "notes": null
                },
                {
                    "title": "Bread",
                    "amount": 3.0,
                    "currency_code": "PLN",
                    "category_name": "Shopping",
                    "location": "Store",
                    "notes": null
                }
            ]
        }
        '''
        mock_choice = Mock()
        mock_choice.message = mock_message
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        # Create parser
        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            parser = AIExpenseParser()

        # Test parsing
        categories = [
            {"id": 1, "name": "Shopping", "color": "#00FF00"}
        ]
        result = parser.parse_expense_from_text(
            "Milk for 5 PLN and bread for 3 PLN",
            "PLN",
            categories,
            retry_attempt=0
        )

        assert len(result) == 2
        assert result[0].title == "Milk"
        assert result[0].amount == 5.0
        assert result[1].title == "Bread"
        assert result[1].amount == 3.0

    @patch('app.services.ai_expense_parser.OpenAI')
    def test_parse_expense_category_matching(self, mock_openai_class):
        """Test category name matching to category ID"""
        from app.services.ai_expense_parser import AIExpenseParser

        # Mock OpenAI client
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client

        # Mock response with category name
        mock_response = Mock()
        mock_message = Mock()
        mock_message.content = '''
        {
            "expenses": [
                {
                    "title": "Taxi",
                    "amount": 20.0,
                    "currency_code": "USD",
                    "category_name": "Transportation",
                    "location": null,
                    "notes": null
                }
            ]
        }
        '''
        mock_choice = Mock()
        mock_choice.message = mock_message
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create.return_value = mock_response

        # Create parser
        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            parser = AIExpenseParser()

        # Test with multiple categories
        categories = [
            {"id": 1, "name": "Food & Dining", "color": "#FF0000"},
            {"id": 2, "name": "Transportation", "color": "#00FF00"},
            {"id": 3, "name": "Shopping", "color": "#0000FF"}
        ]
        result = parser.parse_expense_from_text(
            "Taxi for 20 USD",
            "USD",
            categories,
            retry_attempt=0
        )

        assert len(result) == 1
        assert result[0].category_id == 2  # Should match Transportation

    def test_extract_json_from_response(self):
        """Test JSON extraction from response"""
        from app.services.ai_expense_parser import AIExpenseParser

        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            parser = AIExpenseParser()

        # Test with markdown code block
        response_with_markdown = '''```json
        {
            "expenses": [{"title": "Test", "amount": 10.0}]
        }
        ```'''

        result = parser._extract_json_from_response(response_with_markdown)
        assert "expenses" in result
        assert len(result["expenses"]) == 1

        # Test with plain JSON
        response_plain = '{"expenses": [{"title": "Test", "amount": 10.0}]}'
        result = parser._extract_json_from_response(response_plain)
        assert "expenses" in result

    def test_match_category(self):
        """Test category name matching"""
        from app.services.ai_expense_parser import AIExpenseParser

        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            parser = AIExpenseParser()

        categories = [
            {"id": 1, "name": "Food & Dining", "color": "#FF0000"},
            {"id": 2, "name": "Transportation", "color": "#00FF00"},
        ]

        # Test exact match
        assert parser._match_category("Food & Dining", categories) == 1

        # Test case-insensitive match
        assert parser._match_category("food & dining", categories) == 1

        # Test partial match
        assert parser._match_category("Food", categories) == 1
        assert parser._match_category("Transport", categories) == 2

        # Test no match - should return first category
        assert parser._match_category("Unknown", categories) == 1

    def test_get_ai_parser_singleton(self):
        """Test that get_ai_parser returns singleton instance"""
        from app.services.ai_expense_parser import get_ai_parser

        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"

            parser1 = get_ai_parser()
            parser2 = get_ai_parser()

            # Should be same instance
            assert parser1 is parser2

    def test_ai_parser_init_without_api_key(self):
        """Test that AIExpenseParser raises error without API key"""
        from app.services.ai_expense_parser import AIExpenseParser

        with patch('app.services.ai_expense_parser.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = None

            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                AIExpenseParser()
