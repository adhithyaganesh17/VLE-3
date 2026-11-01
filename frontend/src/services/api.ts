const API_BASE = '';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('medora_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const data = await res.json();
      errorDetail = data.detail || data.message || JSON.stringify(data);
    } catch {
      errorDetail = `HTTP Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse<any>(res);
  },

  async register(userData: any) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse<any>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getDemoAccounts() {
    const res = await fetch(`${API_BASE}/api/auth/demo-accounts`);
    return handleResponse<any[]>(res);
  },

  // Patients
  async getPatients() {
    const res = await fetch(`${API_BASE}/api/patients`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  async getPatient(id: number) {
    const res = await fetch(`${API_BASE}/api/patients/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getPatientFullHistory(id: number) {
    const res = await fetch(`${API_BASE}/api/patients/${id}/full-history`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  // Doctors
  async getDoctors() {
    const res = await fetch(`${API_BASE}/api/doctors`);
    return handleResponse<any[]>(res);
  },

  // Appointments
  async getAppointments(status?: string) {
    const url = status ? `${API_BASE}/api/appointments?status_filter=${status}` : `${API_BASE}/api/appointments`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  async createAppointment(data: any) {
    const res = await fetch(`${API_BASE}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateAppointment(id: number, data: any) {
    const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async cancelAppointment(id: number) {
    const res = await fetch(`${API_BASE}/api/appointments/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  // Consultations
  async getConsultations() {
    const res = await fetch(`${API_BASE}/api/consultations`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  async createConsultation(data: any) {
    const res = await fetch(`${API_BASE}/api/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Prescriptions
  async getPrescriptions(patientId?: number) {
    const url = patientId ? `${API_BASE}/api/prescriptions?patient_id=${patientId}` : `${API_BASE}/api/prescriptions`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  // Lab Reports
  async getLabReports(patientId?: number) {
    const url = patientId ? `${API_BASE}/api/lab-reports?patient_id=${patientId}` : `${API_BASE}/api/lab-reports`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  // Admin
  async getAdminAnalytics() {
    const res = await fetch(`${API_BASE}/api/admin/analytics`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getAuditLogs(action?: string) {
    const url = action ? `${API_BASE}/api/admin/audit-logs?action=${action}` : `${API_BASE}/api/admin/audit-logs`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any[]>(res);
  },

  // DevOps & Health
  async getDevOpsStatus() {
    const res = await fetch(`${API_BASE}/api/devops/status`);
    return handleResponse<any>(res);
  },

  async getSecurityScans() {
    const res = await fetch(`${API_BASE}/api/devops/security-scans`);
    return handleResponse<any>(res);
  },

  async switchEnvironment(targetEnv: 'blue' | 'green') {
    const res = await fetch(`${API_BASE}/api/devops/switch-env?target_environment=${targetEnv}`, {
      method: 'POST',
    });
    return handleResponse<any>(res);
  },

  async getHealthProbe() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<any>(res);
  },

  async getReadyProbe() {
    const res = await fetch(`${API_BASE}/ready`);
    return handleResponse<any>(res);
  }
};
