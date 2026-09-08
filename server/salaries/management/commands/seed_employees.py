import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from faker import Faker

from salaries.models import Department, Employee, SalaryChange

SEED = 42
TOTAL_EMPLOYEES = 10_000
BATCH_SIZE = 1_000

DEPARTMENTS = [
    "Engineering",
    "Sales",
    "Marketing",
    "Finance",
    "Human Resources",
    "Operations",
    "Legal",
    "Customer Support",
]

# country -> (currency, monthly-equivalent base salary range in that currency's own scale)
COUNTRIES = {
    "US": ("USD", (55_000, 220_000)),
    "GB": ("GBP", (30_000, 150_000)),
    "DE": ("EUR", (40_000, 160_000)),
    "FR": ("EUR", (35_000, 150_000)),
    "IN": ("INR", (400_000, 4_500_000)),
    "CA": ("CAD", (50_000, 200_000)),
    "AU": ("AUD", (55_000, 210_000)),
    "JP": ("JPY", (4_000_000, 18_000_000)),
    "BR": ("BRL", (60_000, 400_000)),
    "SG": ("SGD", (45_000, 200_000)),
}

TERMINATED_RATIO = 0.05
NO_MANAGER_EXTRA_RATIO = 0.02  # beyond the natural department-head nulls
EXTREME_LOW_RATIO = 0.005
EXTREME_HIGH_RATIO = 0.005


class Command(BaseCommand):
    help = "Seed the database with a deterministic set of employees for local/dev use."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count", type=int, default=TOTAL_EMPLOYEES, help="Number of employees to seed."
        )
        parser.add_argument(
            "--flush", action="store_true", help="Delete existing employees/departments first."
        )

    def handle(self, *args, **options):
        count = options["count"]
        random.seed(SEED)
        fake = Faker()
        Faker.seed(SEED)

        if options["flush"]:
            self.stdout.write("Flushing existing SalaryChange/Employee/Department rows...")
            SalaryChange.objects.all().delete()
            Employee.objects.all().delete()
            Department.objects.all().delete()

        departments = [Department.objects.get_or_create(name=name)[0] for name in DEPARTMENTS]
        country_codes = list(COUNTRIES.keys())
        today = date.today()

        self.stdout.write(f"Seeding {count} employees...")

        emails_seen = set(Employee.objects.values_list("email", flat=True))
        rows = []
        salary_changes = []
        per_department_head_assigned = set()

        for i in range(count):
            # Independent random draws, not i % len(...) round-robin: department and
            # country counts share a common factor (gcd(8, 10) = 2), so cycling both
            # off the same loop counter correlates them by parity - each department
            # would only ever pair with half the countries. random.choice() (seeded,
            # so still deterministic) avoids that.
            department = random.choice(departments)
            country = random.choice(country_codes)
            currency, (low, high) = COUNTRIES[country]

            first = fake.first_name()
            last = fake.last_name()
            email = f"{first}.{last}.{i}@example.com".lower()
            while email in emails_seen:
                email = f"{first}.{last}.{i}.{random.randint(1000, 9999)}@example.com".lower()
            emails_seen.add(email)

            hire_date = today - timedelta(days=random.randint(30, 365 * 12))

            roll = random.random()
            if roll < EXTREME_LOW_RATIO:
                base_salary = round(low * 0.4, 2)
            elif roll < EXTREME_LOW_RATIO + EXTREME_HIGH_RATIO:
                base_salary = round(high * 1.5, 2)
            else:
                base_salary = round(random.uniform(low, high), 2)

            is_terminated = random.random() < TERMINATED_RATIO and hire_date < today - timedelta(days=60)
            termination_date = None
            employment_status = Employee.EmploymentStatus.ACTIVE
            if is_terminated:
                employment_status = Employee.EmploymentStatus.TERMINATED
                termination_date = hire_date + timedelta(
                    days=random.randint(30, (today - hire_date).days)
                )

            manager_key = department.id
            if manager_key not in per_department_head_assigned:
                per_department_head_assigned.add(manager_key)
                manager = None
            elif random.random() < NO_MANAGER_EXTRA_RATIO:
                manager = None
            else:
                manager = None  # resolved to a real manager in the second pass below

            rows.append(
                Employee(
                    name=f"{first} {last}",
                    email=email,
                    department=department,
                    country=country,
                    currency=currency,
                    base_salary=base_salary,
                    employment_status=employment_status,
                    hire_date=hire_date,
                    termination_date=termination_date,
                    manager=manager,
                )
            )

            if len(rows) >= BATCH_SIZE:
                self._flush_batch(rows)
                rows = []

        if rows:
            self._flush_batch(rows)

        self._assign_managers(departments)
        self._seed_initial_salary_history()

        self.stdout.write(self.style.SUCCESS(f"Seeded {Employee.objects.count()} employees."))

    def _flush_batch(self, rows):
        with transaction.atomic():
            Employee.objects.bulk_create(rows, batch_size=BATCH_SIZE)
        self.stdout.write(f"  ...{Employee.objects.count()} employees so far")

    def _assign_managers(self, departments):
        """Second pass: point each non-head employee at another active employee in the
        same department who was hired earlier (a plausible manager), skipping those
        deliberately left without a manager.
        """
        random.seed(SEED + 1)
        for department in departments:
            employees = list(
                Employee.objects.filter(department=department, manager__isnull=True).order_by(
                    "hire_date"
                )
            )
            if len(employees) < 2:
                continue
            head, *rest = employees
            to_update = []
            for emp in rest:
                if random.random() < NO_MANAGER_EXTRA_RATIO:
                    continue  # stays manager-less on purpose
                emp.manager_id = head.id
                to_update.append(emp)
            if to_update:
                Employee.objects.bulk_update(to_update, ["manager"], batch_size=BATCH_SIZE)

    def _seed_initial_salary_history(self):
        """Give every employee a single 'hired at base salary' audit row so the
        history view is never empty for a freshly seeded record.
        """
        changes = [
            SalaryChange(
                employee=emp,
                old_salary=emp.base_salary,
                new_salary=emp.base_salary,
                currency=emp.currency,
                effective_date=emp.hire_date,
                reason="Initial hire",
            )
            for emp in Employee.objects.only(
                "id", "base_salary", "currency", "hire_date"
            ).iterator(chunk_size=BATCH_SIZE)
        ]
        SalaryChange.objects.bulk_create(changes, batch_size=BATCH_SIZE)
