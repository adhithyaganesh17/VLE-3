from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User, UserRole, Patient, Doctor, Appointment, AppointmentStatus,
    Consultation, Prescription, LabReport, LabStatus, AuditLog
)


def seed_database(db: Session):
    # Check if database is already seeded
    existing_user = db.query(User).filter(User.email == "admin@medora.health").first()
    if existing_user:
        print("[SEED] Database already contains initial data. Skipping.")
        return

    print("[SEED] Seeding MEDORA database with synthetic clinical records...")

    # --- 1. Create Users ---
    # Admin
    admin_user = User(
        email="admin@medora.health",
        hashed_password=get_password_hash("Admin@12345"),
        full_name="Hospital Administrator",
        role=UserRole.ADMIN,
        phone="+1 (555) 019-2831",
        is_active=True
    )
    db.add(admin_user)

    # Doctors
    doc1_user = User(
        email="doctor.sarah@medora.health",
        hashed_password=get_password_hash("Doctor@12345"),
        full_name="Dr. Sarah Jenkins",
        role=UserRole.DOCTOR,
        phone="+1 (555) 014-9921",
        is_active=True
    )
    doc2_user = User(
        email="doctor.chen@medora.health",
        hashed_password=get_password_hash("Doctor@12345"),
        full_name="Dr. Michael Chen",
        role=UserRole.DOCTOR,
        phone="+1 (555) 018-4432",
        is_active=True
    )
    doc3_user = User(
        email="doctor.patel@medora.health",
        hashed_password=get_password_hash("Doctor@12345"),
        full_name="Dr. Aisha Patel",
        role=UserRole.DOCTOR,
        phone="+1 (555) 017-8891",
        is_active=True
    )
    db.add_all([doc1_user, doc2_user, doc3_user])

    # Patients
    pat1_user = User(
        email="patient.john@medora.health",
        hashed_password=get_password_hash("Patient@12345"),
        full_name="Johnathan Doe",
        role=UserRole.PATIENT,
        phone="+1 (555) 012-3456",
        is_active=True
    )
    pat2_user = User(
        email="patient.emma@medora.health",
        hashed_password=get_password_hash("Patient@12345"),
        full_name="Emma Watson",
        role=UserRole.PATIENT,
        phone="+1 (555) 013-8822",
        is_active=True
    )
    db.add_all([pat1_user, pat2_user])
    db.commit()

    # --- 2. Create Doctor Profiles ---
    doc1 = Doctor(
        user_id=doc1_user.id,
        specialization="Cardiology",
        department="Cardiovascular Institute",
        license_number="MD-CARD-88492",
        room_number="Suite 402",
        experience_years=14,
        consultation_fee=150,
        available_days="Mon,Tue,Wed,Thu,Fri"
    )
    doc2 = Doctor(
        user_id=doc2_user.id,
        specialization="Neurology",
        department="Neuroscience Department",
        license_number="MD-NEUR-77321",
        room_number="Suite 310",
        experience_years=10,
        consultation_fee=175,
        available_days="Mon,Wed,Fri"
    )
    doc3 = Doctor(
        user_id=doc3_user.id,
        specialization="Pediatrics",
        department="Children's Health Pavilion",
        license_number="MD-PED-66299",
        room_number="Suite 105",
        experience_years=8,
        consultation_fee=120,
        available_days="Tue,Thu,Sat"
    )
    db.add_all([doc1, doc2, doc3])

    # --- 3. Create Patient Profiles ---
    pat1 = Patient(
        user_id=pat1_user.id,
        date_of_birth="1985-06-14",
        gender="Male",
        blood_group="O+",
        address="742 Evergreen Terrace, Springfield",
        emergency_contact="Mary Doe (+1 555-012-3457)",
        allergies="Penicillin, Sulfa drugs",
        medical_history="Mild Hypertension diagnosed in 2021. Managed with lifestyle."
    )
    pat2 = Patient(
        user_id=pat2_user.id,
        date_of_birth="1992-11-20",
        gender="Female",
        blood_group="A+",
        address="10 Baker Street, Boston, MA",
        emergency_contact="Robert Watson (+1 555-013-8823)",
        allergies="None known",
        medical_history="Seasonal allergic rhinitis."
    )
    db.add_all([pat1, pat2])
    db.commit()

    # --- 4. Create Appointments ---
    today = datetime.now().date()
    yesterday = today - timedelta(days=2)
    tomorrow = today + timedelta(days=2)
    next_week = today + timedelta(days=7)

    apt1 = Appointment(
        patient_id=pat1.id,
        doctor_id=doc1.id,
        appointment_date=yesterday.strftime("%Y-%m-%d"),
        appointment_time="10:00 AM",
        status=AppointmentStatus.COMPLETED,
        reason="Annual cardiac checkup and blood pressure monitoring.",
        notes="Patient reports occasional exertion shortness of breath."
    )
    apt2 = Appointment(
        patient_id=pat1.id,
        doctor_id=doc2.id,
        appointment_date=tomorrow.strftime("%Y-%m-%d"),
        appointment_time="02:30 PM",
        status=AppointmentStatus.SCHEDULED,
        reason="Follow-up on episodic tension headaches.",
        notes="Review MRI brain results."
    )
    apt3 = Appointment(
        patient_id=pat2.id,
        doctor_id=doc1.id,
        appointment_date=next_week.strftime("%Y-%m-%d"),
        appointment_time="11:15 AM",
        status=AppointmentStatus.SCHEDULED,
        reason="Routine cardiovascular screening requested by employer.",
        notes="Pre-screen vitals standard."
    )
    apt4 = Appointment(
        patient_id=pat2.id,
        doctor_id=doc3.id,
        appointment_date=yesterday.strftime("%Y-%m-%d"),
        appointment_time="03:00 PM",
        status=AppointmentStatus.COMPLETED,
        reason="Consultation regarding seasonal allergy management.",
        notes="Prescribed antihistamines."
    )
    db.add_all([apt1, apt2, apt3, apt4])
    db.commit()

    # --- 5. Consultations and Prescriptions ---
    cons1 = Consultation(
        appointment_id=apt1.id,
        doctor_id=doc1.id,
        patient_id=pat1.id,
        diagnosis="Primary Hypertension (Stage 1) - Well Controlled",
        symptoms="Mild occasional palpitations, BP reading 134/86 mmHg.",
        clinical_notes="Electrocardiogram showed normal sinus rhythm. Advised low-sodium diet and daily brisk walking.",
        follow_up_date=(today + timedelta(days=90)).strftime("%Y-%m-%d")
    )
    db.add(cons1)
    db.commit()

    presc1 = Prescription(
        consultation_id=cons1.id,
        patient_id=pat1.id,
        doctor_id=doc1.id,
        medication_name="Amlodipine Besylate",
        dosage="5 mg",
        frequency="Once daily in the morning",
        duration_days=90,
        instructions="Take with water before breakfast. Monitor BP weekly."
    )
    presc2 = Prescription(
        consultation_id=cons1.id,
        patient_id=pat1.id,
        doctor_id=doc1.id,
        medication_name="Atorvastatin",
        dosage="10 mg",
        frequency="Once daily at bedtime",
        duration_days=90,
        instructions="For lipid profile management. Avoid grapefruit juice."
    )
    db.add_all([presc1, presc2])

    cons4 = Consultation(
        appointment_id=apt4.id,
        doctor_id=doc3.id,
        patient_id=pat2.id,
        diagnosis="Allergic Rhinitis with Mild Conjunctivitis",
        symptoms="Sneezing, nasal congestion, ocular pruritus during spring pollen season.",
        clinical_notes="Nasal mucosa pale and swollen. Lung fields clear bilaterally.",
        follow_up_date=(today + timedelta(days=60)).strftime("%Y-%m-%d")
    )
    db.add(cons4)
    db.commit()

    presc3 = Prescription(
        consultation_id=cons4.id,
        patient_id=pat2.id,
        doctor_id=doc3.id,
        medication_name="Fluticasone Propionate Nasal Spray",
        dosage="50 mcg/actuation",
        frequency="2 sprays each nostril daily",
        duration_days=30,
        instructions="Gently shake bottle before use. Prime before first dose."
    )
    presc4 = Prescription(
        consultation_id=cons4.id,
        patient_id=pat2.id,
        doctor_id=doc3.id,
        medication_name="Cetirizine HCl",
        dosage="10 mg",
        frequency="Once daily in evening",
        duration_days=30,
        instructions="Non-drowsy antihistamine for symptom relief."
    )
    db.add_all([presc3, presc4])

    # --- 6. Lab Reports ---
    lab1 = LabReport(
        patient_id=pat1.id,
        doctor_id=doc1.id,
        test_name="Lipid Panel Comprehensive",
        test_category="Biochemistry",
        test_date=yesterday.strftime("%Y-%m-%d"),
        results_summary="Total Cholesterol: 195 mg/dL, HDL: 48 mg/dL, LDL: 118 mg/dL, Triglycerides: 145 mg/dL. Moderately elevated LDL.",
        status=LabStatus.COMPLETED,
        normal_range="Total Chol < 200 mg/dL, LDL < 100 mg/dL",
        file_reference="LAB-LIPID-88219.pdf"
    )
    lab2 = LabReport(
        patient_id=pat1.id,
        doctor_id=doc2.id,
        test_name="Magnetic Resonance Imaging (MRI) Brain",
        test_category="Radiology",
        test_date=(today - timedelta(days=5)).strftime("%Y-%m-%d"),
        results_summary="No acute intracranial hemorrhage, mass effect, or midline shift. Ventricles and sulci normal for age.",
        status=LabStatus.COMPLETED,
        normal_range="Normal structural study",
        file_reference="MRI-BRAIN-99412.dicom"
    )
    lab3 = LabReport(
        patient_id=pat2.id,
        doctor_id=doc3.id,
        test_name="Complete Blood Count (CBC) with Differential",
        test_category="Hematology",
        test_date=yesterday.strftime("%Y-%m-%d"),
        results_summary="WBC: 6.8 x10^3/uL, RBC: 4.5 x10^6/uL, Hemoglobin: 13.8 g/dL, Platelets: 245 x10^3/uL. All markers within normal limits.",
        status=LabStatus.COMPLETED,
        normal_range="Normal limits",
        file_reference="CBC-DIFF-10924.pdf"
    )
    db.add_all([lab1, lab2, lab3])

    # --- 7. Audit Logs ---
    audit1 = AuditLog(
        user_id=admin_user.id,
        action="USER_LOGIN",
        resource="/api/auth/login",
        ip_address="192.168.1.100",
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        details="Admin user logged in successfully via multi-factor authenticated session.",
        status="SUCCESS",
        timestamp=datetime.now(timezone.utc) - timedelta(hours=3)
    )
    audit2 = AuditLog(
        user_id=doc1_user.id,
        action="CREATE_CONSULTATION",
        resource="/api/consultations",
        ip_address="192.168.1.105",
        user_agent="Medora-Desktop-Client/1.0",
        details=f"Doctor Sarah Jenkins completed consultation for appointment #{apt1.id}.",
        status="SUCCESS",
        timestamp=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    audit3 = AuditLog(
        user_id=pat1_user.id,
        action="BOOK_APPOINTMENT",
        resource="/api/appointments",
        ip_address="192.168.1.140",
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        details=f"Patient John Doe scheduled appointment #{apt2.id} with Dr. Michael Chen.",
        status="SUCCESS",
        timestamp=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    db.add_all([audit1, audit2, audit3])
    db.commit()

    print("[SEED] Successfully seeded MEDORA database with clinical records, users, and audit logs.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
