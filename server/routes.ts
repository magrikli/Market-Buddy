import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertDepartmentSchema, insertCostGroupSchema, 
  insertProjectSchema, insertProjectPhaseSchema, insertBudgetItemSchema, 
  insertTransactionSchema, insertBudgetRevisionSchema, insertDepartmentGroupSchema 
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  // ===== AUTHENTICATION =====
  
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Get user assignments
      const departmentIds = await storage.getUserDepartments(user.id);
      const projectIds = await storage.getUserProjects(user.id);

      // Save session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      // Explicitly save session to database
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Session error" });
        }
        
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            assignedDepartmentIds: departmentIds,
            assignedProjectIds: projectIds,
          }
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get current user from session
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      const departmentIds = await storage.getUserDepartments(user.id);
      const projectIds = await storage.getUserProjects(user.id);

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          assignedDepartmentIds: departmentIds,
          assignedProjectIds: projectIds,
        }
      });
    } catch (error) {
      console.error('Auth check error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      return res.json({ message: "Logged out" });
    });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      return res.status(201).json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          role: user.role 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error('Registration error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== DEPARTMENT GROUPS =====
  
  app.get("/api/department-groups", async (req: Request, res: Response) => {
    try {
      const groups = await storage.getAllDepartmentGroups();
      return res.json(groups);
    } catch (error) {
      console.error('Get department groups error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/department-groups", async (req: Request, res: Response) => {
    try {
      const data = insertDepartmentGroupSchema.parse(req.body);
      const group = await storage.createDepartmentGroup(data);
      return res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/department-groups/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const group = await storage.updateDepartmentGroup(id, { name });
      if (!group) {
        return res.status(404).json({ message: "Department group not found" });
      }
      return res.json(group);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/department-groups/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteDepartmentGroup(id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== DEPARTMENTS =====
  
  app.get("/api/departments", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2025;
      const departments = await storage.getAllDepartments();
      
      // Fetch related data for each department
      const fullDepartments = await Promise.all(
        departments.map(async (dept) => {
          const groups = await storage.getCostGroupsByDepartment(dept.id);
          
          const costGroups = await Promise.all(
            groups.map(async (group) => {
              const items = await storage.getBudgetItemsByCostGroup(group.id, year);
              const revisions = await Promise.all(
                items.map(item => storage.getRevisionsByBudgetItem(item.id))
              );
              
              return {
                id: group.id,
                name: group.name,
                items: items.map((item, idx) => ({
                  id: item.id,
                  name: item.name,
                  values: item.monthlyValues,
                  previousApprovedValues: item.previousApprovedValues,
                  status: item.status,
                  revision: item.currentRevision,
                  lastUpdated: item.updatedAt.toISOString(),
                  history: revisions[idx].map(rev => ({
                    revision: rev.revisionNumber,
                    date: rev.createdAt.toISOString(),
                    values: rev.monthlyValues,
                    editor: rev.editorName,
                  })),
                })),
              };
            })
          );

          return {
            id: dept.id,
            name: dept.name,
            groupId: dept.groupId,
            costGroups,
          };
        })
      );

      return res.json(fullDepartments);
    } catch (error) {
      console.error('Get departments error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/departments", async (req: Request, res: Response) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      return res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/departments/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, groupId } = req.body;
      const updates: { name?: string; groupId?: string | null } = {};
      if (name !== undefined) updates.name = name;
      if (groupId !== undefined) updates.groupId = groupId;
      const department = await storage.updateDepartment(id, updates);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      return res.json(department);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/departments/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteDepartment(id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/cost-groups", async (req: Request, res: Response) => {
    try {
      const data = insertCostGroupSchema.parse(req.body);
      const group = await storage.createCostGroup(data);
      return res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/cost-groups/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const group = await storage.updateCostGroup(id, { name });
      if (!group) {
        return res.status(404).json({ message: "Cost group not found" });
      }
      return res.json(group);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/cost-groups/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCostGroup(id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== PROJECTS =====
  
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2025;
      const projects = await storage.getAllProjects();
      
      const fullProjects = await Promise.all(
        projects.map(async (proj) => {
          const phases = await storage.getPhasesByProject(proj.id);
          
          const fullPhases = await Promise.all(
            phases.map(async (phase) => {
              const allItems = await storage.getBudgetItemsByProjectPhase(phase.id, year);
              const costItems = allItems.filter(item => item.type === 'cost');
              const revenueItems = allItems.filter(item => item.type === 'revenue');
              
              const costRevisions = await Promise.all(
                costItems.map(item => storage.getRevisionsByBudgetItem(item.id))
              );
              const revenueRevisions = await Promise.all(
                revenueItems.map(item => storage.getRevisionsByBudgetItem(item.id))
              );

              return {
                id: phase.id,
                name: phase.name,
                costItems: costItems.map((item, idx) => ({
                  id: item.id,
                  name: item.name,
                  values: item.monthlyValues,
                  previousApprovedValues: item.previousApprovedValues,
                  status: item.status,
                  revision: item.currentRevision,
                  lastUpdated: item.updatedAt.toISOString(),
                  history: costRevisions[idx].map(rev => ({
                    revision: rev.revisionNumber,
                    date: rev.createdAt.toISOString(),
                    values: rev.monthlyValues,
                    editor: rev.editorName,
                  })),
                })),
                revenueItems: revenueItems.map((item, idx) => ({
                  id: item.id,
                  name: item.name,
                  values: item.monthlyValues,
                  previousApprovedValues: item.previousApprovedValues,
                  status: item.status,
                  revision: item.currentRevision,
                  lastUpdated: item.updatedAt.toISOString(),
                  history: revenueRevisions[idx].map(rev => ({
                    revision: rev.revisionNumber,
                    date: rev.createdAt.toISOString(),
                    values: rev.monthlyValues,
                    editor: rev.editorName,
                  })),
                })),
              };
            })
          );

          return {
            id: proj.id,
            name: proj.name,
            phases: fullPhases,
          };
        })
      );

      return res.json(fullProjects);
    } catch (error) {
      console.error('Get projects error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      return res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const updated = await storage.updateProject(id, { name });
      if (!updated) {
        return res.status(404).json({ message: "Project not found" });
      }
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteProject(id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-phases", async (req: Request, res: Response) => {
    try {
      const data = insertProjectPhaseSchema.parse(req.body);
      const phase = await storage.createProjectPhase(data);
      return res.status(201).json(phase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/project-phases/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const updated = await storage.updateProjectPhase(id, { name });
      if (!updated) {
        return res.status(404).json({ message: "Phase not found" });
      }
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/project-phases/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteProjectPhase(id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== BUDGET ITEMS =====
  
  app.post("/api/budget-items", async (req: Request, res: Response) => {
    try {
      const data = insertBudgetItemSchema.parse(req.body);
      const item = await storage.createBudgetItem(data);
      return res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/budget-items/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { monthlyValues, status } = req.body;
      
      const updated = await storage.updateBudgetItem(id, { 
        monthlyValues,
        ...(status && { status }),
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Budget item not found" });
      }

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/budget-items/:id/approve", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const approved = await storage.approveBudgetItem(id);
      
      if (!approved) {
        return res.status(404).json({ message: "Budget item not found" });
      }

      return res.json(approved);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/budget-items/:id/revise", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { editorName, revisionReason } = req.body;
      
      // Get current item
      const currentItem = await storage.getBudgetItem(id);
      if (!currentItem) {
        return res.status(404).json({ message: "Budget item not found" });
      }

      // Save current state as a revision with reason
      await storage.createBudgetRevision({
        budgetItemId: id,
        revisionNumber: currentItem.currentRevision,
        monthlyValues: currentItem.monthlyValues as Record<string, number>,
        revisionReason: revisionReason || null,
        editorName: editorName || 'Unknown',
      });

      // Update item to new revision, set status to draft, and save previous approved values for comparison
      const updated = await storage.updateBudgetItem(id, {
        currentRevision: currentItem.currentRevision + 1,
        status: 'draft',
        previousApprovedValues: currentItem.monthlyValues,
      });

      return res.json(updated);
    } catch (error) {
      console.error('Revise error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/budget-items/:id/revert", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reverted = await storage.revertBudgetItem(id);
      
      if (!reverted) {
        return res.status(400).json({ message: "Cannot revert: item has no previous approved values or is already approved" });
      }

      return res.json(reverted);
    } catch (error) {
      console.error('Revert error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/budget-items/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteBudgetItem(id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== TRANSACTIONS =====
  
  app.get("/api/transactions", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getAllTransactions(limit);
      return res.json(transactions);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/transactions", async (req: Request, res: Response) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(data);
      return res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== USERS & ASSIGNMENTS =====
  
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      // In a real app, this would need proper authorization
      // For now, return mock data or implement properly
      return res.json([]);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  return server;
}
