import csv
import io

import pytest
from rest_framework.test import APIClient

from salaries.tests.factories import DepartmentFactory, EmployeeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def test_export_returns_csv_with_header_and_rows(client):
    eng = DepartmentFactory(name="Engineering")
    EmployeeFactory(name="Alice", email="alice@example.com", department=eng)
    EmployeeFactory(name="Bob", email="bob@example.com", department=eng)

    resp = client.get("/api/employees/export/")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "text/csv"

    rows = list(csv.reader(io.StringIO(resp.content.decode())))
    assert rows[0] == [
        "id", "name", "email", "department_name", "country", "currency",
        "base_salary", "employment_status", "hire_date", "termination_date", "manager_name",
    ]
    assert len(rows) == 3  # header + 2 employees
    names = {row[1] for row in rows[1:]}
    assert names == {"Alice", "Bob"}


def test_export_respects_active_filters(client):
    eng = DepartmentFactory(name="Engineering")
    sales = DepartmentFactory(name="Sales")
    EmployeeFactory(name="Alice", email="alice@example.com", department=eng)
    EmployeeFactory(name="Carla", email="carla@example.com", department=sales)

    resp = client.get(f"/api/employees/export/?department={eng.id}")
    rows = list(csv.reader(io.StringIO(resp.content.decode())))
    assert len(rows) == 2
    assert rows[1][1] == "Alice"
