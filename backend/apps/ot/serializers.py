from rest_framework import serializers
from .models import SurgeryBooking

class SurgeryBookingSerializer(serializers.ModelSerializer):
    bookingNumber = serializers.CharField(source='booking_number', read_only=True)
    patientName = serializers.SerializerMethodField()
    uhid = serializers.CharField(source='patient.uhid', read_only=True)
    procedureName = serializers.CharField(source='procedure_name')
    otRoom = serializers.CharField(source='ot_room')
    scheduledStart = serializers.DateTimeField(source='scheduled_start', required=False, allow_null=True)
    scheduledEnd = serializers.DateTimeField(source='scheduled_end', required=False, allow_null=True)
    preOpDiagnosis = serializers.CharField(source='pre_op_diagnosis', required=False, allow_null=True, allow_blank=True)
    postOpNotes = serializers.CharField(source='post_op_notes', required=False, allow_null=True, allow_blank=True)
    equipmentUsed = serializers.ListField(source='equipment_used', required=False, default=list)
    surgeon = serializers.SerializerMethodField()

    class Meta:
        model = SurgeryBooking
        fields = [
            'id', 'bookingNumber', 'patientName', 'uhid', 'procedureName',
            'otRoom', 'scheduledStart', 'scheduledEnd', 'status',
            'preOpDiagnosis', 'postOpNotes', 'equipmentUsed', 'surgeon'
        ]

    def get_patientName(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_surgeon(self, obj):
        return f"Dr. {obj.primary_surgeon.user.get_full_name()}" if obj.primary_surgeon and obj.primary_surgeon.user else "Dr. Michael Chang"
