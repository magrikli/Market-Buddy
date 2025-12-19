import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ===== USERS =====
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 50 }).notNull().default('user'), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ===== DEPARTMENT GROUPS =====
export const departmentGroups = pgTable("department_groups", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepartmentGroupSchema = createInsertSchema(departmentGroups).omit({ id: true, createdAt: true });
export type InsertDepartmentGroup = z.infer<typeof insertDepartmentGroupSchema>;
export type DepartmentGroup = typeof departmentGroups.$inferSelect;

// ===== DEPARTMENTS =====
export const departments = pgTable("departments", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  groupId: varchar("group_id", { length: 255 }).references(() => departmentGroups.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// ===== COST GROUPS =====
export const costGroups = pgTable("cost_groups", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  departmentId: varchar("department_id", { length: 255 }).notNull().references(() => departments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCostGroupSchema = createInsertSchema(costGroups).omit({ id: true, createdAt: true });
export type InsertCostGroup = z.infer<typeof insertCostGroupSchema>;
export type CostGroup = typeof costGroups.$inferSelect;

// ===== PROJECTS =====
export const projects = pgTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ===== PROJECT PHASES =====
export const projectPhases = pgTable("project_phases", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  projectId: varchar("project_id", { length: 255 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({ id: true, createdAt: true });
export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhases.$inferSelect;

// ===== BUDGET ITEMS (Cost/Revenue Items) =====
export const budgetItems = pgTable("budget_items", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'cost' or 'revenue'
  
  // Foreign keys - one of these will be set based on context
  costGroupId: varchar("cost_group_id", { length: 255 }).references(() => costGroups.id, { onDelete: 'cascade' }),
  projectPhaseId: varchar("project_phase_id", { length: 255 }).references(() => projectPhases.id, { onDelete: 'cascade' }),
  
  // Budget values stored as JSONB: { "0": 1000, "1": 1200, ... } for 12 months
  monthlyValues: jsonb("monthly_values").notNull().default({}),
  
  status: varchar("status", { length: 50 }).notNull().default('draft'), // 'draft', 'pending', 'approved', 'rejected'
  currentRevision: integer("current_revision").notNull().default(0),
  
  year: integer("year").notNull().default(2025),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;

// ===== BUDGET REVISIONS =====
export const budgetRevisions = pgTable("budget_revisions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  budgetItemId: varchar("budget_item_id", { length: 255 }).notNull().references(() => budgetItems.id, { onDelete: 'cascade' }),
  revisionNumber: integer("revision_number").notNull(),
  monthlyValues: jsonb("monthly_values").notNull(),
  editorId: varchar("editor_id", { length: 255 }).references(() => users.id),
  editorName: text("editor_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBudgetRevisionSchema = createInsertSchema(budgetRevisions).omit({ id: true, createdAt: true });
export type InsertBudgetRevision = z.infer<typeof insertBudgetRevisionSchema>;
export type BudgetRevision = typeof budgetRevisions.$inferSelect;

// ===== TRANSACTIONS =====
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // 'expense' or 'revenue'
  amount: integer("amount").notNull(), // Store in cents/smallest unit
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  
  budgetItemId: varchar("budget_item_id", { length: 255 }).references(() => budgetItems.id, { onDelete: 'set null' }),
  
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ===== USER ASSIGNMENTS =====
export const userDepartmentAssignments = pgTable("user_department_assignments", {
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  departmentId: varchar("department_id", { length: 255 }).notNull().references(() => departments.id, { onDelete: 'cascade' }),
});

export const userProjectAssignments = pgTable("user_project_assignments", {
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: varchar("project_id", { length: 255 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
});

export const insertUserDepartmentAssignmentSchema = createInsertSchema(userDepartmentAssignments);
export const insertUserProjectAssignmentSchema = createInsertSchema(userProjectAssignments);
export type UserDepartmentAssignment = typeof userDepartmentAssignments.$inferSelect;
export type UserProjectAssignment = typeof userProjectAssignments.$inferSelect;
