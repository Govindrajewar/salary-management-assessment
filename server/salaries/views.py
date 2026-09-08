import csv
import statistics
from datetime import date

from django.db import connection, transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import EmployeeFilter
from .models import Department, Employee, SalaryChange
from .serializers import (
    DepartmentSerializer,
    EmployeeSerializer,
    EmployeeWriteSerializer,
    SalaryChangeSerializer,
)

EXPORT_FIELDS = [
    "id",
    "name",
    "email",
    "department_name",
    "country",
    "currency",
    "base_salary",
    "employment_status",
    "hire_date",
    "termination_date",
    "manager_name",
]


class HealthCheckView(APIView):
    """Used by Render's health check and for manual uptime probes."""

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as exc:
            return Response(
                {"status": "error", "database": "unreachable", "detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "ok", "database": "ok"})


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    pagination_class = None


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department", "manager").all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmployeeFilter
    search_fields = ["name", "email"]
    ordering_fields = ["name", "base_salary", "hire_date", "department__name", "country"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EmployeeWriteSerializer
        return EmployeeSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        expected = request.data.get("expected_updated_at")
        if expected is not None:
            expected_dt = parse_datetime(expected)
            if expected_dt is None or expected_dt != instance.updated_at:
                return Response(
                    {"detail": "This record was changed by someone else since you loaded it. Refresh and retry."},
                    status=status.HTTP_409_CONFLICT,
                )
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        old_salary = self.get_object().base_salary
        reason = serializer.validated_data.pop("salary_change_reason", "")
        instance = serializer.save()
        if instance.base_salary != old_salary:
            SalaryChange.objects.create(
                employee=instance,
                old_salary=old_salary,
                new_salary=instance.base_salary,
                currency=instance.currency,
                effective_date=date.today(),
                reason=reason or "Manual edit",
            )

    def perform_create(self, serializer):
        serializer.validated_data.pop("salary_change_reason", None)
        instance = serializer.save()
        SalaryChange.objects.create(
            employee=instance,
            old_salary=instance.base_salary,
            new_salary=instance.base_salary,
            currency=instance.currency,
            effective_date=instance.hire_date,
            reason="Initial hire",
        )

    @action(detail=True, methods=["get"], url_path="salary-history")
    def salary_history(self, request, pk=None):
        employee = self.get_object()
        history = employee.salary_history.all()
        return Response(SalaryChangeSerializer(history, many=True).data)

    @action(detail=False, methods=["get"])
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="employees.csv"'
        writer = csv.writer(response)
        writer.writerow(EXPORT_FIELDS)
        for emp in queryset.iterator(chunk_size=1000):
            writer.writerow(
                [
                    emp.id,
                    emp.name,
                    emp.email,
                    emp.department.name,
                    emp.country,
                    emp.currency,
                    emp.base_salary,
                    emp.employment_status,
                    emp.hire_date,
                    emp.termination_date or "",
                    emp.manager.name if emp.manager else "",
                ]
            )
        return response


def _median(values):
    return float(statistics.median(values)) if values else None


class DashboardStatsView(APIView):
    """Pay analytics, always segmented by currency: averaging across currencies
    without a live FX rate would misrepresent what people are actually paid.
    """

    def get(self, request):
        include_terminated = request.query_params.get("include_terminated", "false").lower() == "true"
        qs = Employee.objects.all()
        if not include_terminated:
            qs = qs.filter(employment_status=Employee.EmploymentStatus.ACTIVE)

        by_department = self._grouped_stats(qs, ["department__name", "currency"])
        by_country = self._grouped_stats(qs, ["country", "currency"])

        return Response({"by_department": by_department, "by_country": by_country})

    def _grouped_stats(self, qs, group_fields):
        rows = qs.values(*group_fields, "base_salary").order_by(*group_fields)
        buckets = {}
        for row in rows:
            key = tuple(row[f] for f in group_fields)
            buckets.setdefault(key, []).append(row["base_salary"])

        results = []
        for key, salaries in buckets.items():
            entry = dict(zip(group_fields, key))
            entry.update(
                {
                    "count": len(salaries),
                    "avg": round(float(sum(salaries)) / len(salaries), 2),
                    "median": round(_median(salaries), 2),
                    "min": float(min(salaries)),
                    "max": float(max(salaries)),
                }
            )
            results.append(entry)
        return results


class BulkSalaryIncrementView(APIView):
    """Percent-based raise scoped to a department or country.

    Always supports dry_run so a fat-fingered percent doesn't silently
    apply to hundreds of employees; the real commit is one DB transaction
    so a mid-batch failure rolls back everything instead of half-applying.
    """

    def post(self, request):
        department_id = request.data.get("department")
        country = request.data.get("country")
        percent = request.data.get("percent")
        reason = request.data.get("reason", "Bulk increment")
        dry_run = request.data.get("dry_run", True)

        if not department_id and not country:
            return Response(
                {"detail": "Provide department or country to scope the increment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            percent = float(percent)
        except (TypeError, ValueError):
            return Response({"detail": "percent must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        if percent <= -100 or percent > 100:
            return Response(
                {"detail": "percent must be greater than -100 and at most 100."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Employee.objects.filter(employment_status=Employee.EmploymentStatus.ACTIVE)
        if department_id:
            qs = qs.filter(department_id=department_id)
        if country:
            qs = qs.filter(country__iexact=country)

        employees = list(qs)
        if not employees:
            return Response({"detail": "No matching active employees."}, status=status.HTTP_404_NOT_FOUND)

        preview = []
        for emp in employees:
            new_salary = round(float(emp.base_salary) * (1 + percent / 100), 2)
            preview.append(
                {
                    "id": emp.id,
                    "name": emp.name,
                    "currency": emp.currency,
                    "old_salary": float(emp.base_salary),
                    "new_salary": new_salary,
                }
            )

        if dry_run:
            return Response({"dry_run": True, "affected_count": len(preview), "preview": preview})

        today = date.today()
        with transaction.atomic():
            changes = []
            now = timezone.now()
            for emp, row in zip(employees, preview):
                emp.base_salary = row["new_salary"]
                emp.updated_at = now
                changes.append(
                    SalaryChange(
                        employee=emp,
                        old_salary=row["old_salary"],
                        new_salary=row["new_salary"],
                        currency=emp.currency,
                        effective_date=today,
                        reason=reason,
                    )
                )
            Employee.objects.bulk_update(employees, ["base_salary", "updated_at"])
            SalaryChange.objects.bulk_create(changes)

        return Response({"dry_run": False, "affected_count": len(preview), "preview": preview})
