import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_health_check_returns_ok():
    client = APIClient()
    resp = client.get("/api/health/")
    assert resp.status_code == 200
    assert resp.data == {"status": "ok", "database": "ok"}
