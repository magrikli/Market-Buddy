import { db } from './db';
import { 
  users, departments, costGroups, projects, projectPhases, budgetItems, budgetRevisions, 
  transactions, userDepartmentAssignments, userProjectAssignments, departmentGroups,
  companies, userCompanyAssignments, projectProcesses, processRevisions,
  type User, type InsertUser, type Department, type InsertDepartment,
  type CostGroup, type InsertCostGroup, type Project, type InsertProject,
  type ProjectPhase, type InsertProjectPhase, type BudgetItem, type InsertBudgetItem,
  type BudgetRevision, type InsertBudgetRevision, type Transaction, type InsertTransaction,
  type DepartmentGroup, type InsertDepartmentGroup,
  type Company, type InsertCompany,
  type ProjectProcess, type InsertProjectProcess,
  type ProcessRevision, type InsertProcessRevision
} from '@shared/schema';
import { eq, and, sql, inArray, asc, max } from 'drizzle-orm';

export interface IStorage {
  // Companies
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<void>;
  getUserCompanies(userId: string): Promise<string[]>;
  setUserCompanies(userId: string, companyIds: string[]): Promise<void>;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getUserDepartments(userId: string): Promise<string[]>;
  getUserProjects(userId: string): Promise<string[]>;
  assignUserToDepartment(userId: string, departmentId: string): Promise<void>;
  assignUserToProject(userId: string, projectId: string): Promise<void>;
  setUserDepartments(userId: string, departmentIds: string[]): Promise<void>;
  setUserProjects(userId: string, projectIds: string[]): Promise<void>;
  
  // Department Groups
  getAllDepartmentGroups(): Promise<DepartmentGroup[]>;
  createDepartmentGroup(group: InsertDepartmentGroup): Promise<DepartmentGroup>;
  updateDepartmentGroup(id: string, updates: Partial<DepartmentGroup>): Promise<DepartmentGroup | undefined>;
  deleteDepartmentGroup(id: string): Promise<void>;
  
  // Departments
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, updates: Partial<Department>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<void>;
  
  // Cost Groups
  getCostGroupsByDepartment(departmentId: string): Promise<CostGroup[]>;
  createCostGroup(group: InsertCostGroup): Promise<CostGroup>;
  updateCostGroup(id: string, updates: Partial<CostGroup>): Promise<CostGroup | undefined>;
  deleteCostGroup(id: string): Promise<void>;
  
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  
  // Project Phases
  getPhasesByProject(projectId: string): Promise<ProjectPhase[]>;
  createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase>;
  updateProjectPhase(id: string, updates: Partial<ProjectPhase>): Promise<ProjectPhase | undefined>;
  deleteProjectPhase(id: string): Promise<void>;
  
  // Budget Items
  getBudgetItemsByCostGroup(costGroupId: string, year: number): Promise<BudgetItem[]>;
  getBudgetItemsByProjectPhase(projectPhaseId: string, year: number): Promise<BudgetItem[]>;
  getBudgetItem(id: string): Promise<BudgetItem | undefined>;
  getPendingBudgetItems(year: number): Promise<any[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: string, updates: Partial<BudgetItem>): Promise<BudgetItem | undefined>;
  approveBudgetItem(id: string): Promise<BudgetItem | undefined>;
  rejectBudgetItem(id: string): Promise<BudgetItem | undefined>;
  bulkApproveBudgetItems(ids: string[]): Promise<number>;
  revertBudgetItem(id: string): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: string): Promise<void>;
  
  // Budget Revisions
  createBudgetRevision(revision: InsertBudgetRevision): Promise<BudgetRevision>;
  getRevisionsByBudgetItem(budgetItemId: string): Promise<BudgetRevision[]>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getAllTransactions(limit?: number): Promise<Transaction[]>;
  getTransactionsByBudgetItem(budgetItemId: string): Promise<Transaction[]>;
  deleteTransactionsByCsvFileName(csvFileName: string): Promise<number>;
  
  // Project Processes
  getProcessesByProject(projectId: string): Promise<ProjectProcess[]>;
  getPendingProcesses(): Promise<ProjectProcess[]>;
  getProcess(id: string): Promise<ProjectProcess | undefined>;
  createProcess(process: InsertProjectProcess): Promise<ProjectProcess>;
  updateProcess(id: string, updates: Partial<ProjectProcess>): Promise<ProjectProcess | undefined>;
  submitProcessForApproval(id: string): Promise<ProjectProcess | undefined>;
  approveProcess(id: string): Promise<ProjectProcess | undefined>;
  rejectProcess(id: string): Promise<ProjectProcess | undefined>;
  bulkApproveProcesses(ids: string[]): Promise<number>;
  revertProcess(id: string): Promise<ProjectProcess | undefined>;
  deleteProcess(id: string): Promise<void>;
  
  // Process Revisions
  createProcessRevision(revision: InsertProcessRevision): Promise<ProcessRevision>;
  getRevisionsByProcess(processId: string): Promise<ProcessRevision[]>;
}

