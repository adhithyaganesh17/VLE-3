from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_role
from backend.app.models.models import User, UserRole, Prescription, Patient, Doctor
from backend.app.schemas.schemas import PrescriptionResponse, PrescriptionCreate
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])


def format_prescription(p: Prescription) -> dict:
    return {
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
        "doctor_name": p.doctor.user.full_name if p.doctor and p.doctor.user else "Doctor",
        "patient_name": p.patient.user.full_name if p.patient and p.patient.user else "Patient"
    }


@router.get("", response_model=List[PrescriptionResponse])
def get_prescriptions(
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Prescription)

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Prescription.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        if patient_id:
            query = query.filter(Prescription.patient_id == patient_id)
        else:
            query = query.filter(Prescription.doctor_id == doctor.id)
    elif patient_id:
        query = query.filter(Prescription.patient_id == patient_id)

    prescriptions = query.order_by(Prescription.created_at.desc()).all()
    return [format_prescription(p) for p in prescriptions]


@router.post("", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def create_prescription(
    presc_in: PrescriptionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == presc_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=400, detail="Doctor profile not found")
        doctor_id = doctor.id
    else:
        doctor_id = presc_in.doctor_id or 1

    new_p = Prescription(
        consultation_id=presc_in.consultation_id,
        patient_id=patient.id,
        doctor_id=doctor_id,
        medication_name=presc_in.medication_name,
        dosage=presc_in.dosage,
        frequency=presc_in.frequency,
        duration_days=presc_in.duration_days,
        instructions=presc_in.instructions
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)

    log_audit_event(
        db, action="CREATE_PRESCRIPTION", resource=f"/api/prescriptions/{new_p.id}",
        user_id=current_user.id, details=f"Prescribed {new_p.medication_name} to patient #{patient.id}",
        status="SUCCESS", request=request
    )
    return format_prescription(new_p)
