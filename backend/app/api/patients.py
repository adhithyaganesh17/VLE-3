from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_role
from backend.app.models.models import User, UserRole, Patient, Appointment, Consultation, Prescription, LabReport
from backend.app.schemas.schemas import PatientResponse, PatientUpdate
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
def get_all_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DOCTOR]))
):
    patients = db.query(Patient).all()
    return patients


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_by_id(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Access control: Patients can only view their own profile; Doctors and Admins can view any
    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this patient profile")

    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient_profile(
    patient_id: int,
    update_data: PatientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to modify this patient profile")

    # Update patient fields
    if update_data.date_of_birth is not None:
        patient.date_of_birth = update_data.date_of_birth
    if update_data.gender is not None:
        patient.gender = update_data.gender
    if update_data.blood_group is not None:
        patient.blood_group = update_data.blood_group
    if update_data.address is not None:
        patient.address = update_data.address
    if update_data.emergency_contact is not None:
        patient.emergency_contact = update_data.emergency_contact
    if update_data.allergies is not None:
        patient.allergies = update_data.allergies
    if update_data.medical_history is not None:
        patient.medical_history = update_data.medical_history

    # Update user basic details if provided
    if update_data.full_name is not None:
        patient.user.full_name = update_data.full_name
    if update_data.phone is not None:
        patient.user.phone = update_data.phone

    db.commit()
    db.refresh(patient)

    log_audit_event(
        db, action="UPDATE_PATIENT_PROFILE", resource=f"/api/patients/{patient_id}",
        user_id=current_user.id, details=f"Updated profile for patient #{patient_id}",
        status="SUCCESS", request=request
    )
    return patient


@router.get("/{patient_id}/full-history")
def get_patient_clinical_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve combined medical records: consultations, prescriptions, lab reports."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    consultations = db.query(Consultation).filter(Consultation.patient_id == patient_id).all()
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).all()
    lab_reports = db.query(LabReport).filter(LabReport.patient_id == patient_id).all()

    return {
        "patient": {
            "id": patient.id,
            "full_name": patient.user.full_name,
            "blood_group": patient.blood_group,
            "allergies": patient.allergies,
            "medical_history": patient.medical_history
        },
        "consultations_count": len(consultations),
        "prescriptions_count": len(prescriptions),
        "lab_reports_count": len(lab_reports),
        "records": {
            "consultations": [
                {
                    "id": c.id,
                    "date": c.created_at.strftime("%Y-%m-%d"),
                    "diagnosis": c.diagnosis,
                    "symptoms": c.symptoms,
                    "doctor": c.doctor.user.full_name if c.doctor else "Unknown",
                    "clinical_notes": c.clinical_notes
                } for c in consultations
            ],
            "prescriptions": [
                {
                    "id": p.id,
                    "medication_name": p.medication_name,
                    "dosage": p.dosage,
                    "frequency": p.frequency,
                    "duration_days": p.duration_days,
                    "doctor": p.doctor.user.full_name if p.doctor else "Hospital Staff"
                } for p in prescriptions
            ],
            "lab_reports": [
                {
                    "id": l.id,
                    "test_name": l.test_name,
                    "test_category": l.test_category,
                    "test_date": l.test_date,
                    "status": l.status.value,
                    "results_summary": l.results_summary
                } for l in lab_reports
            ]
        }
    }