export class DatabaseStorage implements IStorage {
  // === COMPANIES ===
  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return result[0];
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const result = await db.insert(companies).values(company).returning();
    return result[0];
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined> {
    const result = await db.update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();
    return result[0];
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getUserCompanies(userId: string): Promise<string[]> {
    const result = await db.select({ companyId: userCompanyAssignments.companyId })
      .from(userCompanyAssignments)
      .where(eq(userCompanyAssignments.userId, userId));
    return result.map(r => r.companyId);
  }

  async setUserCompanies(userId: string, companyIds: string[]): Promise<void> {
    await db.delete(userCompanyAssignments).where(eq(userCompanyAssignments.userId, userId));
    if (companyIds.length > 0) {
      await db.insert(userCompanyAssignments).values(companyIds.map(companyId => ({ userId, companyId })));
    }
  }

  // === USERS ===
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(userDepartmentAssignments).where(eq(userDepartmentAssignments.userId, id));
    await db.delete(userProjectAssignments).where(eq(userProjectAssignments.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getUserDepartments(userId: string): Promise<string[]> {
    const result = await db.select({ departmentId: userDepartmentAssignments.departmentId })
      .from(userDepartmentAssignments)
      .where(eq(userDepartmentAssignments.userId, userId));
    return result.map(r => r.departmentId);
  }

  async getUserProjects(userId: string): Promise<string[]> {
    const result = await db.select({ projectId: userProjectAssignments.projectId })
      .from(userProjectAssignments)
      .where(eq(userProjectAssignments.userId, userId));
    return result.map(r => r.projectId);
  }

  async assignUserToDepartment(userId: string, departmentId: string): Promise<void> {
    await db.insert(userDepartmentAssignments).values({ userId, departmentId }).onConflictDoNothing();
  }

  async assignUserToProject(userId: string, projectId: string): Promise<void> {
    await db.insert(userProjectAssignments).values({ userId, projectId }).onConflictDoNothing();
  }

  async setUserDepartments(userId: string, departmentIds: string[]): Promise<void> {
    await db.delete(userDepartmentAssignments).where(eq(userDepartmentAssignments.userId, userId));
    if (departmentIds.length > 0) {
      await db.insert(userDepartmentAssignments).values(departmentIds.map(departmentId => ({ userId, departmentId })));
    }
  }

  async setUserProjects(userId: string, projectIds: string[]): Promise<void> {
    await db.delete(userProjectAssignments).where(eq(userProjectAssignments.userId, userId));
    if (projectIds.length > 0) {
      await db.insert(userProjectAssignments).values(projectIds.map(projectId => ({ userId, projectId })));
    }
  }

  // === DEPARTMENT GROUPS ===
  async getAllDepartmentGroups(): Promise<DepartmentGroup[]> {
    return await db.select().from(departmentGroups).orderBy(asc(departmentGroups.sortOrder));
  }

  async createDepartmentGroup(group: InsertDepartmentGroup): Promise<DepartmentGroup> {
    const result = await db.insert(departmentGroups).values(group).returning();
    return result[0];
  }

  async updateDepartmentGroup(id: string, updates: Partial<DepartmentGroup>): Promise<DepartmentGroup | undefined> {
    const result = await db.update(departmentGroups)
      .set(updates)
      .where(eq(departmentGroups.id, id))
      .returning();
    return result[0];
  }

  async deleteDepartmentGroup(id: string): Promise<void> {
    await db.delete(departmentGroups).where(eq(departmentGroups.id, id));
  }

  // === DEPARTMENTS ===
  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(asc(departments.sortOrder));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return result[0];
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const result = await db.insert(departments).values(dept).returning();
    return result[0];
  }

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department | undefined> {
    const result = await db.update(departments)
      .set(updates)
      .where(eq(departments.id, id))
      .returning();
    return result[0];
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // === COST GROUPS ===
  async getCostGroupsByDepartment(departmentId: string): Promise<CostGroup[]> {
    return await db.select().from(costGroups)
      .where(eq(costGroups.departmentId, departmentId))
      .orderBy(asc(costGroups.sortOrder));
  }

  async createCostGroup(group: InsertCostGroup): Promise<CostGroup> {
    // Get max sortOrder for this department and add 1
    const maxResult = await db.select({ maxOrder: max(costGroups.sortOrder) })
      .from(costGroups)
      .where(eq(costGroups.departmentId, group.departmentId));
    const nextSortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
    
    const result = await db.insert(costGroups).values({
      ...group,
      sortOrder: group.sortOrder ?? nextSortOrder
    }).returning();
    return result[0];
  }

  async updateCostGroup(id: string, updates: Partial<CostGroup>): Promise<CostGroup | undefined> {
    const result = await db.update(costGroups)
      .set(updates)
      .where(eq(costGroups.id, id))
      .returning();
    return result[0];
  }

  async deleteCostGroup(id: string): Promise<void> {
    await db.delete(costGroups).where(eq(costGroups.id, id));
  }

  // === PROJECTS ===
  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async deleteProject(id: string): Promise<void> {
    const phases = await this.getPhasesByProject(id);
    for (const phase of phases) {
      await this.deleteProjectPhase(phase.id);
    }
    await db.delete(projects).where(eq(projects.id, id));
  }

  // === PROJECT PHASES ===
  async getPhasesByProject(projectId: string): Promise<ProjectPhase[]> {
    return await db.select().from(projectPhases).where(eq(projectPhases.projectId, projectId));
  }

  async createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase> {
    const result = await db.insert(projectPhases).values(phase).returning();
    return result[0];
  }

  async updateProjectPhase(id: string, updates: Partial<ProjectPhase>): Promise<ProjectPhase | undefined> {
    const result = await db.update(projectPhases)
      .set(updates)
      .where(eq(projectPhases.id, id))
      .returning();
    return result[0];
  }

  async deleteProjectPhase(id: string): Promise<void> {
    await db.delete(budgetItems).where(eq(budgetItems.projectPhaseId, id));
    await db.delete(projectPhases).where(eq(projectPhases.id, id));
  }

  // === BUDGET ITEMS ===
  async getBudgetItemsByCostGroup(costGroupId: string, year: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems)
      .where(and(eq(budgetItems.costGroupId, costGroupId), eq(budgetItems.year, year)))
      .orderBy(asc(budgetItems.sortOrder));
  }

  async getBudgetItemsByProjectPhase(projectPhaseId: string, year: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems)
      .where(and(eq(budgetItems.projectPhaseId, projectPhaseId), eq(budgetItems.year, year)))
      .orderBy(asc(budgetItems.sortOrder));
  }

  async getBudgetItem(id: string): Promise<BudgetItem | undefined> {
    const result = await db.select().from(budgetItems).where(eq(budgetItems.id, id)).limit(1);
    return result[0];
  }

  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    // Get max sortOrder for this cost group or project phase and add 1
    let nextSortOrder = 0;
    if (item.costGroupId) {
      const maxResult = await db.select({ maxOrder: max(budgetItems.sortOrder) })
        .from(budgetItems)
        .where(eq(budgetItems.costGroupId, item.costGroupId));
      nextSortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
    } else if (item.projectPhaseId) {
      const maxResult = await db.select({ maxOrder: max(budgetItems.sortOrder) })
        .from(budgetItems)
        .where(eq(budgetItems.projectPhaseId, item.projectPhaseId));
      nextSortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
    }
    
    const result = await db.insert(budgetItems).values({
      ...item,
      sortOrder: item.sortOrder ?? nextSortOrder
    }).returning();
    return result[0];
  }

