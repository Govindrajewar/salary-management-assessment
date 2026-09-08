from django.core.validators import MinValueValidator
from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Employee(models.Model):
    class EmploymentStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        TERMINATED = "terminated", "Terminated"

    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="employees")
    country = models.CharField(max_length=2, help_text="ISO 3166-1 alpha-2 country code")
    currency = models.CharField(max_length=3, help_text="ISO 4217 currency code")
    base_salary = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    employment_status = models.CharField(
        max_length=20, choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE
    )
    hire_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    manager = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="reports"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["department"]),
            models.Index(fields=["country"]),
            models.Index(fields=["employment_status"]),
            models.Index(fields=["currency"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(base_salary__gte=0), name="employee_base_salary_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(termination_date__isnull=True)
                | models.Q(termination_date__gte=models.F("hire_date")),
                name="employee_termination_after_hire",
            ),
        ]

    def __str__(self):
        return f"{self.name} <{self.email}>"


class SalaryChange(models.Model):
    """Append-only audit trail. Never update or delete rows here."""

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="salary_history")
    old_salary = models.DecimalField(max_digits=12, decimal_places=2)
    new_salary = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3)
    effective_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_date", "-created_at"]

    def __str__(self):
        return f"{self.employee_id}: {self.old_salary} -> {self.new_salary} ({self.effective_date})"
