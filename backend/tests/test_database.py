import pytest
from app.database import get_db, Base, engine


class TestDatabase:
    """Tests for database configuration and utilities"""

    def test_get_db_generator(self):
        """Test get_db dependency returns a database session"""
        db_gen = get_db()
        db = next(db_gen)

        assert db is not None
        # Should be able to execute queries
        from app.models.user import User
        result = db.query(User).count()
        assert result >= 0

        # Close the generator
        try:
            next(db_gen)
        except StopIteration:
            pass  # Expected behavior

    def test_database_tables_exist(self):
        """Test that all tables are created"""
        # Get all table names
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        expected_tables = [
            "users",
            "trips",
            "trip_users",
            "categories",
            "expenses",
            "attachments",
            "exchange_rates"
        ]

        for table in expected_tables:
            assert table in tables, f"Table {table} not found in database"

    def test_base_metadata_tables(self):
        """Test Base.metadata contains all model tables"""
        assert len(Base.metadata.tables) > 0
        assert "users" in Base.metadata.tables
        assert "trips" in Base.metadata.tables
        assert "expenses" in Base.metadata.tables
