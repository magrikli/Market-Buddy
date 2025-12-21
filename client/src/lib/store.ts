import { create } from 'zustand';

// --- TYPES ---

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  assignedDepartmentIds: string[];
  assignedProjectIds: string[];
  assignedCompanyIds: string[];
}

export interface Company {
  id: string;
  name: string;
  code: string;
}

export type BudgetStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface BudgetMonthValues {
  [monthIndex: number]: number; // 0-11 for Jan-Dec
}

export interface BaseItem {
  id: string;
  name: string;
  values: BudgetMonthValues;
  previousApprovedValues?: BudgetMonthValues | null;
  status: BudgetStatus;
  revision: number;
  lastUpdated: string;
  history: RevisionHistory[];
  sortOrder?: number;
}

export interface RevisionHistory {
  revision: number;
  date: string;
  values: BudgetMonthValues;
  editor: string;
}

export interface CostItem extends BaseItem {}
export interface RevenueItem extends BaseItem {}

export interface CostGroup {
  id: string;
  name: string;
  items: CostItem[];
  sortOrder?: number;
}

export interface DepartmentGroup {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface Department {
  id: string;
  name: string;
  groupId: string | null;
  costGroups: CostGroup[];
  sortOrder?: number;
}

export interface ProjectPhase {
  id: string;
  name: string;
  costItems: CostItem[];
  revenueItems: RevenueItem[];
}

export interface Project {
  id: string;
  name: string;
  phases: ProjectPhase[];
}

// --- MOCK DATA ---

const generateMonthlyValues = (base: number, variance: number): BudgetMonthValues => {
  const values: BudgetMonthValues = {};
  for (let i = 0; i < 12; i++) {
    values[i] = Math.max(0, Math.floor(base + (Math.random() - 0.5) * variance));
  }
  return values;
};

const mockDepartments: Department[] = [
  {
    id: 'dep-1',
    name: 'Bilgi Teknolojileri (IT)',
    groupId: null,
    costGroups: [
      {
        id: 'cg-1',
        name: 'Personel Giderleri',
        items: [
          {
            id: 'ci-1',
            name: 'Yazılım Ekibi Maaşları',
            values: generateMonthlyValues(50000, 2000),
            status: 'approved',
            revision: 0,
            lastUpdated: new Date().toISOString(),
            history: [],
          },
          {
            id: 'ci-2',
            name: 'Dış Kaynak Kullanımı',
            values: generateMonthlyValues(15000, 5000),
            status: 'draft',
            revision: 0,
            lastUpdated: new Date().toISOString(),
            history: [],
          },
        ],
      },
      {
        id: 'cg-2',
        name: 'Altyapı ve Lisanslar',
        items: [
          {
            id: 'ci-3',
            name: 'AWS Sunucu Giderleri',
            values: generateMonthlyValues(8000, 500),
            status: 'approved',
            revision: 1,
            lastUpdated: new Date().toISOString(),
            history: [
              {
                revision: 0,
                date: '2024-01-15T10:00:00Z',
                values: generateMonthlyValues(7500, 0),
                editor: 'Admin',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dep-2',
    name: 'İnsan Kaynakları',
    groupId: null,
    costGroups: [
      {
        id: 'cg-3',
        name: 'Eğitim Giderleri',
        items: [
          {
            id: 'ci-4',
            name: 'Liderlik Eğitimi',
            values: generateMonthlyValues(5000, 0),
            status: 'pending',
            revision: 0,
            lastUpdated: new Date().toISOString(),
            history: [],
          },
        ],
      },
    ],
  },
];

const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Yeni E-Ticaret Platformu',
    phases: [
      {
        id: 'ph-1',
        name: 'Faz 1: MVP Geliştirme',
        costItems: [
          {
            id: 'pci-1',
            name: 'UX/UI Tasarım Ajansı',
            values: generateMonthlyValues(12000, 0),
            status: 'approved',
            revision: 0,
            lastUpdated: new Date().toISOString(),
            history: [],
          },
        ],
        revenueItems: [
          {
            id: 'pri-1',
            name: 'Erken Erişim Satışları',
            values: generateMonthlyValues(5000, 10000), // Variable revenue
            status: 'draft',
            revision: 0,
            lastUpdated: new Date().toISOString(),
            history: [],
          },
        ],
      },
    ],
  },
];

const mockUsers: User[] = [
  {
    id: 'u-1',
    username: 'admin',
    name: 'Sistem Yöneticisi',
    role: 'admin',
    assignedDepartmentIds: ['dep-1', 'dep-2'],
    assignedProjectIds: ['proj-1'],
    assignedCompanyIds: [],
  },
  {
    id: 'u-2',
    username: 'it_manager',
    name: 'Ahmet Yılmaz',
    role: 'user',
    assignedDepartmentIds: ['dep-1'],
    assignedProjectIds: ['proj-1'],
    assignedCompanyIds: [],
  },
  {
    id: 'u-3',
    username: 'ik_manager',
    name: 'Ayşe Demir',
    role: 'user',
    assignedDepartmentIds: ['dep-2'],
    assignedProjectIds: [],
    assignedCompanyIds: [],
  },
];

// --- STORE ---

// Helper to load user from localStorage
const loadUserFromStorage = (): User | null => {
  try {
    const stored = localStorage.getItem('finflow_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper to load selected company from localStorage
const loadSelectedCompanyFromStorage = (): string | null => {
  try {
    return localStorage.getItem('finflow_selected_company');
  } catch {
    return null;
  }
};

// Helper to load budget year from localStorage
const loadYearFromStorage = (): number => {
  try {
    const stored = localStorage.getItem('finflow_budget_year');
    return stored ? parseInt(stored) : new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
};

// Generate year list: -3 to +3 years from current year
export const getAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = -3; i <= 3; i++) {
    years.push(currentYear + i);
  }
  return years;
};

interface AppState {
  currentUser: User | null;
  currentYear: number;
  selectedCompanyId: string | null; // null = "Tümü" (All Companies)
  
  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;
  setYear: (year: number) => void;
  setSelectedCompanyId: (companyId: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: loadUserFromStorage(),
  currentYear: loadYearFromStorage(),
  selectedCompanyId: loadSelectedCompanyFromStorage(),

  setUser: (user) => {
    if (user) {
      localStorage.setItem('finflow_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('finflow_user');
    }
    set({ currentUser: user });
  },

  logout: () => {
    localStorage.removeItem('finflow_user');
    localStorage.removeItem('finflow_selected_company');
    set({ currentUser: null, selectedCompanyId: null });
  },
  
  setYear: (year) => {
    localStorage.setItem('finflow_budget_year', year.toString());
    set({ currentYear: year });
  },
  
  setSelectedCompanyId: (companyId) => {
    if (companyId) {
      localStorage.setItem('finflow_selected_company', companyId);
    } else {
      localStorage.removeItem('finflow_selected_company');
    }
    set({ selectedCompanyId: companyId });
  },
}));
