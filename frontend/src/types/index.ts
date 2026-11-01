export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
  patient_id?: number;
  doctor_id?: number;
  specialization?: string;
  department?: string;
  license_number?: string;
  blood_group?: string;
  allergies?: string;
  medical_history?: string;
}

export interface Doctor {
  id: number;
  user_id: number;
  user?: User;
  specialization: string;
  department: string;
  license_number: string;
  room_number?: string;
  experience_years: number;
  consultation_fee: number;
  available_days: string;
}

export interface Patient {
  id: number;
  user_id: number;
  user?: User;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  emergency_contact?: string;
  allergies?: string;
  medical_history?: string;
}

export interface Prescription {
  id: number;
  consultation_id?: number;
  patient_id: number;
  doctor_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  created_at: string;
  doctor_name?: string;
  patient_name?: string;
}

export interface Consultation {
  id: number;
  appointment_id: number;
  doctor_id: number;
  patient_id: number;
  diagnosis: string;
  symptoms: string;
  clinical_notes?: string;
  follow_up_date?: string;
  created_at: string;
  prescriptions: Prescription[];
  doctor_name?: string;
  patient_name?: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  doctor_department?: string;
  consultation?: Consultation;
}

export interface LabReport {
  id: number;
  patient_id: number;
  doctor_id?: number;
  test_name: string;
  test_category: string;
  test_date: string;
  results_summary: string;
  status: 'PENDING' | 'COMPLETED' | 'CRITICAL';
  file_reference?: string;
  normal_range?: string;
  created_at: string;
  doctor_name?: string;
  patient_name?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  resource: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  status: string;
  timestamp: string;
}

export interface AdminAnalytics {
  total_patients: number;
  total_doctors: number;
  total_appointments: number;
  completed_consultations: number;
  pending_appointments: number;
  department_stats: { department: string; doctors_count: number }[];
  monthly_trends: { month: string; appointments: number; consultations: number; admissions: number }[];
  status_distribution: { status: string; count: number }[];
}

export interface SystemMetrics {
  source: string;
  host_cpu_percent: number;
  process_cpu_percent: number;
  process_memory_mb: number;
  host_memory_total_mb: number;
  host_memory_used_mb: number;
  host_memory_percent: number;
  os: string;
  python_version: string;
}

export interface DevOpsStatus {
  app_name: string;
  app_version: string;
  environment: 'blue' | 'green' | string;
  uptime_seconds: number;
  status: string;
  timestamp: string;
  hostname: string;
  is_kubernetes?: boolean;
  database_connected: boolean;
  system_metrics: SystemMetrics;
  active_pods: {
    name: string;
    component: string;
    environment: string;
    status: string;
    ready: string;
    restarts: number;
    age: string;
    ip: string;
    node: string;
  }[];
  deployment_info: {
    strategy: string;
    active_color: string;
    standby_color: string;
    service_selector: string;
    last_switch_timestamp: string;
    total_deployments: number;
  };
}

export interface SecurityScanReport {
  overall_status: string;
  last_scan_timestamp: string;
  gitleaks: {
    scanner: string;
    status: string;
    findings_count: number;
    description: string;
    rules_evaluated: number;
    execution_duration_sec: number;
  };
  bandit: {
    scanner: string;
    status: string;
    total_lines_scanned: number;
    issues: { high: number; medium: number; low: number };
    notes: string;
  };
  trivy: {
    scanner: string;
    status: string;
    target: string;
    vulnerabilities: { critical: number; high: number; medium: number; low: number };
    remediation_status: string;
    os_base_image: string;
  };
  sonarqube: {
    scanner: string;
    status: string;
    quality_gate: string;
    reliability_rating: string;
    security_rating: string;
    maintainability_rating: string;
    coverage_percent: number;
    code_smells: number;
  };
}
