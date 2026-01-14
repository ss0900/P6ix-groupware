# backend/operation/serializers.py
from rest_framework import serializers
from django.db.models import Sum, Count
from .models import (
    Client, SalesOpportunity, Estimate, EstimateItem, 
    Contract, QuoteTemplate, BillingSchedule, Invoice, Payment
)


class ClientListSerializer(serializers.ModelSerializer):
    """거래처 목록용 Serializer"""
    opportunity_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    children_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "name", "representative", "business_number", "industry",
            "phone", "fax", "email", "address",
            "contact_name", "contact_phone", "contact_email",
            "notes", "opportunity_count", "children_count",
            "parent", "parent_name",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_opportunity_count(self, obj):
        return obj.opportunities.count()

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""

    def get_children_count(self, obj):
        return obj.children.count()


class ClientHierarchySerializer(serializers.ModelSerializer):
    """거래처 계층 구조 Serializer (하위 부서 포함)"""
    children = serializers.SerializerMethodField()
    total_opportunities = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()
    opportunity_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "name", "representative", "industry",
            "children", "opportunity_count", "total_opportunities", "total_revenue"
        ]

    def get_children(self, obj):
        children = obj.children.all()
        return ClientHierarchySerializer(children, many=True).data

    def get_opportunity_count(self, obj):
        return obj.opportunities.count()

    def get_total_opportunities(self, obj):
        """자신과 하위 부서의 모든 영업 기회 수"""
        return obj.get_all_opportunities().count()

    def get_total_revenue(self, obj):
        """자신과 하위 부서의 모든 수주 금액 합계"""
        return obj.get_all_opportunities().filter(
            status="won"
        ).aggregate(total=Sum("expected_amount"))["total"] or 0


class ClientDetailSerializer(serializers.ModelSerializer):
    """거래처 상세 Serializer"""
    opportunity_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    children = ClientListSerializer(many=True, read_only=True)
    total_opportunities = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "name", "representative", "business_number", "industry",
            "phone", "fax", "email", "address",
            "contact_name", "contact_phone", "contact_email",
            "notes", "opportunity_count", "children",
            "total_opportunities", "total_revenue",
            "parent", "parent_name",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_opportunity_count(self, obj):
        return obj.opportunities.count()

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""

    def get_total_opportunities(self, obj):
        return obj.get_all_opportunities().count()

    def get_total_revenue(self, obj):
        return obj.get_all_opportunities().filter(
            status="won"
        ).aggregate(total=Sum("expected_amount"))["total"] or 0


class SalesOpportunityListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    owner_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    weighted_amount = serializers.ReadOnlyField()
    is_stagnant = serializers.ReadOnlyField()

    class Meta:
        model = SalesOpportunity
        fields = [
            "id", "title", "client", "client_name",
            "status", "status_display", "priority",
            "expected_amount", "probability", "weighted_amount",
            "expected_close_date", "owner", "owner_name",
            "next_step", "is_stagnant",
            "created_at"
        ]

    def get_owner_name(self, obj):
        return f"{obj.owner.last_name}{obj.owner.first_name}" if obj.owner else ""


class SalesOpportunityDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    owner_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    weighted_amount = serializers.ReadOnlyField()
    is_stagnant = serializers.ReadOnlyField()
    estimate_count = serializers.SerializerMethodField()

    class Meta:
        model = SalesOpportunity
        fields = [
            "id", "title", "client", "client_name",
            "status", "status_display", "priority",
            "expected_amount", "probability", "weighted_amount",
            "expected_close_date", "owner", "owner_name",
            "description", "next_step", "next_step_date", "is_stagnant",
            "estimate_count",
            "created_at", "updated_at"
        ]

    def get_owner_name(self, obj):
        return f"{obj.owner.last_name}{obj.owner.first_name}" if obj.owner else ""

    def get_estimate_count(self, obj):
        return obj.estimates.count()


class QuoteTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = QuoteTemplate
        fields = [
            "id", "name", "description", "column_config", "is_default",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""


class EstimateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateItem
        fields = [
            "id", "description", "specification", "unit",
            "quantity", "unit_price", "amount", "remark", "order"
        ]
        read_only_fields = ["id", "amount"]


class EstimateListSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    client_name = serializers.CharField(source="opportunity.client.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    template_name = serializers.CharField(source="template.name", read_only=True)

    class Meta:
        model = Estimate
        fields = [
            "id", "estimate_number", "opportunity", "opportunity_title", "client_name",
            "title", "status", "status_display",
            "version", "is_final", "template", "template_name",
            "subtotal", "tax", "total", "valid_until",
            "created_by", "created_by_name", "created_at"
        ]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""


class EstimateDetailSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    client_name = serializers.CharField(source="opportunity.client.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    items = EstimateItemSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)
    template_config = serializers.JSONField(source="template.column_config", read_only=True)
    revision_count = serializers.SerializerMethodField()

    class Meta:
        model = Estimate
        fields = [
            "id", "estimate_number", "opportunity", "opportunity_title", "client_name",
            "title", "status", "status_display",
            "version", "is_final", "parent_estimate", "revision_count",
            "template", "template_name", "template_config",
            "subtotal", "tax", "total", "valid_until",
            "notes", "items",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""

    def get_revision_count(self, obj):
        return obj.revisions.count()


class BillingScheduleSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source="contract.contract_number", read_only=True)
    client_name = serializers.CharField(source="contract.client.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = BillingSchedule
        fields = [
            "id", "contract", "contract_number", "client_name",
            "scheduled_date", "amount", "description", "status", "status_display",
            "milestone_name", "milestone_percentage",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "invoice", "invoice_number",
            "payment_date", "amount", "payment_method", "payment_method_display",
            "reference", "notes",
            "created_by", "created_by_name", "created_at"
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""


class InvoiceListSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source="contract.contract_number", read_only=True)
    client_name = serializers.CharField(source="contract.client.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    paid_amount = serializers.ReadOnlyField()
    balance = serializers.ReadOnlyField()
    overdue_days = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "contract", "contract_number", "client_name",
            "issue_date", "due_date",
            "subtotal", "tax", "total",
            "paid_amount", "balance", "overdue_days",
            "status", "status_display",
            "created_at"
        ]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source="contract.contract_number", read_only=True)
    client_name = serializers.CharField(source="contract.client.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    paid_amount = serializers.ReadOnlyField()
    balance = serializers.ReadOnlyField()
    overdue_days = serializers.ReadOnlyField()
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "invoice_number", "contract", "contract_number", "client_name",
            "billing_schedule",
            "issue_date", "due_date",
            "subtotal", "tax", "total",
            "paid_amount", "balance", "overdue_days",
            "status", "status_display",
            "notes", "payments",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""


class ContractListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    contract_type_display = serializers.CharField(source="get_contract_type_display", read_only=True)
    billing_cycle_display = serializers.CharField(source="get_billing_cycle_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    invoice_count = serializers.SerializerMethodField()
    total_invoiced = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            "id", "contract_number", "opportunity", "opportunity_title",
            "client", "client_name",
            "title", "status", "status_display",
            "contract_type", "contract_type_display",
            "billing_cycle", "billing_cycle_display",
            "amount", "start_date", "end_date",
            "invoice_count", "total_invoiced", "total_paid",
            "created_by", "created_by_name", "created_at"
        ]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""

    def get_invoice_count(self, obj):
        return obj.invoices.count()

    def get_total_invoiced(self, obj):
        return obj.invoices.aggregate(total=Sum("total"))["total"] or 0

    def get_total_paid(self, obj):
        return Payment.objects.filter(invoice__contract=obj).aggregate(
            total=Sum("amount")
        )["total"] or 0


class ContractDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    contract_type_display = serializers.CharField(source="get_contract_type_display", read_only=True)
    billing_cycle_display = serializers.CharField(source="get_billing_cycle_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    billing_schedules = BillingScheduleSerializer(many=True, read_only=True)
    invoices = InvoiceListSerializer(many=True, read_only=True)
    total_invoiced = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            "id", "contract_number", "opportunity", "opportunity_title",
            "client", "client_name",
            "title", "status", "status_display",
            "contract_type", "contract_type_display",
            "billing_cycle", "billing_cycle_display",
            "amount", "start_date", "end_date", "notes",
            "billing_schedules", "invoices",
            "total_invoiced", "total_paid", "balance",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""

    def get_total_invoiced(self, obj):
        return obj.invoices.aggregate(total=Sum("total"))["total"] or 0

    def get_total_paid(self, obj):
        return Payment.objects.filter(invoice__contract=obj).aggregate(
            total=Sum("amount")
        )["total"] or 0

    def get_balance(self, obj):
        invoiced = self.get_total_invoiced(obj)
        paid = self.get_total_paid(obj)
        return invoiced - paid
