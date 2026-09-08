from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from salaries.tests.factories import EmployeeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def test_patch_with_matching_expected_updated_at_succeeds(client):
    emp = EmployeeFactory(base_salary="100000.00")
    updated_at = emp.updated_at.isoformat().replace("+00:00", "Z")

    resp = client.patch(
        f"/api/employees/{emp.id}/",
        {"base_salary": "105000.00", "expected_updated_at": updated_at},
        format="json",
    )
    assert resp.status_code == 200
    emp.refresh_from_db()
    assert emp.base_salary == Decimal("105000.00")


def test_patch_with_stale_expected_updated_at_returns_409(client):
    emp = EmployeeFactory(base_salary="100000.00")
    stale_timestamp = "2000-01-01T00:00:00Z"

    resp = client.patch(
        f"/api/employees/{emp.id}/",
        {"base_salary": "999999.00", "expected_updated_at": stale_timestamp},
        format="json",
    )
    assert resp.status_code == 409
    emp.refresh_from_db()
    assert emp.base_salary == Decimal("100000.00")


def test_patch_without_expected_updated_at_is_allowed(client):
    """No version supplied means the caller isn't opting into the conflict
    check (e.g. an internal script) - documents current, intentional behavior.
    """
    emp = EmployeeFactory(base_salary="100000.00")
    resp = client.patch(f"/api/employees/{emp.id}/", {"base_salary": "111000.00"}, format="json")
    assert resp.status_code == 200
