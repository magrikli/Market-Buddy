import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertDepartmentSchema, insertCostGroupSchema, 
  insertProjectSchema, insertProjectPhaseSchema, insertBudgetItemSchema, 
  insertTransactionSchema, insertBudgetRevisionSchema, insertDepartmentGroupSchema,
  insertCompanySchema
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

      const departmentIds = await storage.getUserDepartments(user.id);
      const projectIds = await storage.getUserProjects(user.id);
      const companyIds = await storage.getUserCompanies(user.id);

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

  // ===== PROJECT PROCESSES =====
  
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
      // Admin only
      if (req.session.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
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

  return server;
}
