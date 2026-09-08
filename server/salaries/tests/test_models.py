from datetime import date

import pytest
from django.db import IntegrityError, transaction

from salaries.models import Employee
from salaries.tests.factories import DepartmentFactory, EmployeeFactory

pytestmark = pytest.mark.django_db


def test_negative_salary_rejected_at_db_level():
    department = DepartmentFactory()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            EmployeeFactory(department=department, base_salary="-1.00")


def test_termination_before_hire_rejected_at_db_level():
    department = DepartmentFactory()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            EmployeeFactory(
                department=department,
                hire_date=date(2022, 1, 1),
                termination_date=date(2021, 1, 1),
                employment_status=Employee.EmploymentStatus.TERMINATED,
            )


def test_duplicate_email_rejected_at_db_level():
    EmployeeFactory(email="dup@example.com")
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            EmployeeFactory(email="dup@example.com")


def test_zero_salary_is_allowed():
    employee = EmployeeFactory(base_salary="0.00")
    employee.refresh_from_db()
    assert employee.base_salary == 0


def test_manager_can_be_null():
    employee = EmployeeFactory(manager=None)
    assert employee.manager is None


def test_manager_self_reference_allowed_by_db_but_is_a_serializer_concern():
    # The model layer doesn't forbid self-management (no DB constraint for it);
    # that check lives in the API serializer instead, tested in test_api.py.
    employee = EmployeeFactory()
    employee.manager = employee
    employee.save()
    employee.refresh_from_db()
    assert employee.manager_id == employee.id
