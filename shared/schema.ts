import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ===== COMPANIES =====
export const companies = pgTable("companies", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }), // Short code like "ABC", "XYZ"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

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
  companyId: varchar("company_id", { length: 255 }).references(() => companies.id, { onDelete: 'cascade' }),
  sortOrder: integer("sort_order").notNull().default(0),
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
  companyId: varchar("company_id", { length: 255 }).references(() => companies.id, { onDelete: 'cascade' }),
  sortOrder: integer("sort_order").notNull().default(0),
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
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCostGroupSchema = createInsertSchema(costGroups).omit({ id: true, createdAt: true });
export type InsertCostGroup = z.infer<typeof insertCostGroupSchema>;
export type CostGroup = typeof costGroups.$inferSelect;

// ===== PROJECTS =====
export const projects = pgTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }),
  name: text("name").notNull(),
  companyId: varchar("company_id", { length: 255 }).references(() => companies.id, { onDelete: 'cascade' }),
  projectTypeId: varchar("project_type_id", { length: 255 }), // Reference to project type
  sortOrder: integer("sort_order").notNull().default(0),
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
  sortOrder: integer("sort_order").notNull().default(0),
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
  
  // Previous approved values for comparison during revision (cleared when approved)
  previousApprovedValues: jsonb("previous_approved_values"),
  
  status: varchar("status", { length: 50 }).notNull().default('draft'), // 'draft', 'pending', 'approved', 'rejected'
  currentRevision: integer("current_revision").notNull().default(0),
  
  year: integer("year").notNull().default(2025),
  sortOrder: integer("sort_order").notNull().default(0),
  
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
  revisionReason: text("revision_reason"),
  editorId: varchar("editor_id", { length: 255 }).references(() => users.id),
  editorName: text("editor_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBudgetRevisionSchema = createInsertSchema(budgetRevisions).omit({ id: true, createdAt: true });
export type InsertBudgetRevision = z.infer<typeof insertBudgetRevisionSchema>;
export type BudgetRevision = typeof budgetRevisions.$inferSelect;

// ===== PROJECT PROCESSES (Süreçler) =====
export const projectProcesses = pgTable("project_processes", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  projectId: varchar("project_id", { length: 255 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  // WBS (Work Breakdown Structure) - hierarchical numbering like "1", "1.1", "1.2", "2"
  // Hierarchy is derived from WBS: "1.1" is child of "1"
  // Ordering is natural WBS string order
  wbs: varchar("wbs", { length: 50 }).notNull(),
  
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // Actual dates (set when process is started/finished)
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  
  status: varchar("status", { length: 50 }).notNull().default('draft'), // 'draft', 'pending', 'approved', 'rejected'
  currentRevision: integer("current_revision").notNull().default(0),
  
  // Previous approved dates for comparison during revision
  previousStartDate: timestamp("previous_start_date"),
  previousEndDate: timestamp("previous_end_date"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectProcessSchema = createInsertSchema(projectProcesses).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProjectProcess = z.infer<typeof insertProjectProcessSchema>;
export type ProjectProcess = typeof projectProcesses.$inferSelect;

// ===== PROCESS REVISIONS =====
export const processRevisions = pgTable("process_revisions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id", { length: 255 }).notNull().references(() => projectProcesses.id, { onDelete: 'cascade' }),
  revisionNumber: integer("revision_number").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  revisionReason: text("revision_reason"),
  editorId: varchar("editor_id", { length: 255 }).references(() => users.id),
  editorName: text("editor_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProcessRevisionSchema = createInsertSchema(processRevisions).omit({ id: true, createdAt: true });
export type InsertProcessRevision = z.infer<typeof insertProcessRevisionSchema>;
export type ProcessRevision = typeof processRevisions.$inferSelect;

// ===== TRANSACTIONS =====
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // 'expense' or 'revenue'
  amount: integer("amount").notNull(), // Store in cents/smallest unit
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  
  budgetItemId: varchar("budget_item_id", { length: 255 }).references(() => budgetItems.id, { onDelete: 'set null' }),
  
  // CSV import tracking
  csvFileName: text("csv_file_name"),
  csvRowNumber: integer("csv_row_number"),
  
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

// ===== USER COMPANY ASSIGNMENTS =====
export const userCompanyAssignments = pgTable("user_company_assignments", {
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id", { length: 255 }).notNull().references(() => companies.id, { onDelete: 'cascade' }),
});

export const insertUserCompanyAssignmentSchema = createInsertSchema(userCompanyAssignments);
export type UserCompanyAssignment = typeof userCompanyAssignments.$inferSelect;

// ===== PROJECT TYPES =====
export const projectTypes = pgTable("project_types", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectTypeSchema = createInsertSchema(projectTypes).omit({ id: true, createdAt: true });
export type InsertProjectType = z.infer<typeof insertProjectTypeSchema>;
export type ProjectType = typeof projectTypes.$inferSelect;

// ===== PROJECT TYPE PHASES (Default phases for each project type) =====
export const projectTypePhases = pgTable("project_type_phases", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  projectTypeId: varchar("project_type_id", { length: 255 }).notNull().references(() => projectTypes.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull().default('cost'), // 'cost' or 'revenue'
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectTypePhaseSchema = createInsertSchema(projectTypePhases).omit({ id: true, createdAt: true });
export type InsertProjectTypePhase = z.infer<typeof insertProjectTypePhaseSchema>;
export type ProjectTypePhase = typeof projectTypePhases.$inferSelect;

