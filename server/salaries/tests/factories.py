"""Deterministic test factories.

No Faker/randomness here on purpose: tests should be fast and reproducible,
so every field a test cares about is either an explicit value or a simple
sequence, never a random draw.
"""

from datetime import date

import factory

from salaries.models import Department, Employee, SalaryChange


class DepartmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Department
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"Department {n}")


class EmployeeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Employee

    name = factory.Sequence(lambda n: f"Employee {n}")
    email = factory.Sequence(lambda n: f"employee{n}@example.com")
    department = factory.SubFactory(DepartmentFactory)
    country = "US"
    currency = "USD"
    base_salary = "60000.00"
    employment_status = Employee.EmploymentStatus.ACTIVE
    hire_date = date(2020, 1, 1)
    termination_date = None
    manager = None


class SalaryChangeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SalaryChange

    employee = factory.SubFactory(EmployeeFactory)
    old_salary = "60000.00"
    new_salary = "65000.00"
    currency = "USD"
    effective_date = date(2021, 1, 1)
    reason = "Annual raise"
