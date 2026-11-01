from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_role
from backend.app.models.models import User, UserRole, LabReport, Patient, Doctor
from backend.app.schemas.schemas import LabReportResponse, LabReportCreate
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/lab-reports", tags=["Lab Reports"])


def format_lab_report(lr: LabReport) -> dict:
    return {
        "id": lr.id,
        "patient_id": lr.patient_id,
        "doctor_id": lr.doctor_id,
        "test_name": lr.test_name,
        "test_category": lr.test_category,
        "test_date": lr.test_date,
        "results_summary": lr.results_summary,
        "status": lr.status,
        "file_reference": lr.file_reference,
        "normal_range": lr.normal_range,
        "created_at": lr.created_at,
        "doctor_name": lr.doctor.user.full_name if lr.doctor and lr.doctor.user else "Attending Clinician",
        "patient_name": lr.patient.user.full_name if lr.patient and lr.patient.user else "Patient"
    }


@router.get("", response_model=List[LabReportResponse])
def get_lab_reports(
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(LabReport)

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(LabReport.patient_id == patient.id)
    elif patient_id:
        query = query.filter(LabReport.patient_id == patient_id)

    reports = query.order_by(LabReport.created_at.desc()).all()
    return [format_lab_report(r) for r in reports]


@router.post("", response_model=LabReportResponse, status_code=status.HTTP_201_CREATED)
def create_lab_report(
    lr_in: LabReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR, UserRole.ADMIN]))
):
    patient = db.query(Patient).filter(Patient.id == lr_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_report = LabReport(
        patient_id=patient.id,
        doctor_id=lr_in.doctor_id,
        test_name=lr_in.test_name,
        test_category=lr_in.test_category,
        test_date=lr_in.test_date,
        results_summary=lr_in.results_summary,
        status=lr_in.status,
        file_reference=lr_in.file_reference,
        normal_range=lr_in.normal_range
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    log_audit_event(
        db, action="CREATE_LAB_REPORT", resource=f"/api/lab-reports/{new_report.id}",
        user_id=current_user.id, details=f"Created {new_report.test_name} for patient #{patient.id}",
        status="SUCCESS", request=request
    )
    return format_lab_report(new_report)
