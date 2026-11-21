from rest_framework import serializers

CATEGORIES = ("Account", "Technical", "Billing", "Other")
STATUSES = ("Open", "In Progress", "Resolved")


class TicketSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=150, allow_blank=False, required=True)
    description = serializers.CharField(allow_blank=False, required=True)
    category = serializers.ChoiceField(choices=CATEGORIES, required=True)
    status = serializers.ChoiceField(choices=STATUSES, required=False, default="Open")
    created_at = serializers.DateTimeField(read_only=True)
    resolution_note = serializers.CharField(allow_blank=False, required=False)

    def validate(self, attrs):
        if attrs.get("status", "Open") == "Resolved" and not attrs.get("resolution_note"):
            raise serializers.ValidationError({
                "resolution_note": "This field is required when status is Resolved."
            })
        return attrs


class TicketUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, allow_blank=False, required=False)
    description = serializers.CharField(allow_blank=False, required=False)
    status = serializers.ChoiceField(choices=STATUSES, required=False)
    resolution_note = serializers.CharField(allow_blank=False, required=False)

    def validate(self, attrs):
        status_value = attrs.get("status", self.instance.get("status", "Open"))
        note = attrs.get("resolution_note", self.instance.get("resolution_note"))
        if status_value == "Resolved" and not note:
            raise serializers.ValidationError({
                "resolution_note": "This field is required when status is Resolved."
            })
        return attrs


class SimilarityQuerySerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, allow_blank=False, required=True)
    description = serializers.CharField(allow_blank=False, required=True)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(allow_blank=False, required=True)
    password = serializers.CharField(allow_blank=False, required=True, trim_whitespace=False)
