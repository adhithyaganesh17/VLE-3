from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.schemas.schemas import DevOpsStatus, SecurityScanReport
from backend.app.services.devops_service import (
    get_devops_status, get_security_scan_data, DEPLOYMENT_HISTORY, switch_active_environment
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/devops", tags=["DevOps Control Centre"])


def check_db_health(db: Session) -> bool:
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@router.get("/status", response_model=DevOpsStatus)
def get_status(db: Session = Depends(get_db)):
    db_healthy = check_db_health(db)
    return get_devops_status(db_healthy=db_healthy)


@router.get("/security-scans", response_model=SecurityScanReport)
def get_security_scans():
    return get_security_scan_data()


@router.get("/deployments")
def get_deployments():
    return DEPLOYMENT_HISTORY


@router.post("/switch-env")
def switch_environment(target_environment: str, request: Request, db: Session = Depends(get_db)):
    """
    Simulate or trigger Blue-Green Traffic cutover.
    Allows students/evaluators during viva to test the live transition between BLUE and GREEN.
    """
    target = target_environment.lower()
    if target not in ["blue", "green"]:
        raise HTTPException(status_code=400, detail="Target environment must be 'blue' or 'green'")

    new_record = switch_active_environment(target_env=target, reason="DevOps Portal Live Switch")

    log_audit_event(
        db, action="BLUE_GREEN_SWITCH", resource="/api/devops/switch-env",
        details=f"Traffic routed to {target.upper()} environment. Deployment ID: {new_record['id']}",
        status="SUCCESS", request=request
    )

    return {
        "message": f"Successfully switched active environment to {target.upper()}",
        "active_environment": target.upper(),
        "deployment": new_record
    }
