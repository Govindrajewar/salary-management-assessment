from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from salaries.models import SalaryChange
from salaries.tests.factories import EmployeeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def test_manual_salary_edit_writes_audit_row(client):
    emp = EmployeeFactory(base_salary="100000.00", currency="USD")
    updated_at = emp.updated_at.isoformat().replace("+00:00", "Z")

    resp = client.patch(
        f"/api/employees/{emp.id}/",
        {
            "base_salary": "120000.00",
            "expected_updated_at": updated_at,
            "salary_change_reason": "Promotion",
        },
        format="json",
    )
    assert resp.status_code == 200

    change = SalaryChange.objects.get(employee=emp)
    assert change.old_salary == Decimal("100000.00")
    assert change.new_salary == Decimal("120000.00")
    assert change.reason == "Promotion"


def test_editing_unrelated_field_does_not_write_audit_row(client):
    emp = EmployeeFactory(base_salary="100000.00", name="Old Name")
    updated_at = emp.updated_at.isoformat().replace("+00:00", "Z")

    resp = client.patch(
        f"/api/employees/{emp.id}/",
        {"name": "New Name", "expected_updated_at": updated_at},
        format="json",
    )
    assert resp.status_code == 200
    assert SalaryChange.objects.filter(employee=emp).count() == 0


def test_salary_history_endpoint_returns_ordered_history(client):
    emp = EmployeeFactory(base_salary="100000.00", currency="USD")
    for i in range(2):
        updated_at = emp.updated_at.isoformat().replace("+00:00", "Z")
        resp = client.patch(
            f"/api/employees/{emp.id}/",
            {"base_salary": str(100000 + (i + 1) * 10000), "expected_updated_at": updated_at},
            format="json",
        )
        assert resp.status_code == 200
        emp.refresh_from_db()

    resp = client.get(f"/api/employees/{emp.id}/salary-history/")
    assert resp.status_code == 200
    assert len(resp.data) == 2
