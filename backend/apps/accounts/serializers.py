from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q
from .models import User, DoctorProfile, RoleType

class DoctorProfileSerializer(serializers.ModelSerializer):
    licenseNumber = serializers.CharField(source='license_number')
    consultationFee = serializers.DecimalField(source='consultation_fee', max_digits=10, decimal_places=2)

    class Meta:
        model = DoctorProfile
        fields = ['id', 'licenseNumber', 'department', 'qualification', 'consultationFee']

class UserSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    phoneNumber = serializers.CharField(source='phone_number', required=False, allow_null=True)
    doctorProfile = DoctorProfileSerializer(source='doctor_profile', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'phoneNumber', 'doctorProfile']

class LoginSerializer(serializers.Serializer):
    emailOrUsername = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        login_val = attrs.get('emailOrUsername')
        password = attrs.get('password')

        user = User.objects.filter(Q(email__iexact=login_val) | Q(username__iexact=login_val)).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError('Invalid email/username or password.')

        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')

        refresh = RefreshToken.for_user(user)
        # Custom claims
        refresh['username'] = user.username
        refresh['email'] = user.email
        refresh['role'] = user.role

        return {
            'accessToken': str(refresh.access_token),
            'refreshToken': str(refresh),
            'user': UserSerializer(user).data
        }

class RegisterSerializer(serializers.ModelSerializer):
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    phoneNumber = serializers.CharField(source='phone_number', required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True)
    licenseNumber = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    qualification = serializers.CharField(required=False, allow_blank=True)
    consultationFee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0.0)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'firstName', 'lastName',
            'role', 'phoneNumber', 'licenseNumber', 'department',
            'qualification', 'consultationFee'
        ]

    def create(self, validated_data):
        license_number = validated_data.pop('licenseNumber', None)
        department = validated_data.pop('department', None)
        qualification = validated_data.pop('qualification', None)
        fee = validated_data.pop('consultationFee', 0.0)
        password = validated_data.pop('password')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', RoleType.RECEPTIONIST),
            phone_number=validated_data.get('phone_number', ''),
        )

        if user.role == RoleType.DOCTOR and license_number:
            DoctorProfile.objects.create(
                user=user,
                license_number=license_number,
                department=department or 'General Medicine',
                qualification=qualification or 'MBBS',
                consultation_fee=fee
            )

        return user
