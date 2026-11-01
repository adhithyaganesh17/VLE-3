from typing import Optional, Any
import json
from sqlalchemy.orm import Session
from fastapi import Request
from backend.app.models.models import AuditLog


def log_audit_event(
    db: Session,
    action: str,
    resource: str,
    user_id: Optional[int] = None,
    details: Optional[Any] = None,
    status: str = "SUCCESS",
    request: Optional[Request] = None
):
    """Record an audit trail event for security and compliance."""
    ip_address = None
    user_agent = None
    
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    details_str = None
    if details:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str)
        else:
            details_str = str(details)

    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details_str,
        status=status
    )
    
    try:
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        # Fallback to stdout in production logging to not disrupt primary flow
        print(f"[AUDIT LOGGING ERROR] Failed to record event {action}: {e}")
