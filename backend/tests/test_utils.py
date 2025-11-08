import pytest
from app.utils.defaults import DEFAULT_CATEGORIES


class TestDefaultCategories:
    """Tests for default categories configuration"""

    def test_default_categories_exist(self):
        """Test that default categories are defined"""
        assert DEFAULT_CATEGORIES is not None
        assert len(DEFAULT_CATEGORIES) > 0

    def test_default_categories_count(self):
        """Test that we have 8 default categories"""
        assert len(DEFAULT_CATEGORIES) == 8

    def test_all_categories_have_required_fields(self):
        """Test that all categories have required fields"""
        required_fields = ["name", "color", "icon", "budget_percentage", "is_default"]

        for category in DEFAULT_CATEGORIES:
            for field in required_fields:
                assert field in category, f"Category missing field: {field}"

    def test_category_colors_are_valid_hex(self):
        """Test that all colors are valid hex colors"""
        import re
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')

        for category in DEFAULT_CATEGORIES:
            assert hex_pattern.match(category["color"]), \
                f"Invalid hex color: {category['color']} for {category['name']}"

    def test_category_names(self):
        """Test that expected category names exist"""
        category_names = [cat["name"] for cat in DEFAULT_CATEGORIES]

        expected_names = [
            "Accommodation",
            "Transportation",
            "Food & Dining",
            "Activities",
            "Shopping",
            "Health & Medical",
            "Entertainment",
            "Other"
        ]

        for name in expected_names:
            assert name in category_names, f"Missing expected category: {name}"

    def test_budget_percentages_are_valid(self):
        """Test that budget percentages are within 0-100%"""
        for category in DEFAULT_CATEGORIES:
            percentage = category["budget_percentage"]
            assert 0 <= percentage <= 100, \
                f"Invalid percentage {percentage} for {category['name']}"

    def test_all_categories_marked_as_default(self):
        """Test that all default categories have is_default=True"""
        for category in DEFAULT_CATEGORIES:
            assert category["is_default"] is True

    def test_total_budget_percentage(self):
        """Test that total budget percentages equal 100%"""
        total = sum(cat["budget_percentage"] for cat in DEFAULT_CATEGORIES)
        assert total == 100.0, f"Total budget percentage is {total}, expected 100.0"

    def test_category_icons_are_strings(self):
        """Test that all icons are non-empty strings"""
        for category in DEFAULT_CATEGORIES:
            assert isinstance(category["icon"], str)
            assert len(category["icon"]) > 0

    def test_specific_category_values(self):
        """Test specific values for key categories"""
        # Find Accommodation category
        accommodation = next((c for c in DEFAULT_CATEGORIES if c["name"] == "Accommodation"), None)
        assert accommodation is not None
        assert accommodation["budget_percentage"] == 35.0
        assert accommodation["color"] == "#3B82F6"
        assert accommodation["icon"] == "home"

        # Find Food & Dining category
        food = next((c for c in DEFAULT_CATEGORIES if c["name"] == "Food & Dining"), None)
        assert food is not None
        assert food["budget_percentage"] == 25.0
