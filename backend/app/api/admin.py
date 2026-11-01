from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.core.database import get_db
from backend.app.core.auth import require_role
from backend.app.models.models import (
    User, UserRole, Patient, Doctor, Appointment, AppointmentStatus, Consultation, AuditLog
)
from backend.app.schemas.schemas import AdminAnalytics, AuditLogResponse, UserResponse
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/admin", tags=["Hospital Administration"])


@router.get("/analytics", response_model=AdminAnalytics)
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    total_patients = db.query(Patient).count()
    total_doctors = db.query(Doctor).count()
    total_appointments = db.query(Appointment).count()
    completed_consultations = db.query(Consultation).count()
    pending_appointments = db.query(Appointment).filter(Appointment.status == AppointmentStatus.SCHEDULED).count()

    # Department statistics
    dept_counts = (
        db.query(Doctor.department, func.count(Doctor.id))
        .group_by(Doctor.department)
        .all()
    )
    department_stats = [
        {"department": dept, "doctors_count": count} for dept, count in dept_counts
    ]

    # Status distribution
    status_counts = (
        db.query(Appointment.status, func.count(Appointment.id))
        .group_by(Appointment.status)
        .all()
    )
    status_distribution = [
        {"status": s.value, "count": count} for s, count in status_counts
    ]

    # Monthly Trends (demonstration timeline)
    monthly_trends = [
        {"month": "May", "appointments": 28, "consultations": 24, "admissions": 12},
        {"month": "Jun", "appointments": 35, "consultations": 30, "admissions": 18},
        {"month": "Jul", "appointments": 42, "consultations": 38, "admissions": 22},
        {"month": "Aug", "appointments": 50, "consultations": 46, "admissions": 26},
        {"month": "Sep", "appointments": 62, "consultations": 58, "admissions": 31},
        {"month": "Oct", "appointments": 75, "consultations": 71, "admissions": 35},
        {"month": "Nov", "appointments": 85, "consultations": 80, "admissions": 40}
    ]

    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "completed_consultations": completed_consultations,
        "pending_appointments": pending_appointments,
        "department_stats": department_stats,
        "monthly_trends": monthly_trends,
        "status_distribution": status_distribution
    }


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 50,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()

    result = []
    for log in logs:
        user_email = log.user.email if log.user else "System / Anonymous"
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": user_email,
            "action": log.action,
            "resource": log.resource,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "details": log.details,
            "status": log.status,
            "timestamp": log.timestamp
        })
    return result


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    query = db.query(User)
    if role:
        try:
            role_enum = UserRole(role.lower())
            query = query.filter(User.role == role_enum)
        except ValueError:
            pass

    return query.order_by(User.id.asc()).all()


@router.put("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    is_active: bool,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate own administrator account")

    user.is_active = is_active
    db.commit()

    log_audit_event(
        db, action="TOGGLE_USER_STATUS", resource=f"/api/admin/users/{user_id}",
        user_id=current_user.id, details=f"Set is_active={is_active} for {user.email}",
        status="SUCCESS", request=request
    )
    return {"message": f"User status updated to {'active' if is_active else 'inactive'}", "user_id": user.id, "is_active": user.is_active}
