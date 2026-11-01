from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_role
from backend.app.models.models import (
    User, UserRole, Appointment, AppointmentStatus, Patient, Doctor, Consultation, Prescription
)
from backend.app.schemas.schemas import (
    AppointmentResponse, AppointmentCreate, AppointmentUpdate, ConsultationResponse, PrescriptionResponse
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def format_appointment(apt: Appointment) -> dict:
    consultation_dict = None
    if apt.consultation:
        consultation_dict = {
            "id": apt.consultation.id,
            "appointment_id": apt.consultation.appointment_id,
            "doctor_id": apt.consultation.doctor_id,
            "patient_id": apt.consultation.patient_id,
            "diagnosis": apt.consultation.diagnosis,
            "symptoms": apt.consultation.symptoms,
            "clinical_notes": apt.consultation.clinical_notes,
            "follow_up_date": apt.consultation.follow_up_date,
            "created_at": apt.consultation.created_at,
            "prescriptions": [
                {
                    "id": p.id,
                    "consultation_id": p.consultation_id,
                    "patient_id": p.patient_id,
                    "doctor_id": p.doctor_id,
                    "medication_name": p.medication_name,
                    "dosage": p.dosage,
                    "frequency": p.frequency,
                    "duration_days": p.duration_days,
                    "instructions": p.instructions,
                    "created_at": p.created_at
                } for p in apt.consultation.prescriptions
            ]
        }

    return {
        "id": apt.id,
        "patient_id": apt.patient_id,
        "doctor_id": apt.doctor_id,
        "appointment_date": apt.appointment_date,
        "appointment_time": apt.appointment_time,
        "status": apt.status,
        "reason": apt.reason,
        "notes": apt.notes,
        "created_at": apt.created_at,
        "updated_at": apt.updated_at,
        "patient_name": apt.patient.user.full_name if apt.patient and apt.patient.user else "Patient",
        "doctor_name": apt.doctor.user.full_name if apt.doctor and apt.doctor.user else "Doctor",
        "doctor_specialization": apt.doctor.specialization if apt.doctor else "",
        "doctor_department": apt.doctor.department if apt.doctor else "",
        "consultation": consultation_dict
    }


@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Appointment)

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Appointment.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        query = query.filter(Appointment.doctor_id == doctor.id)

    if status_filter:
        try:
            status_enum = AppointmentStatus(status_filter.upper())
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            pass

    appointments = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()
    return [format_appointment(a) for a in appointments]


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    apt_in: AppointmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == apt_in.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor does not exist")

    # Determine patient ID
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            # Auto-create patient profile if missing
            patient = Patient(user_id=current_user.id)
            db.add(patient)
            db.commit()
            db.refresh(patient)
        patient_id = patient.id
    elif apt_in.patient_id:
        patient = db.query(Patient).filter(Patient.id == apt_in.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Specified patient not found")
        patient_id = patient.id
    else:
        raise HTTPException(status_code=400, detail="Patient ID is required")

    new_apt = Appointment(
        patient_id=patient_id,
        doctor_id=doctor.id,
        appointment_date=apt_in.appointment_date,
        appointment_time=apt_in.appointment_time,
        status=AppointmentStatus.SCHEDULED,
        reason=apt_in.reason,
        notes=apt_in.notes
    )
    db.add(new_apt)
    db.commit()
    db.refresh(new_apt)

    log_audit_event(
        db, action="BOOK_APPOINTMENT", resource=f"/api/appointments/{new_apt.id}",
        user_id=current_user.id, details=f"Booked appointment on {new_apt.appointment_date} with Dr. {doctor.user.full_name}",
        status="SUCCESS", request=request
    )
    return format_appointment(new_apt)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Access control
    if current_user.role == UserRole.PATIENT and apt.patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if current_user.role == UserRole.DOCTOR and apt.doctor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return format_appointment(apt)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    update_data: AppointmentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorization
    if current_user.role == UserRole.PATIENT:
        if apt.patient.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        # Patients can only cancel their appointments
        if update_data.status and update_data.status != AppointmentStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Patients may only cancel appointments")

    if current_user.role == UserRole.DOCTOR:
        if apt.doctor.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    if update_data.status is not None:
        apt.status = update_data.status
    if update_data.appointment_date is not None:
        apt.appointment_date = update_data.appointment_date
    if update_data.appointment_time is not None:
        apt.appointment_time = update_data.appointment_time
    if update_data.notes is not None:
        apt.notes = update_data.notes

    db.commit()
    db.refresh(apt)

    log_audit_event(
        db, action="UPDATE_APPOINTMENT", resource=f"/api/appointments/{apt.id}",
        user_id=current_user.id, details=f"Status set to {apt.status.value}",
        status="SUCCESS", request=request
    )
    return format_appointment(apt)


@router.delete("/{appointment_id}")
def cancel_or_delete_appointment(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.role == UserRole.PATIENT and apt.patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if current_user.role == UserRole.DOCTOR and apt.doctor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Rather than physical hard-delete, mark CANCELLED for medical compliance audit trail
    apt.status = AppointmentStatus.CANCELLED
    db.commit()

    log_audit_event(
        db, action="CANCEL_APPOINTMENT", resource=f"/api/appointments/{appointment_id}",
        user_id=current_user.id, details=f"Cancelled appointment #{appointment_id}",
        status="SUCCESS", request=request
    )
    return {"message": f"Appointment #{appointment_id} cancelled successfully", "status": "CANCELLED"}
