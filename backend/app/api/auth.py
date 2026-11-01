from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.auth import get_current_user
from backend.app.models.models import User, UserRole, Patient, Doctor
from backend.app.schemas.schemas import UserCreate, UserLogin, Token, UserResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        log_audit_event(
            db, action="REGISTER_FAILED", resource="/api/auth/register",
            details=f"Email {user_in.email} already registered",
            status="FAILURE", request=request
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Create new user
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        phone=user_in.phone,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create associated profile
    if new_user.role == UserRole.PATIENT:
        patient_profile = Patient(
            user_id=new_user.id,
            date_of_birth=user_in.date_of_birth or "1990-01-01",
            gender=user_in.gender or "Unspecified",
            blood_group=user_in.blood_group or "O+"
        )
        db.add(patient_profile)
    elif new_user.role == UserRole.DOCTOR:
        doctor_profile = Doctor(
            user_id=new_user.id,
            specialization=user_in.specialization or "General Medicine",
            department=user_in.department or "Outpatient Clinic",
            license_number=user_in.license_number or f"MD-REG-{new_user.id:04d}",
            room_number="Suite 101"
        )
        db.add(doctor_profile)

    db.commit()

    log_audit_event(
        db, action="USER_REGISTERED", resource="/api/auth/register",
        user_id=new_user.id, details=f"Registered role {new_user.role.value}",
        status="SUCCESS", request=request
    )

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role.value, "id": new_user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": new_user.role.value,
        "user_id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email
    }


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        log_audit_event(
            db, action="LOGIN_FAILED", resource="/api/auth/login",
            details=f"Failed attempt for email {login_data.email}",
            status="FAILURE", request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated. Contact hospital administration."
        )

    log_audit_event(
        db, action="USER_LOGIN", resource="/api/auth/login",
        user_id=user.id, details=f"Successful login for {user.role.value}",
        status="SUCCESS", request=request
    )

    access_token = create_access_token(data={"sub": user.email, "role": user.role.value, "id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email
    }


@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile_data = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "phone": current_user.phone,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            profile_data["patient_id"] = patient.id
            profile_data["date_of_birth"] = patient.date_of_birth
            profile_data["gender"] = patient.gender
            profile_data["blood_group"] = patient.blood_group
            profile_data["emergency_contact"] = patient.emergency_contact
            profile_data["allergies"] = patient.allergies
            profile_data["medical_history"] = patient.medical_history
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doctor:
            profile_data["doctor_id"] = doctor.id
            profile_data["specialization"] = doctor.specialization
            profile_data["department"] = doctor.department
            profile_data["license_number"] = doctor.license_number
            profile_data["room_number"] = doctor.room_number
            profile_data["consultation_fee"] = doctor.consultation_fee

    return profile_data


@router.get("/demo-accounts")
def get_demo_accounts():
    """Returns the synthetic test accounts for instant viva evaluation."""
    return [
        {
            "role": "Administrator",
            "email": "admin@medora.health",
            "password": "Admin@12345",
            "description": "Full access to hospital operations, audit trail, user governance & analytics"
        },
        {
            "role": "Doctor",
            "email": "doctor.sarah@medora.health",
            "password": "Doctor@12345",
            "description": "Dr. Sarah Jenkins (Cardiology) - manage patient consultations & prescriptions"
        },
        {
            "role": "Patient",
            "email": "patient.john@medora.health",
            "password": "Patient@12345",
            "description": "Johnathan Doe - book appointments, review prescriptions & clinical lab reports"
        }
    ]
