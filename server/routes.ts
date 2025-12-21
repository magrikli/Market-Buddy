import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertDepartmentSchema, insertCostGroupSchema, 
  insertProjectSchema, insertProjectPhaseSchema, insertBudgetItemSchema, 
  insertTransactionSchema, insertBudgetRevisionSchema, insertDepartmentGroupSchema,
  insertCompanySchema, type BudgetItem
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  // ===== HEALTH CHECK =====
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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
      const companyIds = await storage.getUserCompanies(user.id);

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
            assignedCompanyIds: companyIds,
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

      // Re-set session data in case it was lost
      req.session.username = user.username;
      req.session.role = user.role;

      const departmentIds = await storage.getUserDepartments(user.id);
      const projectIds = await storage.getUserProjects(user.id);
      const companyIds = await storage.getUserCompanies(user.id);

      // Explicitly save the session to persist the role before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error in /api/auth/me:', err);
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
            assignedCompanyIds: companyIds,
          }
        });
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

  // Change own password
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId || req.body.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Mevcut şifre hatalı" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });

      return res.json({ message: "Şifre başarıyla değiştirildi" });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ message: "Server error" });
    }
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

  // ===== COMPANIES =====
  
  app.get("/api/companies", async (req: Request, res: Response) => {
    try {
      const allCompanies = await storage.getAllCompanies();
      
      // For admin users, return all companies
      // For regular users, filter to assigned companies
      if (req.session.role === 'admin') {
        return res.json(allCompanies);
      } else if (req.session.userId) {
        const userCompanyIds = await storage.getUserCompanies(req.session.userId);
        const filtered = allCompanies.filter(c => userCompanyIds.includes(c.id));
        return res.json(filtered);
      }
      
      return res.json(allCompanies);
    } catch (error) {
      console.error('Get companies error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/companies", async (req: Request, res: Response) => {
    try {
      // Admin only
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(data);
      return res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/companies/:id", async (req: Request, res: Response) => {
    try {
      // Admin only
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id } = req.params;
      const { name, code } = req.body;
      const company = await storage.updateCompany(id, { name, code });
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      return res.json(company);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/companies/:id", async (req: Request, res: Response) => {
    try {
      // Admin only
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id } = req.params;
      await storage.deleteCompany(id);
      return res.status(204).send();
    } catch (error) {
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
      const { name, sortOrder } = req.body;
      const updates: { name?: string; sortOrder?: number } = {};
      if (name !== undefined) updates.name = name;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const group = await storage.updateDepartmentGroup(id, updates);
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
      const companyId = req.query.companyId as string | undefined;
      let departments = await storage.getAllDepartments();
      
      // Determine allowed company IDs for the user
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
      }
      
      // Filter by companyId if provided
      if (companyId) {
        // Validate that user has access to this company
        if (allowedCompanyIds !== null && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
        departments = departments.filter(d => d.companyId === companyId);
      } else if (allowedCompanyIds !== null) {
        // For non-admin users without companyId filter, only show assigned companies
        departments = departments.filter(d => d.companyId && allowedCompanyIds!.includes(d.companyId));
      }
      
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
      
      // Automatically add standard cost groups to new department
      const standardCostGroups = [
        "Personel Giderleri",
        "Personel Yan Haklar",
        "Eğitim",
        "Seyahat",
        "Ofis Malzemesi",
        "İletişim",
        "Temsil ve Ağırlama"
      ];
      
      for (let i = 0; i < standardCostGroups.length; i++) {
        await storage.createCostGroup({
          name: standardCostGroups[i],
          departmentId: department.id,
          sortOrder: i
        });
      }
      
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
      const { name, groupId, sortOrder } = req.body;
      const updates: { name?: string; groupId?: string | null; sortOrder?: number } = {};
      if (name !== undefined) updates.name = name;
      if (groupId !== undefined) updates.groupId = groupId;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
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
      const { name, sortOrder } = req.body;
      const updates: { name?: string; sortOrder?: number } = {};
      if (name !== undefined) updates.name = name;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const group = await storage.updateCostGroup(id, updates);
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
      const companyId = req.query.companyId as string | undefined;
      let projects = await storage.getAllProjects();
      
      // Determine allowed company IDs for the user
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
      }
      
      // Filter by companyId if provided
      if (companyId) {
        // Validate that user has access to this company
        if (allowedCompanyIds !== null && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
        projects = projects.filter(p => p.companyId === companyId);
      } else if (allowedCompanyIds !== null) {
        // For non-admin users without companyId filter, only show assigned companies
        projects = projects.filter(p => p.companyId && allowedCompanyIds!.includes(p.companyId));
      }
      
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
                type: phase.type, // Include phase type (cost/revenue)
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
            code: proj.code,
            name: proj.name,
            sortOrder: proj.sortOrder,
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
      
      // Auto-create phases based on project type (both cost and revenue)
      if (data.projectTypeId) {
        // Get all phases (cost and revenue) from the selected project type
        const typePhases = await storage.getPhasesByProjectType(data.projectTypeId);
        for (const typePhase of typePhases) {
          await storage.createProjectPhase({
            name: typePhase.name,
            projectId: project.id,
            type: typePhase.type, // Copy the phase type (cost/revenue)
            sortOrder: typePhase.sortOrder
          });
        }
      }
      
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
      const { name, code, sortOrder } = req.body;
      const updates: { name?: string; code?: string; sortOrder?: number } = {};
      if (name !== undefined) updates.name = name;
      if (code !== undefined) updates.code = code;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const updated = await storage.updateProject(id, updates);
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
      const { name, sortOrder } = req.body;
      const updates: { name?: string; sortOrder?: number } = {};
      if (name !== undefined) updates.name = name;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const updated = await storage.updateProjectPhase(id, updates);
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
      const { monthlyValues, status, sortOrder } = req.body;
      
      const updates: any = {};
      if (monthlyValues !== undefined) updates.monthlyValues = monthlyValues;
      if (status !== undefined) updates.status = status;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      
      const updated = await storage.updateBudgetItem(id, updates);
      
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

  // ===== PENDING BUDGET ITEMS =====
  
  app.get("/api/pending-budget-items", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || 2025;
      const items = await storage.getPendingBudgetItems(year);
      return res.json(items);
    } catch (error) {
      console.error('Get pending budget items error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/budget-items/:id/reject", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rejected = await storage.rejectBudgetItem(id);
      
      if (!rejected) {
        return res.status(404).json({ message: "Budget item not found" });
      }

      return res.json(rejected);
    } catch (error) {
      console.error('Reject budget item error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/budget-items/bulk-approve", async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ message: "ids array is required" });
      }
      
      const approvedCount = await storage.bulkApproveBudgetItems(ids);
      return res.json({ approvedCount });
    } catch (error) {
      console.error('Bulk approve budget items error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== PROJECT PROCESSES =====
  
  app.get("/api/pending-processes", async (req: Request, res: Response) => {
    try {
      const processes = await storage.getPendingProcesses();
      return res.json(processes);
    } catch (error) {
      console.error('Get pending processes error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/project-processes/:projectId", async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const processes = await storage.getProcessesByProject(projectId);
      
      // Fetch revisions for each process
      const processesWithRevisions = await Promise.all(
        processes.map(async (process) => {
          const revisions = await storage.getRevisionsByProcess(process.id);
          return {
            ...process,
            history: revisions.map(rev => ({
              revision: rev.revisionNumber,
              date: rev.createdAt.toISOString(),
              startDate: rev.startDate.toISOString(),
              endDate: rev.endDate.toISOString(),
              revisionReason: rev.revisionReason,
              editor: rev.editorName,
            })),
          };
        })
      );
      
      return res.json(processesWithRevisions);
    } catch (error) {
      console.error('Get processes error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes", async (req: Request, res: Response) => {
    try {
      const { name, projectId, wbs, startDate, endDate } = req.body;
      if (!name || !projectId || !wbs || !startDate || !endDate) {
        return res.status(400).json({ message: "Name, projectId, wbs, startDate, and endDate are required" });
      }
      
      const process = await storage.createProcess({
        name,
        projectId,
        wbs,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'draft',
        currentRevision: 0,
      });
      return res.status(201).json(process);
    } catch (error) {
      console.error('Create process error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/project-processes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, startDate, endDate, wbs, status, actualStartDate, actualEndDate } = req.body;
      
      // Get current process to check if WBS is changing
      const currentProcess = await storage.getProcess(id);
      if (!currentProcess) {
        return res.status(404).json({ message: "Process not found" });
      }
      
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (startDate !== undefined) updates.startDate = new Date(startDate);
      if (endDate !== undefined) updates.endDate = new Date(endDate);
      if (wbs !== undefined) updates.wbs = wbs;
      if (status !== undefined) updates.status = status;
      if (actualStartDate !== undefined) updates.actualStartDate = actualStartDate ? new Date(actualStartDate) : null;
      if (actualEndDate !== undefined) updates.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
      
      // If WBS is changing, update children too
      let updated;
      if (wbs !== undefined && wbs !== currentProcess.wbs) {
        updated = await storage.updateProcessWithChildren(id, updates, currentProcess.wbs, wbs, currentProcess.projectId);
      } else {
        updated = await storage.updateProcess(id, updates);
      }
      
      if (!updated) {
        return res.status(404).json({ message: "Process not found" });
      }

      return res.json(updated);
    } catch (error) {
      console.error('Update process error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/:id/submit-for-approval", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const submitted = await storage.submitProcessForApproval(id);
      
      if (!submitted) {
        return res.status(404).json({ message: "Process not found" });
      }

      return res.json(submitted);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/:id/approve", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const approved = await storage.approveProcess(id);
      
      if (!approved) {
        return res.status(404).json({ message: "Process not found" });
      }

      return res.json(approved);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/:id/reject", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rejected = await storage.rejectProcess(id);
      
      if (!rejected) {
        return res.status(404).json({ message: "Process not found" });
      }

      return res.json(rejected);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/bulk-approve", async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids array required" });
      }
      const count = await storage.bulkApproveProcesses(ids);
      return res.json({ approvedCount: count });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/:id/start", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const process = await storage.getProcess(id);
      
      if (!process) {
        return res.status(404).json({ message: "Process not found" });
      }
      
      if (process.actualStartDate) {
        return res.status(400).json({ message: "Process already started" });
      }

      const updated = await storage.updateProcess(id, {
        actualStartDate: new Date(),
      });

      return res.json(updated);
    } catch (error) {
      console.error('Start process error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/:id/finish", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const process = await storage.getProcess(id);
      
      if (!process) {
        return res.status(404).json({ message: "Process not found" });
      }
      
      if (!process.actualStartDate) {
        return res.status(400).json({ message: "Process must be started first" });
      }
      
      if (process.actualEndDate) {
        return res.status(400).json({ message: "Process already finished" });
      }

      const updated = await storage.updateProcess(id, {
        actualEndDate: new Date(),
      });

      return res.json(updated);
    } catch (error) {
      console.error('Finish process error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/:id/revise", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { editorName, revisionReason } = req.body;
      
      const currentProcess = await storage.getProcess(id);
      if (!currentProcess) {
        return res.status(404).json({ message: "Process not found" });
      }

      // Save current state as a revision
      await storage.createProcessRevision({
        processId: id,
        revisionNumber: currentProcess.currentRevision,
        startDate: currentProcess.startDate,
        endDate: currentProcess.endDate,
        revisionReason: revisionReason || null,
        editorName: editorName || 'Unknown',
      });

      // Update process to new revision
      const updated = await storage.updateProcess(id, {
        currentRevision: currentProcess.currentRevision + 1,
        status: 'draft',
        previousStartDate: currentProcess.startDate,
        previousEndDate: currentProcess.endDate,
      });

      return res.json(updated);
    } catch (error) {
      console.error('Revise process error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-processes/:id/revert", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reverted = await storage.revertProcess(id);
      
      if (!reverted) {
        return res.status(400).json({ message: "Cannot revert: process has no previous approved values or is already approved" });
      }

      return res.json(reverted);
    } catch (error) {
      console.error('Revert process error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/project-processes/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteProcess(id);
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
      // Convert date string to Date object and provide default for description
      const body = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        description: req.body.description || "",
      };
      const data = insertTransactionSchema.parse(body);
      const transaction = await storage.createTransaction(data);
      return res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/transactions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };
      const transaction = await storage.updateTransaction(id, body);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      return res.json(transaction);
    } catch (error) {
      console.error('Update transaction error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/transactions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      return res.json(transaction);
    } catch (error) {
      console.error('Get transaction error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/transactions/by-csv/:fileName", async (req: Request, res: Response) => {
    try {
      const fileName = decodeURIComponent(req.params.fileName);
      const deletedCount = await storage.deleteTransactionsByCsvFileName(fileName);
      return res.json({ deletedCount, fileName });
    } catch (error) {
      console.error('Delete transactions by CSV error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== DASHBOARD STATS =====
  
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const companyId = req.query.companyId as string | undefined;
      
      // Validate user access to the requested company
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
        if (companyId && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
      }
      
      // Get all budget item IDs for the selected company
      let companyBudgetItemIds: Set<string> = new Set();
      if (companyId) {
        // Get departments and their budget items
        const allDepartments = await storage.getAllDepartments();
        const companyDepartments = allDepartments.filter(d => d.companyId === companyId);
        
        for (const dept of companyDepartments) {
          const groups = await storage.getCostGroupsByDepartment(dept.id);
          for (const group of groups) {
            const items = await storage.getBudgetItemsByCostGroup(group.id, year);
            items.forEach((item: BudgetItem) => companyBudgetItemIds.add(item.id));
          }
        }
        
        // Get projects and their budget items
        const allProjects = await storage.getAllProjects();
        const companyProjects = allProjects.filter(p => p.companyId === companyId);
        
        for (const proj of companyProjects) {
          const phases = await storage.getPhasesByProject(proj.id);
          for (const phase of phases) {
            const costItems = await storage.getBudgetItemsByProjectPhase(phase.id, year);
            const revenueItems = await storage.getBudgetItemsByProjectPhase(phase.id, year);
            costItems.forEach((item: BudgetItem) => companyBudgetItemIds.add(item.id));
            revenueItems.forEach((item: BudgetItem) => companyBudgetItemIds.add(item.id));
          }
        }
      }
      
      // Get all transactions for the year
      const allTransactions = await storage.getAllTransactions(10000);
      
      // Filter by year and company
      const yearTransactions = allTransactions.filter(t => {
        const txDate = new Date(t.date);
        const yearMatch = txDate.getFullYear() === year;
        if (!companyId) return yearMatch;
        return yearMatch && t.budgetItemId && companyBudgetItemIds.has(t.budgetItemId);
      });
      
      // Calculate total actuals (expenses)
      const totalActuals = yearTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0) / 100; // Convert from cents
      
      // Monthly breakdown with separate expense and revenue
      const monthlyData: { [month: number]: { budget: number; actual: number; expense: number; revenue: number } } = {};
      for (let i = 0; i < 12; i++) {
        monthlyData[i] = { budget: 0, actual: 0, expense: 0, revenue: 0 };
      }
      
      yearTransactions.forEach(t => {
        const month = new Date(t.date).getMonth();
        if (t.type === 'expense') {
          monthlyData[month].actual += (t.amount || 0) / 100;
          monthlyData[month].expense += (t.amount || 0) / 100;
        } else if (t.type === 'revenue') {
          monthlyData[month].revenue += (t.amount || 0) / 100;
        }
      });
      
      // Count pending items (processes with pending status) - filter by company
      const allPendingProcesses = await storage.getPendingProcesses();
      let pendingCount = allPendingProcesses.length;
      if (companyId) {
        const allProjects = await storage.getAllProjects();
        const companyProjectIds = new Set(allProjects.filter(p => p.companyId === companyId).map(p => p.id));
        pendingCount = allPendingProcesses.filter(p => companyProjectIds.has(p.projectId)).length;
      }
      
      // Get recent transactions for activity feed (filtered by company)
      const companyTransactions = companyId 
        ? allTransactions.filter(t => t.budgetItemId && companyBudgetItemIds.has(t.budgetItemId))
        : allTransactions;
      const recentTransactions = companyTransactions.slice(0, 5);
      
      return res.json({
        totalActuals,
        pendingCount,
        monthlyData,
        recentTransactions,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard expense ratio (Project vs Department)
  app.get("/api/dashboard/expense-ratio", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const companyId = req.query.companyId as string | undefined;
      
      // Validate company access and determine allowed companies
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
        if (companyId && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
      }
      
      // Get all transactions for the year
      const allTransactions = await storage.getAllTransactions(10000);
      const yearTransactions = allTransactions.filter(t => {
        const txYear = new Date(t.date).getFullYear();
        return txYear === year && t.type === 'expense';
      });
      
      // Build budget item to type mapping
      const departmentBudgetItemIds = new Set<string>();
      const projectBudgetItemIds = new Set<string>();
      
      const allDepartments = await storage.getAllDepartments();
      const allProjects = await storage.getAllProjects();
      
      // Filter by company: use specific company, user's allowed companies, or all (admin only)
      let filteredDepartments = allDepartments;
      let filteredProjects = allProjects;
      if (companyId) {
        filteredDepartments = allDepartments.filter(d => d.companyId === companyId);
        filteredProjects = allProjects.filter(p => p.companyId === companyId);
      } else if (allowedCompanyIds) {
        filteredDepartments = allDepartments.filter(d => d.companyId && allowedCompanyIds!.includes(d.companyId));
        filteredProjects = allProjects.filter(p => p.companyId && allowedCompanyIds!.includes(p.companyId));
      }
      
      for (const dept of filteredDepartments) {
        const groups = await storage.getCostGroupsByDepartment(dept.id);
        for (const group of groups) {
          const items = await storage.getBudgetItemsByCostGroup(group.id, year);
          items.forEach((item: BudgetItem) => departmentBudgetItemIds.add(item.id));
        }
      }
      
      for (const proj of filteredProjects) {
        const phases = await storage.getPhasesByProject(proj.id);
        for (const phase of phases) {
          const items = await storage.getBudgetItemsByProjectPhase(phase.id, year);
          items.forEach((item: BudgetItem) => projectBudgetItemIds.add(item.id));
        }
      }
      
      let departmentExpense = 0;
      let projectExpense = 0;
      
      yearTransactions.forEach(t => {
        if (t.budgetItemId) {
          if (departmentBudgetItemIds.has(t.budgetItemId)) {
            departmentExpense += (t.amount || 0) / 100;
          } else if (projectBudgetItemIds.has(t.budgetItemId)) {
            projectExpense += (t.amount || 0) / 100;
          }
        }
      });
      
      const total = departmentExpense + projectExpense;
      
      return res.json({
        data: [
          { name: 'Departman Giderleri', value: Math.round(departmentExpense), percentage: total > 0 ? Math.round((departmentExpense / total) * 100) : 0 },
          { name: 'Proje Giderleri', value: Math.round(projectExpense), percentage: total > 0 ? Math.round((projectExpense / total) * 100) : 0 },
        ],
        total: Math.round(total),
      });
    } catch (error) {
      console.error('Expense ratio error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard department groups breakdown
  app.get("/api/dashboard/department-groups", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const companyId = req.query.companyId as string | undefined;
      const departmentId = req.query.departmentId as string | undefined;
      
      // Validate company access and determine allowed companies
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
        if (companyId && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
      }
      
      // Get all transactions for the year
      const allTransactions = await storage.getAllTransactions(10000);
      const yearTransactions = allTransactions.filter(t => {
        const txYear = new Date(t.date).getFullYear();
        return txYear === year && t.type === 'expense';
      });
      
      // Build group to expense mapping
      const groupExpenses: { [groupId: string]: { name: string; value: number } } = {};
      
      const allDepartments = await storage.getAllDepartments();
      
      // Filter by company: use specific company, user's allowed companies, or all (admin only)
      let filteredDepartments = allDepartments;
      if (companyId) {
        filteredDepartments = allDepartments.filter(d => d.companyId === companyId);
      } else if (allowedCompanyIds) {
        filteredDepartments = allDepartments.filter(d => d.companyId && allowedCompanyIds!.includes(d.companyId));
      }
      
      if (departmentId && departmentId !== 'all') {
        filteredDepartments = filteredDepartments.filter(d => d.id === departmentId);
      }
      
      for (const dept of filteredDepartments) {
        const groups = await storage.getCostGroupsByDepartment(dept.id);
        for (const group of groups) {
          const items = await storage.getBudgetItemsByCostGroup(group.id, year);
          const itemIds = new Set(items.map((i: BudgetItem) => i.id));
          
          const groupTotal = yearTransactions
            .filter(t => t.budgetItemId && itemIds.has(t.budgetItemId))
            .reduce((sum, t) => sum + ((t.amount || 0) / 100), 0);
          
          if (groupTotal > 0) {
            if (!groupExpenses[group.id]) {
              groupExpenses[group.id] = { name: group.name, value: 0 };
            }
            groupExpenses[group.id].value += groupTotal;
          }
        }
      }
      
      const data = Object.values(groupExpenses)
        .map(g => ({ ...g, value: Math.round(g.value) }))
        .sort((a, b) => b.value - a.value);
      
      const total = data.reduce((sum, d) => sum + d.value, 0);
      const dataWithPercentage = data.map(d => ({
        ...d,
        percentage: total > 0 ? Math.round((d.value / total) * 100) : 0,
      }));
      
      return res.json({ data: dataWithPercentage, total });
    } catch (error) {
      console.error('Department groups error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard project phases breakdown
  app.get("/api/dashboard/project-phases", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const companyId = req.query.companyId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      
      // Validate company access and determine allowed companies
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
        if (companyId && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
      }
      
      // Get all transactions for the year
      const allTransactions = await storage.getAllTransactions(10000);
      const yearTransactions = allTransactions.filter(t => {
        const txYear = new Date(t.date).getFullYear();
        return txYear === year && t.type === 'expense';
      });
      
      // Build phase to expense mapping
      const phaseExpenses: { [phaseId: string]: { name: string; value: number } } = {};
      
      const allProjects = await storage.getAllProjects();
      
      // Filter by company: use specific company, user's allowed companies, or all (admin only)
      let filteredProjects = allProjects;
      if (companyId) {
        filteredProjects = allProjects.filter(p => p.companyId === companyId);
      } else if (allowedCompanyIds) {
        filteredProjects = allProjects.filter(p => p.companyId && allowedCompanyIds!.includes(p.companyId));
      }
      
      if (projectId && projectId !== 'all') {
        filteredProjects = filteredProjects.filter(p => p.id === projectId);
      }
      
      for (const proj of filteredProjects) {
        const phases = await storage.getPhasesByProject(proj.id);
        for (const phase of phases) {
          const items = await storage.getBudgetItemsByProjectPhase(phase.id, year);
          const itemIds = new Set(items.map((i: BudgetItem) => i.id));
          
          const phaseTotal = yearTransactions
            .filter(t => t.budgetItemId && itemIds.has(t.budgetItemId))
            .reduce((sum, t) => sum + ((t.amount || 0) / 100), 0);
          
          if (phaseTotal > 0) {
            if (!phaseExpenses[phase.id]) {
              phaseExpenses[phase.id] = { name: phase.name, value: 0 };
            }
            phaseExpenses[phase.id].value += phaseTotal;
          }
        }
      }
      
      const data = Object.values(phaseExpenses)
        .map(p => ({ ...p, value: Math.round(p.value) }))
        .sort((a, b) => b.value - a.value);
      
      const total = data.reduce((sum, d) => sum + d.value, 0);
      const dataWithPercentage = data.map(d => ({
        ...d,
        percentage: total > 0 ? Math.round((d.value / total) * 100) : 0,
      }));
      
      return res.json({ data: dataWithPercentage, total });
    } catch (error) {
      console.error('Project phases error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard budget ratio (Project vs Department budgets)
  app.get("/api/dashboard/budget-ratio", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const companyId = req.query.companyId as string | undefined;
      
      // Validate company access and determine allowed companies
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
        if (companyId && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
      }
      
      const allDepartments = await storage.getAllDepartments();
      const allProjects = await storage.getAllProjects();
      
      // Filter by company: use specific company, user's allowed companies, or all (admin only)
      let filteredDepartments = allDepartments;
      let filteredProjects = allProjects;
      if (companyId) {
        filteredDepartments = allDepartments.filter(d => d.companyId === companyId);
        filteredProjects = allProjects.filter(p => p.companyId === companyId);
      } else if (allowedCompanyIds) {
        filteredDepartments = allDepartments.filter(d => d.companyId && allowedCompanyIds!.includes(d.companyId));
        filteredProjects = allProjects.filter(p => p.companyId && allowedCompanyIds!.includes(p.companyId));
      }
      
      let departmentBudget = 0;
      let projectBudget = 0;
      
      for (const dept of filteredDepartments) {
        const groups = await storage.getCostGroupsByDepartment(dept.id);
        for (const group of groups) {
          const items = await storage.getBudgetItemsByCostGroup(group.id, year);
          items.forEach((item: any) => {
            const values = item.monthlyValues as Record<string, number>;
            if (values) {
              departmentBudget += Object.values(values).reduce((sum, v) => sum + (v || 0), 0);
            }
          });
        }
      }
      
      for (const proj of filteredProjects) {
        const phases = await storage.getPhasesByProject(proj.id);
        for (const phase of phases) {
          const items = await storage.getBudgetItemsByProjectPhase(phase.id, year);
          items.forEach((item: any) => {
            if (item.type === 'cost') {
              const values = item.monthlyValues as Record<string, number>;
              if (values) {
                projectBudget += Object.values(values).reduce((sum, v) => sum + (v || 0), 0);
              }
            }
          });
        }
      }
      
      const total = departmentBudget + projectBudget;
      
      return res.json({
        data: [
          { name: 'Departman Bütçesi', value: Math.round(departmentBudget), percentage: total > 0 ? Math.round((departmentBudget / total) * 100) : 0 },
          { name: 'Proje Bütçesi', value: Math.round(projectBudget), percentage: total > 0 ? Math.round((projectBudget / total) * 100) : 0 },
        ],
        total: Math.round(total),
      });
    } catch (error) {
      console.error('Budget ratio error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard department groups budget breakdown
  app.get("/api/dashboard/budget-department-groups", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const companyId = req.query.companyId as string | undefined;
      const departmentId = req.query.departmentId as string | undefined;
      
      // Validate company access and determine allowed companies
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
        if (companyId && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
      }
      
      const groupBudgets: { [groupId: string]: { name: string; value: number } } = {};
      
      const allDepartments = await storage.getAllDepartments();
      
      // Filter by company: use specific company, user's allowed companies, or all (admin only)
      let filteredDepartments = allDepartments;
      if (companyId) {
        filteredDepartments = allDepartments.filter(d => d.companyId === companyId);
      } else if (allowedCompanyIds) {
        filteredDepartments = allDepartments.filter(d => d.companyId && allowedCompanyIds!.includes(d.companyId));
      }
      
      if (departmentId && departmentId !== 'all') {
        filteredDepartments = filteredDepartments.filter(d => d.id === departmentId);
      }
      
      for (const dept of filteredDepartments) {
        const groups = await storage.getCostGroupsByDepartment(dept.id);
        for (const group of groups) {
          const items = await storage.getBudgetItemsByCostGroup(group.id, year);
          let groupTotal = 0;
          items.forEach((item: any) => {
            const values = item.monthlyValues as Record<string, number>;
            if (values) {
              groupTotal += Object.values(values).reduce((sum, v) => sum + (v || 0), 0);
            }
          });
          
          if (groupTotal > 0) {
            if (!groupBudgets[group.id]) {
              groupBudgets[group.id] = { name: group.name, value: 0 };
            }
            groupBudgets[group.id].value += groupTotal;
          }
        }
      }
      
      const data = Object.values(groupBudgets)
        .map(g => ({ ...g, value: Math.round(g.value) }))
        .sort((a, b) => b.value - a.value);
      
      const total = data.reduce((sum, d) => sum + d.value, 0);
      const dataWithPercentage = data.map(d => ({
        ...d,
        percentage: total > 0 ? Math.round((d.value / total) * 100) : 0,
      }));
      
      return res.json({ data: dataWithPercentage, total });
    } catch (error) {
      console.error('Budget department groups error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Dashboard project phases budget breakdown
  app.get("/api/dashboard/budget-project-phases", async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const companyId = req.query.companyId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      
      // Validate company access and determine allowed companies
      let allowedCompanyIds: string[] | null = null;
      if (req.session.role !== 'admin' && req.session.userId) {
        allowedCompanyIds = await storage.getUserCompanies(req.session.userId);
        if (companyId && !allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({ message: "Unauthorized access to this company" });
        }
      }
      
      const phaseBudgets: { [phaseId: string]: { name: string; value: number } } = {};
      
      const allProjects = await storage.getAllProjects();
      
      // Filter by company: use specific company, user's allowed companies, or all (admin only)
      let filteredProjects = allProjects;
      if (companyId) {
        filteredProjects = allProjects.filter(p => p.companyId === companyId);
      } else if (allowedCompanyIds) {
        filteredProjects = allProjects.filter(p => p.companyId && allowedCompanyIds!.includes(p.companyId));
      }
      
      if (projectId && projectId !== 'all') {
        filteredProjects = filteredProjects.filter(p => p.id === projectId);
      }
      
      for (const proj of filteredProjects) {
        const phases = await storage.getPhasesByProject(proj.id);
        for (const phase of phases) {
          const items = await storage.getBudgetItemsByProjectPhase(phase.id, year);
          let phaseTotal = 0;
          items.forEach((item: any) => {
            if (item.type === 'cost') {
              const values = item.monthlyValues as Record<string, number>;
              if (values) {
                phaseTotal += Object.values(values).reduce((sum, v) => sum + (v || 0), 0);
              }
            }
          });
          
          if (phaseTotal > 0) {
            if (!phaseBudgets[phase.id]) {
              phaseBudgets[phase.id] = { name: phase.name, value: 0 };
            }
            phaseBudgets[phase.id].value += phaseTotal;
          }
        }
      }
      
      const data = Object.values(phaseBudgets)
        .map(p => ({ ...p, value: Math.round(p.value) }))
        .sort((a, b) => b.value - a.value);
      
      const total = data.reduce((sum, d) => sum + d.value, 0);
      const dataWithPercentage = data.map(d => ({
        ...d,
        percentage: total > 0 ? Math.round((d.value / total) * 100) : 0,
      }));
      
      return res.json({ data: dataWithPercentage, total });
    } catch (error) {
      console.error('Budget project phases error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== USERS & ASSIGNMENTS =====
  
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithAssignments = await Promise.all(
        allUsers.map(async (user) => {
          const assignedDepartmentIds = await storage.getUserDepartments(user.id);
          const assignedProjectIds = await storage.getUserProjects(user.id);
          return {
            ...user,
            password: undefined,
            assignedDepartmentIds,
            assignedProjectIds,
          };
        })
      );
      return res.json(usersWithAssignments);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const { username, password, name, role } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ message: "Username, password, and name are required" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        role: role || 'user',
      });
      return res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, role, password } = req.body;
      const updates: any = {};
      if (name) updates.name = name;
      if (role) updates.role = role;
      if (password) {
        const bcrypt = await import('bcrypt');
        updates.password = await bcrypt.hash(password, 10);
      }
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({ ...user, password: undefined });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/users/:id/assignments", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { departmentIds, projectIds } = req.body;
      
      if (departmentIds !== undefined) {
        await storage.setUserDepartments(id, departmentIds);
      }
      if (projectIds !== undefined) {
        await storage.setUserProjects(id, projectIds);
      }
      
      const assignedDepartmentIds = await storage.getUserDepartments(id);
      const assignedProjectIds = await storage.getUserProjects(id);
      
      return res.json({ assignedDepartmentIds, assignedProjectIds });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/users/:id/company-assignments", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { companyIds } = req.body;
      
      if (companyIds !== undefined) {
        await storage.setUserCompanies(id, companyIds);
      }
      
      const assignedCompanyIds = await storage.getUserCompanies(id);
      
      return res.json({ assignedCompanyIds });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== PROJECT TYPES =====
  
  app.get("/api/project-types", async (req: Request, res: Response) => {
    try {
      const types = await storage.getAllProjectTypes();
      return res.json(types);
    } catch (error) {
      console.error('Get project types error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/project-types/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const type = await storage.getProjectType(id);
      if (!type) {
        return res.status(404).json({ message: "Project type not found" });
      }
      return res.json(type);
    } catch (error) {
      console.error('Get project type error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-types", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { name, code, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const type = await storage.createProjectType({ name, code, sortOrder });
      return res.status(201).json(type);
    } catch (error) {
      console.error('Create project type error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/project-types/:id", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id } = req.params;
      const { name, code, sortOrder } = req.body;
      const updates: { name?: string; code?: string; sortOrder?: number } = {};
      if (name !== undefined) updates.name = name;
      if (code !== undefined) updates.code = code;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const updated = await storage.updateProjectType(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Project type not found" });
      }
      return res.json(updated);
    } catch (error) {
      console.error('Update project type error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/project-types/:id", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id } = req.params;
      await storage.deleteProjectType(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Delete project type error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-types/reorder", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id1, id2 } = req.body;
      if (!id1 || !id2) {
        return res.status(400).json({ message: "Both id1 and id2 are required" });
      }
      await storage.reorderProjectTypes(id1, id2);
      return res.json({ success: true });
    } catch (error) {
      console.error('Reorder project types error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ===== PROJECT TYPE PHASES =====
  
  app.get("/api/project-types/:typeId/phases", async (req: Request, res: Response) => {
    try {
      const { typeId } = req.params;
      const phaseType = req.query.type as string | undefined;
      const phases = await storage.getPhasesByProjectType(typeId, phaseType);
      return res.json(phases);
    } catch (error) {
      console.error('Get project type phases error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-types/:typeId/phases", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { typeId } = req.params;
      const { name, sortOrder, type } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }
      const phaseType = type === 'revenue' ? 'revenue' : 'cost';
      const phase = await storage.createProjectTypePhase({ projectTypeId: typeId, name, sortOrder, type: phaseType });
      return res.status(201).json(phase);
    } catch (error) {
      console.error('Create project type phase error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/project-type-phases/:id", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id } = req.params;
      const { name, sortOrder } = req.body;
      const updates: { name?: string; sortOrder?: number } = {};
      if (name !== undefined) updates.name = name;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const updated = await storage.updateProjectTypePhase(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Project type phase not found" });
      }
      return res.json(updated);
    } catch (error) {
      console.error('Update project type phase error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/project-type-phases/:id", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id } = req.params;
      await storage.deleteProjectTypePhase(id);
      return res.status(204).send();
    } catch (error) {
      console.error('Delete project type phase error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/project-type-phases/reorder", async (req: Request, res: Response) => {
    try {
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id1, id2 } = req.body;
      if (!id1 || !id2) {
        return res.status(400).json({ message: "Both id1 and id2 are required" });
      }
      await storage.reorderProjectTypePhases(id1, id2);
      return res.json({ success: true });
    } catch (error) {
      console.error('Reorder project type phases error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  return server;
}
