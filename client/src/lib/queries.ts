import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { User } from './store';

// Query keys
export const queryKeys = {
  user: ['user'] as const,
  users: ['users'] as const,
  departmentGroups: ['departmentGroups'] as const,
  departments: (year: number) => ['departments', year] as const,
  projects: (year: number) => ['projects', year] as const,
  transactions: (limit?: number) => ['transactions', limit] as const,
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
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateDepartmentGroup(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departmentGroups });
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

export function useDepartments(year: number = 2025) {
  return useQuery({
    queryKey: queryKeys.departments(year),
    queryFn: () => api.getDepartments(year),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createDepartment(name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
    },
  });
}

export function useCreateCostGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; departmentId: string }) => api.createCostGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; groupId?: string | null } }) => 
      api.updateDepartment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
    },
  });
}

export function useUpdateCostGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateCostGroup(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
    },
  });
}

export function useDeleteCostGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCostGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
    },
  });
}

// === PROJECTS ===

export function useProjects(year: number = 2025) {
  return useQuery({
    queryKey: queryKeys.projects(year),
    queryFn: () => api.getProjects(year),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createProject(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateProject(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useCreateProjectPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; projectId: string }) => api.createProjectPhase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useUpdateProjectPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateProjectPhase(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useDeleteProjectPhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProjectPhase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.departments(variables.year || 2025) });
      }
      if (variables.projectPhaseId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects(variables.year || 2025) });
      }
    },
  });
}

export function useUpdateBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { monthlyValues?: any; status?: string } }) =>
      api.updateBudgetItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useApproveBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.approveBudgetItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useReviseBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, editorName, revisionReason }: { id: string; editorName: string; revisionReason?: string }) =>
      api.reviseBudgetItem(id, editorName, revisionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useRevertBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revertBudgetItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
    },
  });
}

export function useDeleteBudgetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBudgetItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments(2025) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(2025) });
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

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: 'expense' | 'revenue';
      amount: number;
      description: string;
      date: string;
      budgetItemId?: string;
    }) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
    },
  });
}
