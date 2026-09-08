from django.contrib import admin

from .models import Department, Employee, SalaryChange

admin.site.register(Department)
admin.site.register(Employee)
admin.site.register(SalaryChange)
