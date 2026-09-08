import pytest
from rest_framework.test import APIClient

from salaries.models import Employee
from salaries.tests.factories import DepartmentFactory, EmployeeFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def seeded():
    eng = DepartmentFactory(name="Engineering")
    sales = DepartmentFactory(name="Sales")
    EmployeeFactory(
        name="Alice Active", email="alice@example.com", department=eng, country="US",
        currency="USD", base_salary="90000.00", employment_status=Employee.EmploymentStatus.ACTIVE,
    )
    EmployeeFactory(
        name="Bob Terminated", email="bob@example.com", department=eng, country="US",
        currency="USD", base_salary="70000.00", employment_status=Employee.EmploymentStatus.TERMINATED,
        termination_date="2022-06-01",
    )
    EmployeeFactory(
        name="Carla Sales", email="carla@example.com", department=sales, country="GB",
        currency="GBP", base_salary="50000.00", employment_status=Employee.EmploymentStatus.ACTIVE,
    )
    return {"eng": eng, "sales": sales}


def test_filter_by_department(client, seeded):
    resp = client.get(f"/api/employees/?department={seeded['eng'].id}")
    assert resp.status_code == 200
    assert resp.data["count"] == 2


def test_filter_by_employment_status(client, seeded):
    resp = client.get("/api/employees/?employment_status=terminated")
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["name"] == "Bob Terminated"


def test_filter_by_country_and_currency(client, seeded):
    resp = client.get("/api/employees/?country=gb&currency=gbp")
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["name"] == "Carla Sales"


def test_filter_by_salary_range(client, seeded):
    resp = client.get("/api/employees/?salary_min=60000&salary_max=95000")
    names = {row["name"] for row in resp.data["results"]}
    assert names == {"Alice Active", "Bob Terminated"}


def test_search_by_name(client, seeded):
    resp = client.get("/api/employees/?search=Carla")
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["email"] == "carla@example.com"


def test_search_by_email(client, seeded):
    resp = client.get("/api/employees/?search=bob@example.com")
    assert resp.data["count"] == 1


def test_combined_filters_return_empty_for_no_match(client, seeded):
    resp = client.get("/api/employees/?department={}&employment_status=terminated&country=gb".format(
        seeded["eng"].id
    ))
    assert resp.data["count"] == 0


def test_pagination_page_size_and_navigation(client, seeded):
    resp = client.get("/api/employees/?page=1")
    assert resp.data["count"] == 3
    assert resp.data["previous"] is None


def test_pagination_out_of_range_page_returns_404(client, seeded):
    resp = client.get("/api/employees/?page=999")
    assert resp.status_code == 404
