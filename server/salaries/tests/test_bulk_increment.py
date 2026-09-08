from decimal import Decimal
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from salaries.models import Employee, SalaryChange
from salaries.tests.factories import DepartmentFactory, EmployeeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def test_dry_run_does_not_persist_changes(client):
    eng = DepartmentFactory(name="Engineering")
    emp = EmployeeFactory(department=eng, base_salary="100000.00")

    resp = client.post(
        "/api/salary/bulk-increment/",
        {"department": eng.id, "percent": 10, "dry_run": True},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["dry_run"] is True
    assert resp.data["affected_count"] == 1
    assert resp.data["preview"][0]["new_salary"] == 110000.0

    emp.refresh_from_db()
    assert emp.base_salary == Decimal("100000.00")
    assert SalaryChange.objects.filter(employee=emp).count() == 0


def test_real_commit_updates_salary_and_writes_audit_row(client):
    eng = DepartmentFactory(name="Engineering")
    emp = EmployeeFactory(department=eng, base_salary="100000.00", currency="USD")

    resp = client.post(
        "/api/salary/bulk-increment/",
        {"department": eng.id, "percent": 10, "reason": "Annual raise", "dry_run": False},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["dry_run"] is False

    emp.refresh_from_db()
    assert emp.base_salary == Decimal("110000.00")

    change = SalaryChange.objects.get(employee=emp)
    assert change.old_salary == Decimal("100000.00")
    assert change.new_salary == Decimal("110000.00")
    assert change.reason == "Annual raise"


def test_only_active_employees_are_affected(client):
    eng = DepartmentFactory(name="Engineering")
    EmployeeFactory(
        department=eng, base_salary="100000.00",
        employment_status=Employee.EmploymentStatus.TERMINATED, termination_date="2022-01-01",
    )

    resp = client.post(
        "/api/salary/bulk-increment/",
        {"department": eng.id, "percent": 10, "dry_run": True},
        format="json",
    )
    # No active employees in scope: nothing to preview or apply.
    assert resp.status_code == 404


def test_requires_department_or_country_scope(client):
    resp = client.post("/api/salary/bulk-increment/", {"percent": 10, "dry_run": True}, format="json")
    assert resp.status_code == 400


def test_rejects_percent_out_of_bounds(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post(
        "/api/salary/bulk-increment/",
        {"department": eng.id, "percent": 500, "dry_run": True},
        format="json",
    )
    assert resp.status_code == 400


def test_partial_failure_rolls_back_the_whole_batch(client):
    """If writing the audit trail fails partway through, no employee's salary
    should end up changed - the commit is all-or-nothing.
    """
    eng = DepartmentFactory(name="Engineering")
    emp1 = EmployeeFactory(department=eng, base_salary="100000.00")
    emp2 = EmployeeFactory(department=eng, base_salary="120000.00")

    with patch("salaries.views.SalaryChange.objects.bulk_create", side_effect=RuntimeError("boom")):
        with pytest.raises(RuntimeError):
            client.post(
                "/api/salary/bulk-increment/",
                {"department": eng.id, "percent": 10, "dry_run": False},
                format="json",
            )

    emp1.refresh_from_db()
    emp2.refresh_from_db()
    assert emp1.base_salary == Decimal("100000.00")
    assert emp2.base_salary == Decimal("120000.00")
    assert SalaryChange.objects.count() == 0
