import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, 
    Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class LabStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CRITICAL = "CRITICAL"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.PATIENT)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    patient_profile = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    address = Column(String(255), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    allergies = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    consultations = relationship("Consultation", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    lab_reports = relationship("LabReport", back_populates="patient")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialization = Column(String(100), nullable=False)
    license_number = Column(String(100), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    room_number = Column(String(50), nullable=True)
    experience_years = Column(Integer, default=5, nullable=False)
    consultation_fee = Column(Integer, default=100, nullable=False)
    available_days = Column(String(100), default="Mon,Tue,Wed,Thu,Fri", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    consultations = relationship("Consultation", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    lab_reports = relationship("LabReport", back_populates="doctor")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_date = Column(String(50), nullable=False)  # YYYY-MM-DD
    appointment_time = Column(String(50), nullable=False)  # HH:MM AM/PM
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.SCHEDULED, nullable=False, index=True)
    reason = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    consultation = relationship("Consultation", back_populates="appointment", uselist=False, cascade="all, delete-orphan")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    diagnosis = Column(Text, nullable=False)
    symptoms = Column(Text, nullable=False)
    clinical_notes = Column(Text, nullable=True)
    follow_up_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    appointment = relationship("Appointment", back_populates="consultation")
    doctor = relationship("Doctor", back_populates="consultations")
    patient = relationship("Patient", back_populates="consultations")
    prescriptions = relationship("Prescription", back_populates="consultation", cascade="all, delete-orphan")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=False)
    duration_days = Column(Integer, default=7, nullable=False)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    consultation = relationship("Consultation", back_populates="prescriptions")
    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")


class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    test_name = Column(String(255), nullable=False)
    test_category = Column(String(100), nullable=False)
    test_date = Column(String(50), nullable=False)
    results_summary = Column(Text, nullable=False)
    status = Column(SQLEnum(LabStatus), default=LabStatus.COMPLETED, nullable=False)
    file_reference = Column(String(255), nullable=True)
    normal_range = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="lab_reports")
    doctor = relationship("Doctor", back_populates="lab_reports")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource = Column(String(100), nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="SUCCESS", nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
