import pytest
from django.core.management import call_command

from salaries.models import Department, Employee, SalaryChange

pytestmark = pytest.mark.django_db


def test_seed_command_creates_requested_count_with_departments_and_history():
    call_command("seed_employees", count=200)

    assert Employee.objects.count() == 200
    assert Department.objects.count() == 8
    assert SalaryChange.objects.count() == 200  # one initial-hire row per employee
    assert Employee.objects.values("email").distinct().count() == 200


def test_seed_command_is_deterministic():
    call_command("seed_employees", count=50, flush=True)
    first_names = list(Employee.objects.order_by("id").values_list("name", flat=True))

    call_command("seed_employees", count=50, flush=True)
    second_names = list(Employee.objects.order_by("id").values_list("name", flat=True))

    assert first_names == second_names
