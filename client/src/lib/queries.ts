import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { User } from './store';

// Query keys
export const queryKeys = {
  user: ['user'] as const,
  users: ['users'] as const,
  companies: ['companies'] as const,
  departmentGroups: ['departmentGroups'] as const,
  departments: (year: number, companyId?: string | null) => ['departments', year, companyId] as const,
  projects: (year: number, companyId?: string | null) => ['projects', year, companyId] as const,
  transactions: (limit?: number) => ['transactions', limit] as const,
  dashboardStats: (year: number, companyId?: string | null) => ['dashboardStats', year, companyId] as const,
  expenseRatio: (year: number, companyId?: string | null) => ['expenseRatio', year, companyId] as const,
  departmentGroupsBreakdown: (year: number, companyId?: string | null, departmentId?: string | null) => ['departmentGroupsBreakdown', year, companyId, departmentId] as const,
  projectPhasesBreakdown: (year: number, companyId?: string | null, projectId?: string | null) => ['projectPhasesBreakdown', year, companyId, projectId] as const,
  budgetRatio: (year: number, companyId?: string | null) => ['budgetRatio', year, companyId] as const,
  budgetDepartmentGroupsBreakdown: (year: number, companyId?: string | null, departmentId?: string | null) => ['budgetDepartmentGroupsBreakdown', year, companyId, departmentId] as const,
  budgetProjectPhasesBreakdown: (year: number, companyId?: string | null, projectId?: string | null) => ['budgetProjectPhasesBreakdown', year, companyId, projectId] as const,
};

// === AUTH ===

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user, data.user);
    },
  });
}

// === USERS ===

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.getUsers(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password: string; name: string; role?: string }) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; role?: string; password?: string } }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUpdateUserAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { departmentIds?: string[]; projectIds?: string[] } }) => api.updateUserAssignments(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

// === DEPARTMENT GROUPS ===

export function useDepartmentGroups() {
  return useQuery({
    queryKey: queryKeys.departmentGroups,
    queryFn: () => api.getDepartmentGroups(),
  });
}

export function useCreateDepartmentGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createDepartmentGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departmentGroups });
    },
  });
}

export function useUpdateDepartmentGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; sortOrder?: number } }) => api.updateDepartmentGroup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departmentGroups });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
    },
  });
}

export function useDeleteDepartmentGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDepartmentGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departmentGroups });
    },
  });
}

// === DEPARTMENTS ===

export function useDepartments(year: number = 2025, companyId?: string | null) {
  return useQuery({
    queryKey: queryKeys.departments(year, companyId),
    queryFn: () => api.getDepartments(year, companyId),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, companyId }: { name: string; companyId?: string | null }) => api.createDepartment(name, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
    },
  });
}

export function useCreateCostGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; departmentId: string }) => api.createCostGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; groupId?: string | null; sortOrder?: number } }) => 
      api.updateDepartment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
    },
  });
}

export function useUpdateCostGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; sortOrder?: number } }) => api.updateCostGroup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
    },
  });
}

export function useDeleteCostGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCostGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
    },
  });
}

// === PROJECTS ===

export function useProjects(year: number = 2025, companyId?: string | null) {
  return useQuery({
    queryKey: queryKeys.projects(year, companyId),
    queryFn: () => api.getProjects(year, companyId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, code, companyId, projectTypeId }: { name: string; code?: string; companyId: string; projectTypeId?: string }) => 
      api.createProject(name, companyId, code, projectTypeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, code }: { id: string; name?: string; code?: string }) => api.updateProject(id, { name, code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateProjectPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; projectId: string }) => api.createProjectPhase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
    },
  });
}

export function useUpdateProjectPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateProjectPhase(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
    },
  });
}

export function useDeleteProjectPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProjectPhase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
    },
  });
}

// === BUDGET ITEMS ===

