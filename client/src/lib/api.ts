import type { User, Department, Project } from './store';

const API_BASE = '/api';

// Generic fetch wrapper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// === AUTH ===

export async function login(username: string, password: string): Promise<{ user: User }> {
  return fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(data: { username: string; password: string; name: string; role?: string }): Promise<{ user: User }> {
  return fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// === DEPARTMENTS ===

export async function getDepartments(year: number = 2025): Promise<Department[]> {
  return fetchAPI(`/departments?year=${year}`);
}

export async function createDepartment(name: string): Promise<Department> {
  return fetchAPI('/departments', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function createCostGroup(data: { name: string; departmentId: string }): Promise<any> {
  return fetchAPI('/cost-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// === PROJECTS ===

export async function getProjects(year: number = 2025): Promise<Project[]> {
  return fetchAPI(`/projects?year=${year}`);
}

export async function createProject(name: string): Promise<Project> {
  return fetchAPI('/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function createProjectPhase(data: { name: string; projectId: string }): Promise<any> {
  return fetchAPI('/project-phases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// === BUDGET ITEMS ===

export async function createBudgetItem(data: {
  name: string;
  type: 'cost' | 'revenue';
  costGroupId?: string;
  projectPhaseId?: string;
  monthlyValues?: any;
  year?: number;
}): Promise<any> {
  return fetchAPI('/budget-items', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      monthlyValues: data.monthlyValues || {},
      year: data.year || 2025,
      status: 'draft',
      currentRevision: 0,
    }),
  });
}

export async function updateBudgetItem(id: string, data: { monthlyValues?: any; status?: string }): Promise<any> {
  return fetchAPI(`/budget-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function approveBudgetItem(id: string): Promise<any> {
  return fetchAPI(`/budget-items/${id}/approve`, {
    method: 'POST',
  });
}

export async function reviseBudgetItem(id: string, editorName: string): Promise<any> {
  return fetchAPI(`/budget-items/${id}/revise`, {
    method: 'POST',
    body: JSON.stringify({ editorName }),
  });
}

// === TRANSACTIONS ===

export async function getTransactions(limit?: number): Promise<any[]> {
  return fetchAPI(`/transactions${limit ? `?limit=${limit}` : ''}`);
}

export async function createTransaction(data: {
  type: 'expense' | 'revenue';
  amount: number;
  description: string;
  date: string;
  budgetItemId?: string;
}): Promise<any> {
  return fetchAPI('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
