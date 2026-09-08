from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BulkSalaryIncrementView,
    DashboardStatsView,
    DepartmentViewSet,
    EmployeeViewSet,
    HealthCheckView,
)

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employee")
router.register("departments", DepartmentViewSet, basename="department")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("salary/bulk-increment/", BulkSalaryIncrementView.as_view(), name="bulk-increment"),
]