export function useCreateBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      type: 'cost' | 'revenue';
      costGroupId?: string;
      projectPhaseId?: string;
      monthlyValues?: any;
      year?: number;
    }) => api.createBudgetItem(data),
    onSuccess: (_, variables) => {
      if (variables.costGroupId) {
        queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
      }
      if (variables.projectPhaseId) {
        queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
      }
    },
  });
}

export function useUpdateBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { monthlyValues?: any; status?: string; sortOrder?: number } }) =>
      api.updateBudgetItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useReviseBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, editorName, revisionReason }: { id: string; editorName: string; revisionReason?: string }) =>
      api.reviseBudgetItem(id, editorName, revisionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRevertBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revertBudgetItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBudgetItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// === TRANSACTIONS ===

export function useTransactions(limit?: number) {
  return useQuery({
    queryKey: queryKeys.transactions(limit),
    queryFn: () => api.getTransactions(limit),
  });
}

// === DASHBOARD ===

export function useDashboardStats(year: number, companyId?: string | null) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(year, companyId),
    queryFn: () => api.getDashboardStats(year, companyId),
  });
}

export function useExpenseRatio(year: number, companyId?: string | null) {
  return useQuery({
    queryKey: queryKeys.expenseRatio(year, companyId),
    queryFn: () => api.getExpenseRatio(year, companyId),
  });
}

export function useDepartmentGroupsBreakdown(year: number, companyId?: string | null, departmentId?: string | null) {
  return useQuery({
    queryKey: queryKeys.departmentGroupsBreakdown(year, companyId, departmentId),
    queryFn: () => api.getDepartmentGroupsBreakdown(year, companyId, departmentId),
  });
}

export function useProjectPhasesBreakdown(year: number, companyId?: string | null, projectId?: string | null) {
  return useQuery({
    queryKey: queryKeys.projectPhasesBreakdown(year, companyId, projectId),
    queryFn: () => api.getProjectPhases(year, companyId, projectId),
  });
}

export function useBudgetRatio(year: number, companyId?: string | null) {
  return useQuery({
    queryKey: queryKeys.budgetRatio(year, companyId),
    queryFn: () => api.getBudgetRatio(year, companyId),
  });
}

export function useBudgetDepartmentGroupsBreakdown(year: number, companyId?: string | null, departmentId?: string | null) {
  return useQuery({
    queryKey: queryKeys.budgetDepartmentGroupsBreakdown(year, companyId, departmentId),
    queryFn: () => api.getBudgetDepartmentGroupsBreakdown(year, companyId, departmentId),
  });
}

export function useBudgetProjectPhasesBreakdown(year: number, companyId?: string | null, projectId?: string | null) {
  return useQuery({
    queryKey: queryKeys.budgetProjectPhasesBreakdown(year, companyId, projectId),
    queryFn: () => api.getBudgetProjectPhasesBreakdown(year, companyId, projectId),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: 'expense' | 'revenue';
      amount: number;
      description: string;
      date: string;
      budgetItemId?: string;
      csvFileName?: string;
      csvRowNumber?: number;
    }) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
    },
  });
}

// === COMPANIES ===

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: () => api.getCompanies(),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string }) => api.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string } }) => api.updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
    },
  });
}

export function useUpdateUserCompanyAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyIds }: { id: string; companyIds: string[] }) => api.updateUserCompanyAssignments(id, companyIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

// === PENDING BUDGET ITEMS ===

export function usePendingBudgetItems(year: number) {
  return useQuery({
    queryKey: ['pendingBudgetItems', year],
    queryFn: () => api.getPendingBudgetItems(year),
  });
}

export function useApproveBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.approveBudgetItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingBudgetItems'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
    },
  });
}

export function useRejectBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.rejectBudgetItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingBudgetItems'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
    },
  });
}

export function useBulkApproveBudgetItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkApproveBudgetItems(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingBudgetItems'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'departments' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'projects' });
    },
  });
}

// === PROJECT PROCESSES ===

