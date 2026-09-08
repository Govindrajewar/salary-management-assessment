import pytest
from rest_framework.test import APIClient

from salaries.models import Employee
from salaries.tests.factories import DepartmentFactory, EmployeeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def test_stats_are_segmented_by_currency_not_merged(client):
    eng = DepartmentFactory(name="Engineering")
    EmployeeFactory(department=eng, country="US", currency="USD", base_salary="100000.00")
    EmployeeFactory(department=eng, country="IN", currency="INR", base_salary="2000000.00")

    resp = client.get("/api/dashboard/stats/")
    assert resp.status_code == 200

    by_department = resp.data["by_department"]
    currencies_for_engineering = {
        row["currency"] for row in by_department if row["department__name"] == "Engineering"
    }
    assert currencies_for_engineering == {"USD", "INR"}
    # each currency bucket only has its own employee, never averaged together
    for row in by_department:
        if row["department__name"] == "Engineering":
            assert row["count"] == 1


def test_stats_aggregate_values(client):
    eng = DepartmentFactory(name="Engineering")
    for salary in ["50000.00", "60000.00", "70000.00", "80000.00"]:
        EmployeeFactory(department=eng, country="US", currency="USD", base_salary=salary)

    resp = client.get("/api/dashboard/stats/")
    row = next(
        r for r in resp.data["by_department"]
        if r["department__name"] == "Engineering" and r["currency"] == "USD"
    )
    assert row["count"] == 4
    assert row["avg"] == 65000.0
    assert row["median"] == 65000.0
    assert row["min"] == 50000.0
    assert row["max"] == 80000.0


def test_stats_exclude_terminated_by_default(client):
    eng = DepartmentFactory(name="Engineering")
    EmployeeFactory(
        department=eng, country="US", currency="USD", base_salary="100000.00",
        employment_status=Employee.EmploymentStatus.TERMINATED, termination_date="2022-01-01",
    )

    resp = client.get("/api/dashboard/stats/")
    assert resp.data["by_department"] == []


def test_stats_include_terminated_when_requested(client):
    eng = DepartmentFactory(name="Engineering")
    EmployeeFactory(
        department=eng, country="US", currency="USD", base_salary="100000.00",
        employment_status=Employee.EmploymentStatus.TERMINATED, termination_date="2022-01-01",
    )

    resp = client.get("/api/dashboard/stats/?include_terminated=true")
    assert len(resp.data["by_department"]) == 1


def test_stats_grouped_by_country_too(client):
    eng = DepartmentFactory(name="Engineering")
    EmployeeFactory(department=eng, country="US", currency="USD", base_salary="100000.00")
    EmployeeFactory(department=eng, country="GB", currency="GBP", base_salary="80000.00")

    resp = client.get("/api/dashboard/stats/")
    countries = {row["country"] for row in resp.data["by_country"]}
    assert countries == {"US", "GB"}
