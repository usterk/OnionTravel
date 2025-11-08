import pytest


class TestMainEndpoints:
    """Tests for main application endpoints"""

    def test_root_endpoint(self, client):
        """Test root endpoint returns correct message"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "status" in data
        assert data["message"] == "OnionTravel API"
        assert data["status"] == "running"

    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_docs_endpoint_exists(self, client):
        """Test that OpenAPI docs endpoint is available"""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_json_endpoint(self, client):
        """Test OpenAPI JSON schema endpoint"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data
        assert data["info"]["title"] == "OnionTravel API"