export function useProjectProcesses(projectId: string | null) {
  return useQuery({
    queryKey: ['projectProcesses', projectId],
    queryFn: () => projectId ? api.getProjectProcesses(projectId) : Promise.resolve([]),
    enabled: !!projectId,
  });
}

export function usePendingProcesses() {
  return useQuery({
    queryKey: ['pendingProcesses'],
    queryFn: () => api.getPendingProcesses(),
  });
}

export function useCreateProjectProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      projectId: string;
      wbs: string;
      startDate: string;
      endDate: string;
    }) => api.createProjectProcess(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
    },
  });
}

export function useUpdateProjectProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, data }: { id: string; projectId: string; data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      wbs?: string;
      status?: string;
    }}) => api.updateProjectProcess(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
    },
  });
}

export function useSubmitProcessForApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) => api.submitProcessForApproval(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['pendingProcesses'] });
    },
  });
}

export function useApproveProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) => api.approveProcess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['pendingProcesses'] });
    },
  });
}

export function useRejectProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) => api.rejectProcess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['pendingProcesses'] });
    },
  });
}

export function useBulkApproveProcesses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.bulkApproveProcesses(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses'] });
      queryClient.invalidateQueries({ queryKey: ['pendingProcesses'] });
    },
  });
}

export function useStartProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) => api.startProcess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
    },
  });
}

export function useFinishProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) => api.finishProcess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
    },
  });
}

export function useReviseProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId, editorName, revisionReason }: { id: string; projectId: string; editorName: string; revisionReason?: string }) =>
      api.reviseProcess(id, editorName, revisionReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
    },
  });
}

export function useRevertProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) => api.revertProcess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
    },
  });
}

export function useDeleteProjectProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) => api.deleteProjectProcess(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectProcesses', variables.projectId] });
    },
  });
}

// === PROJECT TYPES ===

export function useProjectTypes() {
  return useQuery({
    queryKey: ['projectTypes'] as const,
    queryFn: () => api.getProjectTypes(),
  });
}

export function useCreateProjectType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code?: string; sortOrder?: number }) => api.createProjectType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
    },
  });
}

export function useUpdateProjectType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string; sortOrder?: number } }) => api.updateProjectType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
    },
  });
}

export function useDeleteProjectType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProjectType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
    },
  });
}

export function useReorderProjectTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id1, id2 }: { id1: string; id2: string }) => api.reorderProjectTypes(id1, id2),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTypes'] });
    },
  });
}

// === PROJECT TYPE PHASES ===

export function useProjectTypePhases(projectTypeId: string | null, phaseType?: 'cost' | 'revenue') {
  return useQuery({
    queryKey: ['projectTypePhases', projectTypeId, phaseType] as const,
    queryFn: () => projectTypeId ? api.getProjectTypePhases(projectTypeId, phaseType) : Promise.resolve([]),
    enabled: !!projectTypeId,
  });
}

export function useCreateProjectTypePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectTypeId, data }: { projectTypeId: string; data: { name: string; sortOrder?: number; type?: 'cost' | 'revenue' } }) => 
      api.createProjectTypePhase(projectTypeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectTypePhases', variables.projectTypeId] });
    },
  });
}

export function useUpdateProjectTypePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectTypeId, data }: { id: string; projectTypeId: string; data: { name?: string; sortOrder?: number } }) => 
      api.updateProjectTypePhase(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectTypePhases', variables.projectTypeId] });
    },
  });
}

export function useDeleteProjectTypePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectTypeId }: { id: string; projectTypeId: string }) => api.deleteProjectTypePhase(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectTypePhases', variables.projectTypeId] });
    },
  });
}

export function useReorderProjectTypePhases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id1, id2, projectTypeId }: { id1: string; id2: string; projectTypeId: string }) => 
      api.reorderProjectTypePhases(id1, id2),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectTypePhases', variables.projectTypeId] });
    },
  });
}