  async updateBudgetItem(id: string, updates: Partial<BudgetItem>): Promise<BudgetItem | undefined> {
    const result = await db.update(budgetItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(budgetItems.id, id))
      .returning();
    return result[0];
  }

  async approveBudgetItem(id: string): Promise<BudgetItem | undefined> {
    const result = await db.update(budgetItems)
      .set({ status: 'approved', previousApprovedValues: null, updatedAt: new Date() })
      .where(eq(budgetItems.id, id))
      .returning();
    return result[0];
  }

  async rejectBudgetItem(id: string): Promise<BudgetItem | undefined> {
    const item = await this.getBudgetItem(id);
    if (!item) return undefined;
    
    // If has previous approved values, revert to them; otherwise just set to draft
    if (item.previousApprovedValues) {
      const result = await db.update(budgetItems)
        .set({ 
          monthlyValues: item.previousApprovedValues,
          previousApprovedValues: null,
          status: 'approved',
          currentRevision: Math.max(0, item.currentRevision - 1),
          updatedAt: new Date() 
        })
        .where(eq(budgetItems.id, id))
        .returning();
      return result[0];
    } else {
      const result = await db.update(budgetItems)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(eq(budgetItems.id, id))
        .returning();
      return result[0];
    }
  }

  async bulkApproveBudgetItems(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.update(budgetItems)
      .set({ status: 'approved', previousApprovedValues: null, updatedAt: new Date() })
      .where(and(
        inArray(budgetItems.id, ids),
        eq(budgetItems.status, 'pending')
      ))
      .returning();
    return result.length;
  }

