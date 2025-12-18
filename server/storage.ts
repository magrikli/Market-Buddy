import { db } from './db';
import { 
  users, departments, costGroups, projects, projectPhases, budgetItems, budgetRevisions, 
  transactions, userDepartmentAssignments, userProjectAssignments,
  type User, type InsertUser, type Department, type InsertDepartment,
  type CostGroup, type InsertCostGroup, type Project, type InsertProject,
  type ProjectPhase, type InsertProjectPhase, type BudgetItem, type InsertBudgetItem,
  type BudgetRevision, type InsertBudgetRevision, type Transaction, type InsertTransaction
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserDepartments(userId: string): Promise<string[]>;
  getUserProjects(userId: string): Promise<string[]>;
  assignUserToDepartment(userId: string, departmentId: string): Promise<void>;
  assignUserToProject(userId: string, projectId: string): Promise<void>;
  
  // Departments
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  
  // Cost Groups
  getCostGroupsByDepartment(departmentId: string): Promise<CostGroup[]>;
  createCostGroup(group: InsertCostGroup): Promise<CostGroup>;
  
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  
  // Project Phases
  getPhasesByProject(projectId: string): Promise<ProjectPhase[]>;
  createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase>;
  
  // Budget Items
  getBudgetItemsByCostGroup(costGroupId: string, year: number): Promise<BudgetItem[]>;
  getBudgetItemsByProjectPhase(projectPhaseId: string, year: number): Promise<BudgetItem[]>;
  getBudgetItem(id: string): Promise<BudgetItem | undefined>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: string, updates: Partial<BudgetItem>): Promise<BudgetItem | undefined>;
  approveBudgetItem(id: string): Promise<BudgetItem | undefined>;
  
  // Budget Revisions
  createBudgetRevision(revision: InsertBudgetRevision): Promise<BudgetRevision>;
  getRevisionsByBudgetItem(budgetItemId: string): Promise<BudgetRevision[]>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getAllTransactions(limit?: number): Promise<Transaction[]>;
  getTransactionsByBudgetItem(budgetItemId: string): Promise<Transaction[]>;
}

export class DatabaseStorage implements IStorage {
  // === USERS ===
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
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

  // === DEPARTMENTS ===
  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return result[0];
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const result = await db.insert(departments).values(dept).returning();
    return result[0];
  }

  // === COST GROUPS ===
  async getCostGroupsByDepartment(departmentId: string): Promise<CostGroup[]> {
    return await db.select().from(costGroups).where(eq(costGroups.departmentId, departmentId));
  }

  async createCostGroup(group: InsertCostGroup): Promise<CostGroup> {
    const result = await db.insert(costGroups).values(group).returning();
    return result[0];
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

  // === PROJECT PHASES ===
  async getPhasesByProject(projectId: string): Promise<ProjectPhase[]> {
    return await db.select().from(projectPhases).where(eq(projectPhases.projectId, projectId));
  }

  async createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase> {
    const result = await db.insert(projectPhases).values(phase).returning();
    return result[0];
  }

  // === BUDGET ITEMS ===
  async getBudgetItemsByCostGroup(costGroupId: string, year: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems)
      .where(and(eq(budgetItems.costGroupId, costGroupId), eq(budgetItems.year, year)));
  }

  async getBudgetItemsByProjectPhase(projectPhaseId: string, year: number): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems)
      .where(and(eq(budgetItems.projectPhaseId, projectPhaseId), eq(budgetItems.year, year)));
  }

  async getBudgetItem(id: string): Promise<BudgetItem | undefined> {
    const result = await db.select().from(budgetItems).where(eq(budgetItems.id, id)).limit(1);
    return result[0];
  }

  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const result = await db.insert(budgetItems).values(item).returning();
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
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(budgetItems.id, id))
      .returning();
    return result[0];
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
}

export const storage = new DatabaseStorage();
