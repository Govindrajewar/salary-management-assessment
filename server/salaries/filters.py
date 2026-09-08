import django_filters

from .models import Employee


class EmployeeFilter(django_filters.FilterSet):
    department = django_filters.NumberFilter(field_name="department_id")
    country = django_filters.CharFilter(field_name="country", lookup_expr="iexact")
    currency = django_filters.CharFilter(field_name="currency", lookup_expr="iexact")
    employment_status = django_filters.CharFilter(field_name="employment_status", lookup_expr="iexact")
    salary_min = django_filters.NumberFilter(field_name="base_salary", lookup_expr="gte")
    salary_max = django_filters.NumberFilter(field_name="base_salary", lookup_expr="lte")

    class Meta:
        model = Employee
        fields = ["department", "country", "currency", "employment_status", "salary_min", "salary_max"]
