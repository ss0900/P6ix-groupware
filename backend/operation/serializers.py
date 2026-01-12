# backend/operation/serializers.py
from rest_framework import serializers
from .models import Client, SalesOpportunity, Estimate, EstimateItem, Contract


class ClientSerializer(serializers.ModelSerializer):
    opportunity_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "name", "representative", "business_number", "industry",
            "phone", "fax", "email", "address",
            "contact_name", "contact_phone", "contact_email",
            "notes", "opportunity_count",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_opportunity_count(self, obj):
        return obj.opportunities.count()

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""


class SalesOpportunityListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    owner_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    weighted_amount = serializers.ReadOnlyField()

    class Meta:
        model = SalesOpportunity
        fields = [
            "id", "title", "client", "client_name",
            "status", "status_display", "priority",
            "expected_amount", "probability", "weighted_amount",
            "expected_close_date", "owner", "owner_name",
            "created_at"
        ]

    def get_owner_name(self, obj):
        return f"{obj.owner.last_name}{obj.owner.first_name}" if obj.owner else ""


class SalesOpportunityDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    owner_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    weighted_amount = serializers.ReadOnlyField()
    estimate_count = serializers.SerializerMethodField()

    class Meta:
        model = SalesOpportunity
        fields = [
            "id", "title", "client", "client_name",
            "status", "status_display", "priority",
            "expected_amount", "probability", "weighted_amount",
            "expected_close_date", "owner", "owner_name",
            "description", "estimate_count",
            "created_at", "updated_at"
        ]

    def get_owner_name(self, obj):
        return f"{obj.owner.last_name}{obj.owner.first_name}" if obj.owner else ""

    def get_estimate_count(self, obj):
        return obj.estimates.count()


class EstimateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateItem
        fields = ["id", "description", "quantity", "unit_price", "amount", "order"]
        read_only_fields = ["id", "amount"]


class EstimateListSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    client_name = serializers.CharField(source="opportunity.client.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Estimate
        fields = [
            "id", "estimate_number", "opportunity", "opportunity_title", "client_name",
            "title", "status", "status_display",
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

    class Meta:
        model = Estimate
        fields = [
            "id", "estimate_number", "opportunity", "opportunity_title", "client_name",
            "title", "status", "status_display",
            "subtotal", "tax", "total", "valid_until",
            "notes", "items",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""


class ContractSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            "id", "contract_number", "opportunity", "opportunity_title",
            "client", "client_name",
            "title", "status", "status_display", "amount",
            "start_date", "end_date", "notes",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.last_name}{obj.created_by.first_name}" if obj.created_by else ""