  async getPendingBudgetItems(year: number): Promise<any[]> {
    // Get all pending budget items with their department/cost group info
    const pendingItems = await db.select().from(budgetItems)
      .where(and(eq(budgetItems.status, 'pending'), eq(budgetItems.year, year)));
    
    const results = [];
    for (const item of pendingItems) {
      let departmentName = '';
      let costGroupName = '';
      
      if (item.costGroupId) {
        const cg = await db.select().from(costGroups).where(eq(costGroups.id, item.costGroupId)).limit(1);
        if (cg[0]) {
          costGroupName = cg[0].name;
          const dept = await db.select().from(departments).where(eq(departments.id, cg[0].departmentId)).limit(1);
          if (dept[0]) {
            departmentName = dept[0].name;
          }
        }
      } else if (item.projectPhaseId) {
        const phase = await db.select().from(projectPhases).where(eq(projectPhases.id, item.projectPhaseId)).limit(1);
        if (phase[0]) {
          const proj = await db.select().from(projects).where(eq(projects.id, phase[0].projectId)).limit(1);
          if (proj[0]) {
            departmentName = proj[0].name;
            costGroupName = phase[0].name;
          }
        }
      }
      
      results.push({
        ...item,
        departmentName,
        costGroupName,
      });
    }
    
    return results;
  }

  async revertBudgetItem(id: string): Promise<BudgetItem | undefined> {
    const item = await this.getBudgetItem(id);
    if (!item || !item.previousApprovedValues || item.status === 'approved') {
      return undefined;
    }
    
    const result = await db.update(budgetItems)
      .set({ 
        monthlyValues: item.previousApprovedValues,
        previousApprovedValues: null,
        status: 'approved',
        currentRevision: Math.max(0, item.currentRevision - 1),
        updatedAt: new Date() 
      })
      .where(eq(budgetItems.id, id))
      .returning();
    return result[0];
  }

  async deleteBudgetItem(id: string): Promise<void> {
    await db.delete(budgetItems).where(eq(budgetItems.id, id));
  }

  // === BUDGET REVISIONS ===
  async createBudgetRevision(revision: InsertBudgetRevision): Promise<BudgetRevision> {
    const result = await db.insert(budgetRevisions).values(revision).returning();
    return result[0];
  }

  async getRevisionsByBudgetItem(budgetItemId: string): Promise<BudgetRevision[]> {
    return await db.select().from(budgetRevisions)
      .where(eq(budgetRevisions.budgetItemId, budgetItemId))
      .orderBy(budgetRevisions.revisionNumber);
  }

