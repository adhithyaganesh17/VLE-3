# MEDORA — DevSecOps & Healthcare Compliance Architecture

This document details the **Secure DevOps (DevSecOps)** implementation in MEDORA, satisfying **PBL-III Objective 3**.

---

## 1. DevSecOps Philosophy & Shift-Left Model

In traditional software delivery, security is treated as an afterthought conducted during pre-release penetration testing. In MEDORA, security is shifted left directly into every commit, test suite, container build, and deployment stage:

```
[ Developer Commit ] ──> [ Gitleaks (Zero Secrets) ]
                              │
[ Static Analysis ]   ──> [ Bandit AST (Python Flaws) ] + [ SonarQube Quality Gate ]
                              │
[ Container Build ]   ──> [ Trivy (OS & Library CVEs) ]
                              │
[ Kubernetes Target ] ──> [ Non-Root Containers + Network Policies + RBAC ]
                              │
[ Runtime Ops ]       ──> [ HIPAA Immutable Audit Logs + JWT RBAC Enforcement ]
```

---

## 2. DevSecOps Tooling Matrix

| Tool | Phase | Scope | Threshold / Rule Enforced |
| :--- | :--- | :--- | :--- |
| **Gitleaks** | Pre-Commit / CI Stage 7 | Repository Git History | Fails build if any private key, API secret, or JWT token is committed (`.gitleaks.toml`). |
| **Bandit** | Code Analysis / CI Stage 8 | Python Backend Code | Scans AST for SQL injection vectors (`B608`), hardcoded credentials (`B105`), and unsafe deserialization (`B301`). |
| **Trivy** | Image Scan / CI Stage 9 & 11 | Filesystem & Docker Images | Scans container OS packages and Python wheels. Blocks deployment if Critical/High CVEs exist. |
| **SonarQube** | Static Analysis / CI Stage 6 | Code Quality & Vulnerability | Enforces Grade A in Security, Reliability, and Maintainability; requires >80% test coverage. |
| **K8s Security** | Admission & Runtime | Pods & Cluster Network | Enforces `runAsNonRoot: true`, strict `NetworkPolicy` ingress/egress, and namespaced RBAC. |

---

## 3. Kubernetes Hardening Standards

### A. Non-Root Execution (`runAsNonRoot: true`)
All backend and frontend containers run as unprivileged user `UID 10001` (`appuser`). 
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  runAsGroup: 10001
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```
If an attacker compromises the application layer via a code vulnerability, they cannot execute root-level kernel escalations, write to `/bin` or `/etc`, or alter system configurations.

### B. Network Policies (Zero-Trust Micro-Segmentation)
Located at `k8s/security/network-policies.yaml`:
1. **Default Deny Policy**: Drops all unapproved ingress and egress packets across the `medora` namespace.
2. **Frontend Isolation**: Can only accept port 80 traffic and egress to backend pods on port 8000.
3. **Backend Isolation**: Can only accept incoming connections from frontend pods and Prometheus. Egress is strictly permitted to PostgreSQL on port 5432 and CoreDNS on port 53.
4. **Database Protection**: Database pods only accept incoming connections from authenticated backend pods. Direct database access from frontend or external users is blocked at the SDN layer.

### C. Role-Based Access Control (RBAC)
Located at `k8s/security/rbac.yaml`:
- The application uses a dedicated ServiceAccount (`medora-sa`).
- The automated Jenkins deployer has namespaced privileges (`medora-jenkins-deployer-role`) restricted to patching Deployments and Services in the `medora` namespace. Cluster-admin privileges are never granted.

---

## 4. Healthcare Application Security & HIPAA Safeguards

### A. Authentication & Password Security
- Passwords are encrypted using **Bcrypt** with adaptive work factor salt rounds (`rounds=12`).
- Authentication returns signed **JWT** tokens using `HS256` with configurable session expiry (`ACCESS_TOKEN_EXPIRE_MINUTES`).

### B. Role-Based Authorization (RBAC)
- **Patient**: Can only view their own appointments, medical history, and lab reports. Cannot view other patients' data or issue prescriptions.
- **Doctor**: Can view assigned patient queues, record clinical observations, and issue digital prescriptions. Cannot modify hospital administrator policies.
- **Administrator**: Governs user accounts, inspects regulatory audit logs, and monitors hospital capacity.

### C. HIPAA §164.312 Audit Logs
All critical clinical events (logins, appointment scheduling, cancellations, and diagnoses) are recorded in the PostgreSQL `audit_logs` table:
```json
{
  "timestamp": "2026-11-01T18:00:00Z",
  "action": "CREATE_CONSULTATION",
  "resource": "/api/consultations",
  "user_email": "doctor.sarah@medora.health",
  "ip_address": "192.168.1.105",
  "status": "SUCCESS",
  "details": "Diagnosis: Primary Hypertension for appointment #1"
}
```
This tamper-resistant log is queryable directly through the Administrator Dashboard for regulatory verification.
