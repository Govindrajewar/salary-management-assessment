from rest_framework import serializers

from .models import Department, Employee, SalaryChange


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name"]


class SalaryChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryChange
        fields = ["id", "old_salary", "new_salary", "currency", "effective_date", "reason", "created_at"]
        read_only_fields = fields


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    manager_name = serializers.CharField(source="manager.name", read_only=True, default=None)

    class Meta:
        model = Employee
        fields = [
            "id",
            "name",
            "email",
            "department",
            "department_name",
            "country",
            "currency",
            "base_salary",
            "employment_status",
            "hire_date",
            "termination_date",
            "manager",
            "manager_name",
            "updated_at",
        ]

    def validate_country(self, value):
        if len(value) != 2:
            raise serializers.ValidationError("country must be a 2-letter ISO code.")
        return value.upper()

    def validate_currency(self, value):
        if len(value) != 3:
            raise serializers.ValidationError("currency must be a 3-letter ISO 4217 code.")
        return value.upper()

    def validate(self, attrs):
        status = attrs.get(
            "employment_status", getattr(self.instance, "employment_status", Employee.EmploymentStatus.ACTIVE)
        )
        termination_date = attrs.get("termination_date", getattr(self.instance, "termination_date", None))
        hire_date = attrs.get("hire_date", getattr(self.instance, "hire_date", None))

        if status == Employee.EmploymentStatus.TERMINATED and not termination_date:
            raise serializers.ValidationError(
                {"termination_date": "Required when employment_status is 'terminated'."}
            )
        if status == Employee.EmploymentStatus.ACTIVE and termination_date:
            raise serializers.ValidationError(
                {"termination_date": "Must be empty when employment_status is 'active'."}
            )
        if termination_date and hire_date and termination_date < hire_date:
            raise serializers.ValidationError(
                {"termination_date": "Cannot be before hire_date."}
            )

        manager = attrs.get("manager", getattr(self.instance, "manager", None))
        if manager and self.instance and manager_id_matches_self(manager, self.instance):
            raise serializers.ValidationError({"manager": "An employee cannot be their own manager."})

        return attrs


def manager_id_matches_self(manager, instance):
    return manager.pk == instance.pk


class EmployeeWriteSerializer(EmployeeSerializer):
    """Adds optimistic-concurrency + salary-audit handling for PATCH/PUT.

    Callers must send `expected_updated_at` (ISO timestamp from the last GET)
    on updates; a mismatch means someone else changed the record first (409),
    rather than silently overwriting their edit.
    """

    expected_updated_at = serializers.DateTimeField(write_only=True, required=False)
    salary_change_reason = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta(EmployeeSerializer.Meta):
        fields = EmployeeSerializer.Meta.fields + ["expected_updated_at", "salary_change_reason"]

    def validate(self, attrs):
        # expected_updated_at is checked at the view layer (see EmployeeViewSet.update) so a
        # mismatch can return 409, not 400 — DRF's serializer error handling normalizes any
        # exception raised here into a plain ValidationError and discards a custom status_code.
        attrs.pop("expected_updated_at", None)
        return super().validate(attrs)
