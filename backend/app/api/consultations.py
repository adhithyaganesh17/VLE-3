from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_role
from backend.app.models.models import (
    User, UserRole, Appointment, AppointmentStatus, Consultation, Prescription, Doctor, Patient
)
from backend.app.schemas.schemas import ConsultationResponse, ConsultationCreate
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/consultations", tags=["Consultations"])


def format_consultation(c: Consultation) -> dict:
    return {
        "id": c.id,
        "appointment_id": c.appointment_id,
        "doctor_id": c.doctor_id,
        "patient_id": c.patient_id,
        "diagnosis": c.diagnosis,
        "symptoms": c.symptoms,
        "clinical_notes": c.clinical_notes,
        "follow_up_date": c.follow_up_date,
        "created_at": c.created_at,
        "doctor_name": c.doctor.user.full_name if c.doctor and c.doctor.user else "Doctor",
        "patient_name": c.patient.user.full_name if c.patient and c.patient.user else "Patient",
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
                "created_at": p.created_at,
                "doctor_name": c.doctor.user.full_name if c.doctor and c.doctor.user else "Doctor",
                "patient_name": c.patient.user.full_name if c.patient and c.patient.user else "Patient"
            } for p in c.prescriptions
        ]
    }


@router.get("", response_model=List[ConsultationResponse])
def get_consultations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Consultation)

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Consultation.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        query = query.filter(Consultation.doctor_id == doctor.id)

    consultations = query.order_by(Consultation.created_at.desc()).all()
    return [format_consultation(c) for c in consultations]


@router.post("", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
def create_consultation(
    cons_in: ConsultationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR, UserRole.ADMIN]))
):
    # Verify appointment
    apt = db.query(Appointment).filter(Appointment.id == cons_in.appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify if doctor is the assigned doctor
    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor or doctor.id != apt.doctor_id:
            raise HTTPException(status_code=403, detail="Only assigned doctor can record consultation")
    else:
        doctor = apt.doctor

    # Check if consultation already exists
    existing = db.query(Consultation).filter(Consultation.appointment_id == apt.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Consultation already recorded for this appointment")

    # Create consultation
    new_cons = Consultation(
        appointment_id=apt.id,
        doctor_id=doctor.id,
        patient_id=apt.patient_id,
        diagnosis=cons_in.diagnosis,
        symptoms=cons_in.symptoms,
        clinical_notes=cons_in.clinical_notes,
        follow_up_date=cons_in.follow_up_date
    )
    db.add(new_cons)
    db.flush()

    # Add any associated prescriptions
    if cons_in.prescriptions:
        for p in cons_in.prescriptions:
            new_p = Prescription(
                consultation_id=new_cons.id,
                patient_id=apt.patient_id,
                doctor_id=doctor.id,
                medication_name=p.medication_name,
                dosage=p.dosage,
                frequency=p.frequency,
                duration_days=p.duration_days,
                instructions=p.instructions
            )
            db.add(new_p)

    # Transition appointment status to COMPLETED
    apt.status = AppointmentStatus.COMPLETED
    db.commit()
    db.refresh(new_cons)

    log_audit_event(
        db, action="CREATE_CONSULTATION", resource=f"/api/consultations/{new_cons.id}",
        user_id=current_user.id, details=f"Diagnosis: {new_cons.diagnosis} for appointment #{apt.id}",
        status="SUCCESS", request=request
    )
    return format_consultation(new_cons)


@router.get("/{consultation_id}", response_model=ConsultationResponse)
def get_consultation_by_id(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if current_user.role == UserRole.PATIENT and c.patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if current_user.role == UserRole.DOCTOR and c.doctor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return format_consultation(c)
