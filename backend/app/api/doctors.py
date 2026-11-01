from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_role
from backend.app.models.models import User, UserRole, Doctor, Appointment
from backend.app.schemas.schemas import DoctorResponse, DoctorCreate
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


@router.get("", response_model=List[DoctorResponse])
def get_all_doctors(db: Session = Depends(get_db)):
    """Retrieve list of active medical doctors and clinical specialists."""
    doctors = db.query(Doctor).join(User).filter(User.is_active == True).all()
    return doctors


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor_by_id(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor_profile(
    doctor_in: DoctorCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    # Verify user exists and has doctor role
    user = db.query(User).filter(User.id == doctor_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    existing_doc = db.query(Doctor).filter(Doctor.user_id == doctor_in.user_id).first()
    if existing_doc:
        raise HTTPException(status_code=400, detail="Doctor profile already exists for this user")

    new_doctor = Doctor(
        user_id=doctor_in.user_id,
        specialization=doctor_in.specialization,
        department=doctor_in.department,
        license_number=doctor_in.license_number,
        room_number=doctor_in.room_number,
        experience_years=doctor_in.experience_years,
        consultation_fee=doctor_in.consultation_fee,
        available_days=doctor_in.available_days
    )
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)

    log_audit_event(
        db, action="CREATE_DOCTOR", resource=f"/api/doctors/{new_doctor.id}",
        user_id=current_user.id, details=f"Created doctor profile for user #{user.id}",
        status="SUCCESS", request=request
    )
    return new_doctor
