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
}

export type BudgetStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface BudgetMonthValues {
  [monthIndex: number]: number; // 0-11 for Jan-Dec
}

export interface BaseItem {
  id: string;
  name: string;
  values: BudgetMonthValues;
  status: BudgetStatus;
  revision: number;
  lastUpdated: string;
  history: RevisionHistory[];
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
}

export interface Department {
  id: string;
  name: string;
  costGroups: CostGroup[];
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
  },
  {
    id: 'u-2',
    username: 'it_manager',
    name: 'Ahmet Yılmaz',
    role: 'user',
    assignedDepartmentIds: ['dep-1'],
    assignedProjectIds: ['proj-1'],
  },
  {
    id: 'u-3',
    username: 'ik_manager',
    name: 'Ayşe Demir',
    role: 'user',
    assignedDepartmentIds: ['dep-2'],
    assignedProjectIds: [],
  },
];

// --- STORE ---

interface AppState {
  currentUser: User | null;
  departments: Department[];
  projects: Project[];
  users: User[];
  currentYear: number;
  
  // Actions
  login: (username: string) => boolean;
  logout: () => void;
  setYear: (year: number) => void;
  updateCostItem: (type: 'department' | 'project', parentId: string, groupId: string, itemId: string, values: BudgetMonthValues) => void;
  approveItem: (type: 'department' | 'project', parentId: string, groupId: string, itemId: string) => void;
  reviseItem: (type: 'department' | 'project', parentId: string, groupId: string, itemId: string) => void;
  addTransaction: (type: 'expense' | 'revenue', amount: number, date: Date, description: string, relatedId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  departments: mockDepartments,
  projects: mockProjects,
  users: mockUsers,
  currentYear: 2025,

  login: (username) => {
    const user = get().users.find((u) => u.username === username);
    if (user) {
      set({ currentUser: user });
      return true;
    }
    return false;
  },

  logout: () => set({ currentUser: null }),
  
  setYear: (year) => set({ currentYear: year }),

  updateCostItem: (type, parentId, groupId, itemId, values) => {
    // This is a simplified deep update. In a real app, this would be an API call.
    // Logic for updating department vs project items would go here.
    // For prototype, we just console log the intent to show it's wired up.
    console.log('Update Item:', { type, parentId, groupId, itemId, values });
    
    // Rudimentary state update for Department items (example)
    if (type === 'department') {
        set((state) => ({
            departments: state.departments.map(dep => {
                if (dep.id !== parentId) return dep;
                return {
                    ...dep,
                    costGroups: dep.costGroups.map(group => {
                        if (group.id !== groupId) return group;
                        return {
                            ...group,
                            items: group.items.map(item => {
                                if (item.id !== itemId) return item;
                                return { ...item, values };
                            })
                        }
                    })
                }
            })
        }))
    }
  },

  approveItem: (type, parentId, groupId, itemId) => {
     console.log('Approve Item:', { type, parentId, groupId, itemId });
     if (type === 'department') {
        set((state) => ({
            departments: state.departments.map(dep => {
                if (dep.id !== parentId) return dep;
                return {
                    ...dep,
                    costGroups: dep.costGroups.map(group => {
                        if (group.id !== groupId) return group;
                        return {
                            ...group,
                            items: group.items.map(item => {
                                if (item.id !== itemId) return item;
                                return { ...item, status: 'approved' };
                            })
                        }
                    })
                }
            })
        }))
    }
  },
  
  reviseItem: (type, parentId, groupId, itemId) => {
      console.log('Revise Item:', { type, parentId, groupId, itemId });
      // Logic to create a new revision (clone item, increment rev, set status to draft)
  },

  addTransaction: (type, amount, date, description, relatedId) => {
      console.log('New Transaction:', { type, amount, date, description, relatedId });
  }
}));