  // === TRANSACTIONS ===
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result[0];
  }

  async getAllTransactions(limit: number = 50): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .orderBy(sql`${transactions.date} DESC`)
      .limit(limit);
  }

  async getTransactionsByBudgetItem(budgetItemId: string): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.budgetItemId, budgetItemId))
      .orderBy(transactions.date);
  }

  async deleteTransactionsByCsvFileName(csvFileName: string): Promise<number> {
    const result = await db.delete(transactions)
      .where(eq(transactions.csvFileName, csvFileName))
      .returning();
    return result.length;
  }

  // === PROJECT PROCESSES ===
  async getProcessesByProject(projectId: string): Promise<ProjectProcess[]> {
    return await db.select().from(projectProcesses)
      .where(eq(projectProcesses.projectId, projectId))
      .orderBy(projectProcesses.wbs);
  }

  async getPendingProcesses(): Promise<ProjectProcess[]> {
    return await db.select().from(projectProcesses)
      .where(eq(projectProcesses.status, 'pending'))
      .orderBy(projectProcesses.updatedAt);
  }

  async getProcess(id: string): Promise<ProjectProcess | undefined> {
    const result = await db.select().from(projectProcesses).where(eq(projectProcesses.id, id)).limit(1);
    return result[0];
  }

  async createProcess(process: InsertProjectProcess): Promise<ProjectProcess> {
    const result = await db.insert(projectProcesses).values(process).returning();
    return result[0];
  }

  async updateProcess(id: string, updates: Partial<ProjectProcess>): Promise<ProjectProcess | undefined> {
    const result = await db.update(projectProcesses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectProcesses.id, id))
      .returning();
    return result[0];
  }

  async updateProcessWithChildren(id: string, updates: Partial<ProjectProcess>, oldWbs: string, newWbs: string, projectId: string): Promise<ProjectProcess | undefined> {
    // Update the process itself
    const result = await db.update(projectProcesses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectProcesses.id, id))
      .returning();
    
    // If WBS changed, update all children
    if (oldWbs !== newWbs) {
      const allProcesses = await this.getProcessesByProject(projectId);
      const childPrefix = oldWbs + '.';
      
      for (const proc of allProcesses) {
        if (proc.wbs.startsWith(childPrefix)) {
          // Replace old prefix with new prefix
          const newChildWbs = newWbs + proc.wbs.substring(oldWbs.length);
          await db.update(projectProcesses)
            .set({ wbs: newChildWbs, updatedAt: new Date() })
            .where(eq(projectProcesses.id, proc.id));
        }
      }
    }
    
    return result[0];
  }

  async submitProcessForApproval(id: string): Promise<ProjectProcess | undefined> {
    const result = await db.update(projectProcesses)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(projectProcesses.id, id))
      .returning();
    return result[0];
  }

  async approveProcess(id: string): Promise<ProjectProcess | undefined> {
    const result = await db.update(projectProcesses)
      .set({ status: 'approved', previousStartDate: null, previousEndDate: null, updatedAt: new Date() })
      .where(eq(projectProcesses.id, id))
      .returning();
    return result[0];
  }

  async rejectProcess(id: string): Promise<ProjectProcess | undefined> {
    const process = await this.getProcess(id);
    if (!process) return undefined;
    
    const result = await db.update(projectProcesses)
      .set({ 
        startDate: process.previousStartDate || process.startDate,
        endDate: process.previousEndDate || process.endDate,
        previousStartDate: null,
        previousEndDate: null,
        status: 'approved',
        updatedAt: new Date() 
      })
      .where(eq(projectProcesses.id, id))
      .returning();
    return result[0];
  }

  async bulkApproveProcesses(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.update(projectProcesses)
      .set({ status: 'approved', previousStartDate: null, previousEndDate: null, updatedAt: new Date() })
      .where(inArray(projectProcesses.id, ids))
      .returning();
    return result.length;
  }

  async revertProcess(id: string): Promise<ProjectProcess | undefined> {
    const process = await this.getProcess(id);
    if (!process || !process.previousStartDate || !process.previousEndDate || process.status === 'approved') {
      return undefined;
    }
    
    const result = await db.update(projectProcesses)
      .set({ 
        startDate: process.previousStartDate,
        endDate: process.previousEndDate,
        previousStartDate: null,
        previousEndDate: null,
        status: 'approved',
        currentRevision: Math.max(0, process.currentRevision - 1),
        updatedAt: new Date() 
      })
      .where(eq(projectProcesses.id, id))
      .returning();
    return result[0];
  }

  async deleteProcess(id: string): Promise<void> {
    await db.delete(projectProcesses).where(eq(projectProcesses.id, id));
  }

  // === PROCESS REVISIONS ===
  async createProcessRevision(revision: InsertProcessRevision): Promise<ProcessRevision> {
    const result = await db.insert(processRevisions).values(revision).returning();
    return result[0];
  }

  async getRevisionsByProcess(processId: string): Promise<ProcessRevision[]> {
    return await db.select().from(processRevisions)
      .where(eq(processRevisions.processId, processId))
      .orderBy(processRevisions.revisionNumber);
  }
}

export const storage = new DatabaseStorage();
