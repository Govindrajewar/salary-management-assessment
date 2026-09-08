import pytest
from rest_framework.test import APIClient

from salaries.models import Employee, SalaryChange
from salaries.tests.factories import DepartmentFactory, EmployeeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def valid_payload(department_id, **overrides):
    payload = {
        "name": "New Hire",
        "email": "new.hire@example.com",
        "department": department_id,
        "country": "us",
        "currency": "usd",
        "base_salary": "80000.00",
        "employment_status": "active",
        "hire_date": "2024-01-01",
    }
    payload.update(overrides)
    return payload


def test_create_employee_normalizes_country_and_currency_case(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post("/api/employees/", valid_payload(eng.id), format="json")
    assert resp.status_code == 201
    assert resp.data["country"] == "US"
    assert resp.data["currency"] == "USD"


def test_create_employee_writes_initial_hire_audit_row(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post("/api/employees/", valid_payload(eng.id), format="json")
    assert resp.status_code == 201
    employee_id = resp.data["id"]
    change = SalaryChange.objects.get(employee_id=employee_id)
    assert change.reason == "Initial hire"
    assert change.old_salary == change.new_salary


def test_create_rejects_negative_salary(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post("/api/employees/", valid_payload(eng.id, base_salary="-1"), format="json")
    assert resp.status_code == 400


def test_create_rejects_invalid_country_code_length(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post("/api/employees/", valid_payload(eng.id, country="USA"), format="json")
    assert resp.status_code == 400


def test_create_rejects_invalid_currency_code_length(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post("/api/employees/", valid_payload(eng.id, currency="US"), format="json")
    assert resp.status_code == 400


def test_create_rejects_duplicate_email_with_400_not_500(client):
    eng = DepartmentFactory(name="Engineering")
    EmployeeFactory(email="new.hire@example.com", department=eng)
    resp = client.post("/api/employees/", valid_payload(eng.id), format="json")
    assert resp.status_code == 400


def test_terminated_status_requires_termination_date(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post(
        "/api/employees/", valid_payload(eng.id, employment_status="terminated"), format="json"
    )
    assert resp.status_code == 400


def test_active_status_rejects_termination_date(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post(
        "/api/employees/",
        valid_payload(eng.id, employment_status="active", termination_date="2024-06-01"),
        format="json",
    )
    assert resp.status_code == 400


def test_termination_date_before_hire_date_rejected(client):
    eng = DepartmentFactory(name="Engineering")
    resp = client.post(
        "/api/employees/",
        valid_payload(
            eng.id,
            employment_status="terminated",
            hire_date="2024-06-01",
            termination_date="2024-01-01",
        ),
        format="json",
    )
    assert resp.status_code == 400


def test_employee_cannot_be_own_manager(client):
    emp = EmployeeFactory()
    updated_at = emp.updated_at.isoformat().replace("+00:00", "Z")
    resp = client.patch(
        f"/api/employees/{emp.id}/",
        {"manager": emp.id, "expected_updated_at": updated_at},
        format="json",
    )
    assert resp.status_code == 400


def test_delete_employee(client):
    emp = EmployeeFactory()
    resp = client.delete(f"/api/employees/{emp.id}/")
    assert resp.status_code == 204
    assert not Employee.objects.filter(id=emp.id).exists()
