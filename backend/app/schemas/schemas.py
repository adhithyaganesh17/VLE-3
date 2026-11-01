from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from backend.app.models.models import UserRole, AppointmentStatus, LabStatus


# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    email: str


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.PATIENT
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    specialization: Optional[str] = None
    department: Optional[str] = None
    license_number: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Patient Schemas ---
class PatientBase(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None


class PatientCreate(PatientBase):
    user_id: int


class PatientUpdate(PatientBase):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class PatientResponse(PatientBase):
    id: int
    user_id: int
    user: Optional[UserResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    specialization: str
    department: str
    license_number: str
    room_number: Optional[str] = None
    experience_years: int = 5
    consultation_fee: int = 100
    available_days: str = "Mon,Tue,Wed,Thu,Fri"


class DoctorCreate(DoctorBase):
    user_id: int


class DoctorResponse(DoctorBase):
    id: int
    user_id: int
    user: Optional[UserResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Prescription Schemas ---
class PrescriptionBase(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int = 7
    instructions: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    consultation_id: Optional[int] = None
    patient_id: int
    doctor_id: Optional[int] = None


class PrescriptionResponse(PrescriptionBase):
    id: int
    consultation_id: Optional[int] = None
    patient_id: int
    doctor_id: int
    created_at: datetime
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# --- Consultation Schemas ---
class ConsultationBase(BaseModel):
    diagnosis: str
    symptoms: str
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class ConsultationCreate(ConsultationBase):
    appointment_id: int
    prescriptions: Optional[List[PrescriptionBase]] = []


class ConsultationResponse(ConsultationBase):
    id: int
    appointment_id: int
    doctor_id: int
    patient_id: int
    created_at: datetime
    prescriptions: List[PrescriptionResponse] = []
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# --- Appointment Schemas ---
class AppointmentBase(BaseModel):
    appointment_date: str
    appointment_time: str
    reason: str
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    doctor_id: int
    patient_id: Optional[int] = None


class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: int
    patient_id: int
    doctor_id: int
    status: AppointmentStatus
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    doctor_department: Optional[str] = None
    consultation: Optional[ConsultationResponse] = None
    model_config = ConfigDict(from_attributes=True)


# --- Lab Report Schemas ---
class LabReportBase(BaseModel):
    test_name: str
    test_category: str
    test_date: str
    results_summary: str
    status: LabStatus = LabStatus.COMPLETED
    normal_range: Optional[str] = None
    file_reference: Optional[str] = None


class LabReportCreate(LabReportBase):
    patient_id: int
    doctor_id: Optional[int] = None


class LabReportResponse(LabReportBase):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    created_at: datetime
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    resource: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None
    status: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


# --- DevOps & Admin Analytics Schemas ---
class AdminAnalytics(BaseModel):
    total_patients: int
    total_doctors: int
    total_appointments: int
    completed_consultations: int
    pending_appointments: int
    department_stats: List[Dict[str, Any]]
    monthly_trends: List[Dict[str, Any]]
    status_distribution: List[Dict[str, Any]]


class DevOpsStatus(BaseModel):
    app_name: str
    app_version: str
    environment: str
    uptime_seconds: float
    status: str
    timestamp: str
    hostname: str
    database_connected: bool
    system_metrics: Dict[str, Any]
    active_pods: List[Dict[str, Any]]
    deployment_info: Dict[str, Any]


class SecurityScanReport(BaseModel):
    overall_status: str
    last_scan_timestamp: str
    gitleaks: Dict[str, Any]
    bandit: Dict[str, Any]
    trivy: Dict[str, Any]
    sonarqube: Dict[str, Any]
