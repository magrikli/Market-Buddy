import type { User, Department, Project, DepartmentGroup, Company } from './store';

const API_BASE = '/api';

// Generic fetch wrapper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies with requests
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
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

export async function getCurrentUser(): Promise<{ user: User }> {
  return fetchAPI('/auth/me');
}

export async function logout(): Promise<void> {
  return fetchAPI('/auth/logout', {
    method: 'POST',
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return fetchAPI('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });
}

// === USERS ===

export interface UserWithAssignments {
  id: string;
  username: string;
  name: string;
  role: string;
  assignedDepartmentIds: string[];
  assignedProjectIds: string[];
  assignedCompanyIds: string[];
}

export async function getUsers(): Promise<UserWithAssignments[]> {
  return fetchAPI('/users');
}

export async function createUser(data: { username: string; password: string; name: string; role?: string }): Promise<UserWithAssignments> {
  return fetchAPI('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: { name?: string; role?: string; password?: string }): Promise<UserWithAssignments> {
  return fetchAPI(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return fetchAPI(`/users/${id}`, {
    method: 'DELETE',
  });
}

export async function updateUserAssignments(id: string, data: { departmentIds?: string[]; projectIds?: string[] }): Promise<{ assignedDepartmentIds: string[]; assignedProjectIds: string[] }> {
  return fetchAPI(`/users/${id}/assignments`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// === DEPARTMENT GROUPS ===

export async function getDepartmentGroups(): Promise<DepartmentGroup[]> {
  return fetchAPI('/department-groups');
}

export async function createDepartmentGroup(name: string): Promise<DepartmentGroup> {
  return fetchAPI('/department-groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateDepartmentGroup(id: string, updates: { name?: string; sortOrder?: number }): Promise<DepartmentGroup> {
  return fetchAPI(`/department-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteDepartmentGroup(id: string): Promise<void> {
  return fetchAPI(`/department-groups/${id}`, {
    method: 'DELETE',
  });
}

// === DEPARTMENTS ===

export async function getDepartments(year: number = 2025, companyId?: string | null): Promise<Department[]> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  return fetchAPI(`/departments?${params.toString()}`);
}

export async function createDepartment(name: string, companyId?: string | null): Promise<Department> {
  return fetchAPI('/departments', {
    method: 'POST',
    body: JSON.stringify({ name, companyId }),
  });
}

export async function updateDepartment(id: string, updates: { name?: string; groupId?: string | null; sortOrder?: number }): Promise<Department> {
  return fetchAPI(`/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  return fetchAPI(`/departments/${id}`, {
    method: 'DELETE',
  });
}

export async function createCostGroup(data: { name: string; departmentId: string }): Promise<any> {
  return fetchAPI('/cost-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCostGroup(id: string, updates: { name?: string; sortOrder?: number }): Promise<any> {
  return fetchAPI(`/cost-groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteCostGroup(id: string): Promise<void> {
  return fetchAPI(`/cost-groups/${id}`, {
    method: 'DELETE',
  });
}

// === PROJECTS ===

export async function getProjects(year: number = 2025, companyId?: string | null): Promise<Project[]> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  return fetchAPI(`/projects?${params.toString()}`);
}

export async function createProject(name: string, companyId: string, code?: string, projectTypeId?: string): Promise<Project> {
  return fetchAPI('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, code, companyId, projectTypeId }),
  });
}

export async function updateProject(id: string, data: { name?: string; code?: string }): Promise<Project> {
  return fetchAPI(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return fetchAPI(`/projects/${id}`, {
    method: 'DELETE',
  });
}

export async function createProjectPhase(data: { name: string; projectId: string }): Promise<any> {
  return fetchAPI('/project-phases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectPhase(id: string, name: string): Promise<any> {
  return fetchAPI(`/project-phases/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deleteProjectPhase(id: string): Promise<void> {
  return fetchAPI(`/project-phases/${id}`, {
    method: 'DELETE',
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

export async function updateBudgetItem(id: string, data: { monthlyValues?: any; status?: string; sortOrder?: number }): Promise<any> {
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

export async function deleteBudgetItem(id: string): Promise<void> {
  return fetchAPI(`/budget-items/${id}`, {
    method: 'DELETE',
  });
}

export async function reviseBudgetItem(id: string, editorName: string, revisionReason?: string): Promise<any> {
  return fetchAPI(`/budget-items/${id}/revise`, {
    method: 'POST',
    body: JSON.stringify({ editorName, revisionReason }),
  });
}

export async function revertBudgetItem(id: string): Promise<any> {
  return fetchAPI(`/budget-items/${id}/revert`, {
    method: 'POST',
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
  csvFileName?: string;
  csvRowNumber?: number;
}): Promise<any> {
  return fetchAPI('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTransaction(id: string, data: {
  type?: 'expense' | 'revenue';
  amount?: number;
  description?: string;
  date?: string;
  budgetItemId?: string;
  csvFileName?: string;
  csvRowNumber?: number;
}): Promise<any> {
  return fetchAPI(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTransactionsByCsvFileName(fileName: string): Promise<{ deletedCount: number; fileName: string }> {
  return fetchAPI(`/transactions/by-csv/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
  });
}

// === DASHBOARD ===

export interface DashboardStats {
  totalActuals: number;
  pendingCount: number;
  monthlyData: { [month: number]: { budget: number; actual: number } };
  recentTransactions: any[];
}

export async function getDashboardStats(year: number, companyId?: string | null): Promise<DashboardStats> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  return fetchAPI(`/dashboard/stats?${params.toString()}`);
}

export interface PieChartDataItem {
  name: string;
  value: number;
  percentage: number;
}

export interface PieChartResponse {
  data: PieChartDataItem[];
  total: number;
}

export async function getExpenseRatio(year: number, companyId?: string | null): Promise<PieChartResponse> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  return fetchAPI(`/dashboard/expense-ratio?${params.toString()}`);
}

export async function getDepartmentGroupsBreakdown(year: number, companyId?: string | null, departmentId?: string | null): Promise<PieChartResponse> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  if (departmentId) params.append('departmentId', departmentId);
  return fetchAPI(`/dashboard/department-groups?${params.toString()}`);
}

export async function getProjectPhases(year: number, companyId?: string | null, projectId?: string | null): Promise<PieChartResponse> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  if (projectId) params.append('projectId', projectId);
  return fetchAPI(`/dashboard/project-phases?${params.toString()}`);
}

export async function getBudgetRatio(year: number, companyId?: string | null): Promise<PieChartResponse> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  return fetchAPI(`/dashboard/budget-ratio?${params.toString()}`);
}

export async function getBudgetDepartmentGroupsBreakdown(year: number, companyId?: string | null, departmentId?: string | null): Promise<PieChartResponse> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  if (departmentId) params.append('departmentId', departmentId);
  return fetchAPI(`/dashboard/budget-department-groups?${params.toString()}`);
}

export async function getBudgetProjectPhasesBreakdown(year: number, companyId?: string | null, projectId?: string | null): Promise<PieChartResponse> {
  const params = new URLSearchParams({ year: String(year) });
  if (companyId) params.append('companyId', companyId);
  if (projectId) params.append('projectId', projectId);
  return fetchAPI(`/dashboard/budget-project-phases?${params.toString()}`);
}

// === COMPANIES ===

export async function getCompanies(): Promise<Company[]> {
  return fetchAPI('/companies');
}

export async function createCompany(data: { name: string; code: string }): Promise<Company> {
  return fetchAPI('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompany(id: string, data: { name?: string; code?: string }): Promise<Company> {
  return fetchAPI(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(id: string): Promise<void> {
  return fetchAPI(`/companies/${id}`, {
    method: 'DELETE',
  });
}

export async function updateUserCompanyAssignments(id: string, companyIds: string[]): Promise<{ assignedCompanyIds: string[] }> {
  return fetchAPI(`/users/${id}/company-assignments`, {
    method: 'PUT',
    body: JSON.stringify({ companyIds }),
  });
}

// === PROJECT PROCESSES ===

export interface ProjectProcessHistory {
  revision: number;
  date: string;
  startDate: string;
  endDate: string;
  revisionReason?: string;
  editor: string;
}

export interface ProjectProcess {
  id: string;
  name: string;
  projectId: string;
  wbs: string; // Work Breakdown Structure - hierarchical numbering like "1", "1.1", "1.2"
  startDate: string;
  endDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  currentRevision: number;
  previousStartDate: string | null;
  previousEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  history: ProjectProcessHistory[];
}

export async function getProjectProcesses(projectId: string): Promise<ProjectProcess[]> {
  return fetchAPI(`/project-processes/${projectId}`);
}

export async function getPendingProcesses(): Promise<ProjectProcess[]> {
  return fetchAPI('/pending-processes');
}

// === PENDING BUDGET ITEMS ===

export interface PendingBudgetItem {
  id: string;
  name: string;
  type: string;
  costGroupId: string | null;
  projectPhaseId: string | null;
  monthlyValues: Record<string, number>;
  previousApprovedValues: Record<string, number> | null;
  status: string;
  currentRevision: number;
  year: number;
  createdAt: string;
  updatedAt: string;
  departmentName: string;
  costGroupName: string;
}

export async function getPendingBudgetItems(year: number): Promise<PendingBudgetItem[]> {
  return fetchAPI(`/pending-budget-items?year=${year}`);
}

export async function rejectBudgetItem(id: string): Promise<any> {
  return fetchAPI(`/budget-items/${id}/reject`, {
    method: 'POST',
  });
}

export async function bulkApproveBudgetItems(ids: string[]): Promise<{ approvedCount: number }> {
  return fetchAPI('/budget-items/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function createProjectProcess(data: {
  name: string;
  projectId: string;
  wbs: string;
  startDate: string;
  endDate: string;
}): Promise<ProjectProcess> {
  return fetchAPI('/project-processes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectProcess(id: string, data: {
  name?: string;
  startDate?: string;
  endDate?: string;
  wbs?: string;
  status?: string;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
}): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function startProcess(id: string): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}/start`, {
    method: 'POST',
  });
}

export async function finishProcess(id: string): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}/finish`, {
    method: 'POST',
  });
}

export async function submitProcessForApproval(id: string): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}/submit-for-approval`, {
    method: 'POST',
  });
}

export async function approveProcess(id: string): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectProcess(id: string): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}/reject`, {
    method: 'POST',
  });
}

export async function bulkApproveProcesses(ids: string[]): Promise<{ approvedCount: number }> {
  return fetchAPI('/project-processes/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function reviseProcess(id: string, editorName: string, revisionReason?: string): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}/revise`, {
    method: 'POST',
    body: JSON.stringify({ editorName, revisionReason }),
  });
}

export async function revertProcess(id: string): Promise<ProjectProcess> {
  return fetchAPI(`/project-processes/${id}/revert`, {
    method: 'POST',
  });
}

export async function deleteProjectProcess(id: string): Promise<void> {
  return fetchAPI(`/project-processes/${id}`, {
    method: 'DELETE',
  });
}

// === PROJECT TYPES ===

export interface ProjectType {
  id: string;
  name: string;
  code: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ProjectTypePhase {
  id: string;
  projectTypeId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export async function getProjectTypes(): Promise<ProjectType[]> {
  return fetchAPI('/project-types');
}

export async function getProjectType(id: string): Promise<ProjectType> {
  return fetchAPI(`/project-types/${id}`);
}

export async function createProjectType(data: { name: string; code?: string; sortOrder?: number }): Promise<ProjectType> {
  return fetchAPI('/project-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectType(id: string, data: { name?: string; code?: string; sortOrder?: number }): Promise<ProjectType> {
  return fetchAPI(`/project-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProjectType(id: string): Promise<void> {
  return fetchAPI(`/project-types/${id}`, {
    method: 'DELETE',
  });
}

export async function reorderProjectTypes(id1: string, id2: string): Promise<{ success: boolean }> {
  return fetchAPI('/project-types/reorder', {
    method: 'POST',
    body: JSON.stringify({ id1, id2 }),
  });
}

// === PROJECT TYPE PHASES ===

export async function getProjectTypePhases(projectTypeId: string, phaseType?: 'cost' | 'revenue'): Promise<ProjectTypePhase[]> {
  const url = phaseType 
    ? `/project-types/${projectTypeId}/phases?type=${phaseType}`
    : `/project-types/${projectTypeId}/phases`;
  return fetchAPI(url);
}

export async function createProjectTypePhase(projectTypeId: string, data: { name: string; sortOrder?: number; type?: 'cost' | 'revenue' }): Promise<ProjectTypePhase> {
  return fetchAPI(`/project-types/${projectTypeId}/phases`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectTypePhase(id: string, data: { name?: string; sortOrder?: number }): Promise<ProjectTypePhase> {
  return fetchAPI(`/project-type-phases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProjectTypePhase(id: string): Promise<void> {
  return fetchAPI(`/project-type-phases/${id}`, {
    method: 'DELETE',
  });
}

export async function reorderProjectTypePhases(id1: string, id2: string): Promise<{ success: boolean }> {
  return fetchAPI('/project-type-phases/reorder', {
    method: 'POST',
    body: JSON.stringify({ id1, id2 }),
  });
}
