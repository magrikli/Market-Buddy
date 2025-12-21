import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { useDepartments, useDepartmentGroups, useProjects, useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUpdateUserAssignments, useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany, useUpdateUserCompanyAssignments, usePendingProcesses, useApproveProcess, useRejectProcess, useBulkApproveProcesses, usePendingBudgetItems, useApproveBudgetItem, useRejectBudgetItem, useBulkApproveBudgetItems, useProjectTypes, useCreateProjectType, useUpdateProjectType, useDeleteProjectType, useReorderProjectTypes, useProjectTypePhases, useCreateProjectTypePhase, useDeleteProjectTypePhase, useReorderProjectTypePhases } from "@/lib/queries";
import { Search, UserPlus, CheckCheck, Pencil, Trash2, Loader2, Users, Building2, Plus, X, Settings, ArrowUp, ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useState } from "react";

export default function Admin() {
  const { currentYear } = useStore();
  const { data: departments = [] } = useDepartments(currentYear);
  const { data: departmentGroups = [] } = useDepartmentGroups();
  const { data: projects = [] } = useProjects(currentYear);
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: pendingProcesses = [], isLoading: pendingProcessesLoading } = usePendingProcesses();
  const { data: pendingBudgetItems = [], isLoading: pendingBudgetItemsLoading } = usePendingBudgetItems(currentYear);
  const approveProcessMutation = useApproveProcess();
  const rejectProcessMutation = useRejectProcess();
  const bulkApproveMutation = useBulkApproveProcesses();
  const approveBudgetItemMutation = useApproveBudgetItem();
  const rejectBudgetItemMutation = useRejectBudgetItem();
  const bulkApproveBudgetItemsMutation = useBulkApproveBudgetItems();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const updateAssignmentsMutation = useUpdateUserAssignments();
  const updateCompanyAssignmentsMutation = useUpdateUserCompanyAssignments();
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const deleteCompanyMutation = useDeleteCompany();
  
  // Project types
  const { data: projectTypes = [], isLoading: projectTypesLoading } = useProjectTypes();
  const createProjectTypeMutation = useCreateProjectType();
  const updateProjectTypeMutation = useUpdateProjectType();
  const deleteProjectTypeMutation = useDeleteProjectType();
  const reorderProjectTypesMutation = useReorderProjectTypes();
  
  // Project type phases - separate queries for cost and revenue
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState<string | null>(null);
  const { data: costPhases = [], isLoading: costPhasesLoading } = useProjectTypePhases(selectedProjectTypeId, 'cost');
  const { data: revenuePhases = [], isLoading: revenuePhasesLoading } = useProjectTypePhases(selectedProjectTypeId, 'revenue');
  const projectTypePhasesLoading = costPhasesLoading || revenuePhasesLoading;
  const createProjectTypePhaseMutation = useCreateProjectTypePhase();
  const deleteProjectTypePhaseMutation = useDeleteProjectTypePhase();
  const reorderProjectTypePhasesMutation = useReorderProjectTypePhases();

  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; username: string; role: string } | null>(null);
  const [assigningUser, setAssigningUser] = useState<{ id: string; name: string; assignedDepartmentIds: string[]; assignedProjectIds: string[] } | null>(null);
  
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("user");
  
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string; code: string } | null>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCode, setNewCompanyCode] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyCode, setEditCompanyCode] = useState("");

  // Project type state
  const [newProjectTypeName, setNewProjectTypeName] = useState("");
  const [newProjectTypeCode, setNewProjectTypeCode] = useState("");
  const [newCostPhaseName, setNewCostPhaseName] = useState("");
  const [newRevenuePhaseName, setNewRevenuePhaseName] = useState("");

  const handleApproveProcess = async (processId: string, projectId: string) => {
    try {
      await approveProcessMutation.mutateAsync({ id: processId, projectId });
      toast.success("Süreç onaylandı");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleRejectProcess = async (processId: string, projectId: string) => {
    try {
      await rejectProcessMutation.mutateAsync({ id: processId, projectId });
      toast.success("Süreç reddedildi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleBulkApprove = async () => {
    if (pendingProcesses.length === 0) return;
    try {
      const ids = pendingProcesses.map(p => p.id);
      const result = await bulkApproveMutation.mutateAsync(ids);
      toast.success(`${result.approvedCount} süreç onaylandı`);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Bilinmeyen Proje';
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword || !newName) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        username: newUsername,
        password: newPassword,
        name: newName,
        role: newRole,
      });
      toast.success("Kullanıcı oluşturuldu", { description: newName });
      setIsNewUserOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewRole("user");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    try {
      const data: any = {};
      if (editName) data.name = editName;
      if (editRole) data.role = editRole;
      if (editPassword) data.password = editPassword;
      
      await updateUserMutation.mutateAsync({ id: editingUser.id, data });
      toast.success("Kullanıcı güncellendi");
      setIsEditUserOpen(false);
      setEditingUser(null);
      setEditName("");
      setEditRole("");
      setEditPassword("");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteUserMutation.mutateAsync(id);
      toast.success("Kullanıcı silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPassword("");
    setIsEditUserOpen(true);
  };

  const openAssignDialog = (user: any) => {
    setAssigningUser(user);
    setSelectedDepartments(user.assignedDepartmentIds || []);
    setSelectedProjects(user.assignedProjectIds || []);
    setSelectedCompanies(user.assignedCompanyIds || []);
    setIsAssignOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!assigningUser) return;
    try {
      await updateAssignmentsMutation.mutateAsync({
        id: assigningUser.id,
        data: {
          departmentIds: selectedDepartments,
          projectIds: selectedProjects,
        },
      });
      await updateCompanyAssignmentsMutation.mutateAsync({
        id: assigningUser.id,
        companyIds: selectedCompanies,
      });
      toast.success("Atamalar güncellendi", { description: assigningUser.name });
      setIsAssignOpen(false);
      setAssigningUser(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
    );
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName || !newCompanyCode) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    try {
      await createCompanyMutation.mutateAsync({
        name: newCompanyName,
        code: newCompanyCode,
      });
      toast.success("Şirket oluşturuldu", { description: newCompanyName });
      setIsNewCompanyOpen(false);
      setNewCompanyName("");
      setNewCompanyCode("");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const openEditCompanyDialog = (company: any) => {
    setEditingCompany(company);
    setEditCompanyName(company.name);
    setEditCompanyCode(company.code);
    setIsEditCompanyOpen(true);
  };

  const handleEditCompany = async () => {
    if (!editingCompany) return;
    try {
      await updateCompanyMutation.mutateAsync({
        id: editingCompany.id,
        data: { name: editCompanyName, code: editCompanyCode },
      });
      toast.success("Şirket güncellendi");
      setIsEditCompanyOpen(false);
      setEditingCompany(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!confirm(`"${name}" şirketini silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteCompanyMutation.mutateAsync(id);
      toast.success("Şirket silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  
  const handleApproveBudgetItem = async (id: string) => {
    try {
      await approveBudgetItemMutation.mutateAsync(id);
      toast.success("Bütçe kalemi onaylandı");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleRejectBudgetItem = async (id: string) => {
    try {
      await rejectBudgetItemMutation.mutateAsync(id);
      toast.success("Bütçe kalemi reddedildi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleBulkApproveBudgetItems = async () => {
    if (pendingBudgetItems.length === 0) return;
    try {
      const ids = pendingBudgetItems.map(item => item.id);
      const result = await bulkApproveBudgetItemsMutation.mutateAsync(ids);
      toast.success(`${result.approvedCount} bütçe kalemi onaylandı`);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const getTotalBudget = (monthlyValues: Record<string, number>) => {
    return Object.values(monthlyValues || {}).reduce((sum, val) => sum + (val || 0), 0);
  };

  // Project type handlers
  const handleAddProjectType = async () => {
    if (!newProjectTypeName.trim()) {
      toast.error("Tip adı gerekli");
      return;
    }
    try {
      const newType = await createProjectTypeMutation.mutateAsync({ 
        name: newProjectTypeName.trim(), 
        code: newProjectTypeCode.trim() || undefined 
      });
      toast.success("Proje tipi eklendi");
      setNewProjectTypeName("");
      setNewProjectTypeCode("");
      setSelectedProjectTypeId(newType.id);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteProjectType = async (id: string, name: string) => {
    if (!confirm(`"${name}" proje tipini ve tüm fazlarını silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteProjectTypeMutation.mutateAsync(id);
      toast.success("Proje tipi silindi");
      if (selectedProjectTypeId === id) {
        setSelectedProjectTypeId(null);
      }
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleMoveProjectType = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = projectTypes.findIndex(t => t.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= projectTypes.length) return;
    
    const currentType = projectTypes[currentIndex];
    const targetType = projectTypes[newIndex];
    
    try {
      await reorderProjectTypesMutation.mutateAsync({ id1: currentType.id, id2: targetType.id });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAddProjectTypePhase = async (phaseType: 'cost' | 'revenue') => {
    if (!selectedProjectTypeId) return;
    const phaseName = phaseType === 'cost' ? newCostPhaseName : newRevenuePhaseName;
    if (!phaseName.trim()) {
      toast.error("Faz adı gerekli");
      return;
    }
    try {
      await createProjectTypePhaseMutation.mutateAsync({ 
        projectTypeId: selectedProjectTypeId, 
        data: { name: phaseName.trim(), type: phaseType } 
      });
      toast.success("Faz eklendi");
      if (phaseType === 'cost') {
        setNewCostPhaseName("");
      } else {
        setNewRevenuePhaseName("");
      }
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteProjectTypePhase = async (id: string, name: string) => {
    if (!selectedProjectTypeId) return;
    if (!confirm(`"${name}" fazını silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteProjectTypePhaseMutation.mutateAsync({ id, projectTypeId: selectedProjectTypeId });
      toast.success("Faz silindi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleMoveProjectTypePhase = async (id: string, direction: 'up' | 'down', phaseType: 'cost' | 'revenue') => {
    if (!selectedProjectTypeId) return;
    const phases = phaseType === 'cost' ? costPhases : revenuePhases;
    const currentIndex = phases.findIndex(p => p.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= phases.length) return;
    
    const currentPhase = phases[currentIndex];
    const targetPhase = phases[newIndex];
    
    try {
      await reorderProjectTypePhasesMutation.mutateAsync({ 
        id1: currentPhase.id, 
        id2: targetPhase.id, 
        projectTypeId: selectedProjectTypeId 
      });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-1">Sistem ayarları ve kullanıcı yetkilendirme.</p>
      </div>

      <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
            <DialogDescription>Sisteme yeni bir kullanıcı tanımlayın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input id="username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="ornek_kullanici" data-testid="input-new-username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ahmet Yılmaz" data-testid="input-new-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" data-testid="input-new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="admin">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserOpen(false)}>İptal</Button>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending} data-testid="button-create-user">
              {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
            <DialogDescription>Kullanıcı bilgilerini güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Ad Soyad</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} data-testid="input-edit-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="admin">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Yeni Şifre (opsiyonel)</Label>
              <Input id="edit-password" type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Değiştirmek için yeni şifre girin" data-testid="input-edit-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>İptal</Button>
            <Button onClick={handleEditUser} disabled={updateUserMutation.isPending} data-testid="button-save-user">
              {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Şirket, Departman ve Proje Ataması</DialogTitle>
            <DialogDescription>
              {assigningUser?.name} için erişim yetkilerini belirleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Şirketler</Label>
              {companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz şirket bulunmuyor.</p>
              ) : (
                <div className="space-y-2 border rounded-lg p-3">
                  {companies.map((company) => (
                    <div key={company.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={selectedCompanies.includes(company.id)}
                        onCheckedChange={() => toggleCompany(company.id)}
                        data-testid={`checkbox-company-${company.id}`}
                      />
                      <label htmlFor={`company-${company.id}`} className="text-sm cursor-pointer flex-1">
                        {company.name} <span className="text-muted-foreground">({company.code})</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Departmanlar</Label>
              {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz departman bulunmuyor.</p>
              ) : (
                <div className="space-y-3 border rounded-lg p-3">
                  {departmentGroups
                    .slice()
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((group) => {
                      const groupDepts = departments
                        .filter((d) => d.groupId === group.id)
                        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                      if (groupDepts.length === 0) return null;
                      return (
                        <div key={group.id} className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
                            {group.name}
                          </div>
                          <div className="space-y-1 pl-2">
                            {groupDepts.map((dept) => (
                              <div key={dept.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`dept-${dept.id}`}
                                  checked={selectedDepartments.includes(dept.id)}
                                  onCheckedChange={() => toggleDepartment(dept.id)}
                                  data-testid={`checkbox-dept-${dept.id}`}
                                />
                                <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer flex-1">
                                  {dept.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  {(() => {
                    const ungroupedDepts = departments
                      .filter((d) => !d.groupId)
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                    if (ungroupedDepts.length === 0) return null;
                    return (
                      <div className="space-y-1">
                        {departmentGroups.length > 0 && (
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">
                            Diğer
                          </div>
                        )}
                        <div className={departmentGroups.length > 0 ? "space-y-1 pl-2" : "space-y-1"}>
                          {ungroupedDepts.map((dept) => (
                            <div key={dept.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`dept-${dept.id}`}
                                checked={selectedDepartments.includes(dept.id)}
                                onCheckedChange={() => toggleDepartment(dept.id)}
                                data-testid={`checkbox-dept-${dept.id}`}
                              />
                              <label htmlFor={`dept-${dept.id}`} className="text-sm cursor-pointer flex-1">
                                {dept.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Projeler</Label>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz proje bulunmuyor.</p>
              ) : (
                <div className="space-y-2 border rounded-lg p-3">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                        data-testid={`checkbox-project-${project.id}`}
                      />
                      <label htmlFor={`project-${project.id}`} className="text-sm cursor-pointer flex-1">
                        {project.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>İptal</Button>
            <Button onClick={handleSaveAssignments} disabled={updateAssignmentsMutation.isPending} data-testid="button-save-assignments">
              {updateAssignmentsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
          <TabsTrigger value="approvals" data-testid="tab-approvals">Onay Bekleyenler</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="companies" data-testid="tab-companies">Şirketler</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Ayarlar</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Onay Bekleyen Bütçe Kalemleri</CardTitle>
                <CardDescription>Departmanlardan ve projelerden gelen onay bekleyen bütçe kalemleri</CardDescription>
              </div>
              {pendingBudgetItems.length > 0 && (
                <Button 
                  onClick={handleBulkApproveBudgetItems} 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  disabled={bulkApproveBudgetItemsMutation.isPending}
                  data-testid="button-bulk-approve"
                >
                  {bulkApproveBudgetItemsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Tümünü Onayla ({pendingBudgetItems.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pendingBudgetItemsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pendingBudgetItems.length === 0 ? (
                <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">Onay bekleyen bütçe kalemi bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBudgetItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.departmentName} • {item.costGroupName}
                            {item.currentRevision > 0 && (
                              <span className="ml-2 text-amber-600">Rev {item.currentRevision}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold tabular-nums">€ {formatCurrency(getTotalBudget(item.monthlyValues))}</span>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleApproveBudgetItem(item.id)}
                              disabled={approveBudgetItemMutation.isPending}
                            >
                              Onayla
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRejectBudgetItem(item.id)}
                              disabled={rejectBudgetItemMutation.isPending}
                            >
                              Reddet
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Değer</th>
                              {monthNames.map((month, idx) => (
                                <th key={idx} className="text-right px-2 py-1 text-muted-foreground font-medium min-w-[60px]">{month}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1 pr-2 font-medium text-foreground">Yeni</td>
                              {monthNames.map((_, idx) => (
                                <td key={idx} className="text-right px-2 py-1 tabular-nums">
                                  {formatCurrency(item.monthlyValues?.[idx.toString()] || 0)}
                                </td>
                              ))}
                            </tr>
                            {item.previousApprovedValues && (
                              <tr className="text-muted-foreground bg-muted/30">
                                <td className="py-1 pr-2 font-medium">Önceki</td>
                                {monthNames.map((_, idx) => {
                                  const prevVal = item.previousApprovedValues?.[idx.toString()] || 0;
                                  const newVal = item.monthlyValues?.[idx.toString()] || 0;
                                  const diff = newVal - prevVal;
                                  return (
                                    <td key={idx} className="text-right px-2 py-1 tabular-nums">
                                      <div>{formatCurrency(prevVal)}</div>
                                      {diff !== 0 && (
                                        <div className={`text-xs ${diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                          {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Onay Bekleyen Süreçler</CardTitle>
                <CardDescription>Projelerden gelen onay bekleyen süreçler</CardDescription>
              </div>
              {pendingProcesses.length > 0 && (
                <Button 
                  onClick={handleBulkApprove} 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  disabled={bulkApproveMutation.isPending}
                  data-testid="button-bulk-approve-processes"
                >
                  {bulkApproveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Tümünü Onayla ({pendingProcesses.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pendingProcessesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pendingProcesses.length === 0 ? (
                <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">Onay bekleyen süreç bulunmuyor.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proje</TableHead>
                      <TableHead>Süreç Adı</TableHead>
                      <TableHead>Başlangıç</TableHead>
                      <TableHead>Bitiş</TableHead>
                      <TableHead>Süre</TableHead>
                      <TableHead className="text-center">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingProcesses.map((process) => {
                      const startDate = new Date(process.startDate);
                      const endDate = new Date(process.endDate);
                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return (
                      <TableRow key={process.id}>
                        <TableCell className="font-medium">{getProjectName(process.projectId)}</TableCell>
                        <TableCell>{process.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{startDate.toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{endDate.toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{diffDays} gün</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleApproveProcess(process.id, process.projectId)}
                              disabled={approveProcessMutation.isPending}
                            >
                              Onayla
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRejectProcess(process.id, process.projectId)}
                              disabled={rejectProcessMutation.isPending}
                            >
                              Reddet
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle>Kullanıcılar</CardTitle>
                <CardDescription>Sisteme erişimi olan personelleri yönetin</CardDescription>
              </div>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsNewUserOpen(true)} data-testid="button-new-user">
                <UserPlus className="mr-2 h-4 w-4" />
                Yeni Kullanıcı
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="İsim veya kullanıcı adı ile ara..." className="pl-9" data-testid="input-search-users" />
                </div>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">Henüz kullanıcı bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors" data-testid={`row-user-${user.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {user.assignedCompanyIds?.length || 0} Şirket, {user.assignedDepartmentIds.length} Departman, {user.assignedProjectIds.length} Proje
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAssignDialog(user)} title="Atamalar" data-testid={`button-assign-${user.id}`}>
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(user)} title="Düzenle" data-testid={`button-edit-${user.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteUser(user.id, user.name)} title="Sil" data-testid={`button-delete-${user.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Şirket Yönetimi</CardTitle>
                <CardDescription>Sisteme kayıtlı şirketleri yönetin</CardDescription>
              </div>
              <Button onClick={() => setIsNewCompanyOpen(true)} data-testid="button-add-company">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Şirket
              </Button>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Henüz şirket bulunmuyor.</p>
                  <p className="text-sm text-muted-foreground mt-1">İlk şirketi eklemek için "Yeni Şirket" butonunu kullanın.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors" data-testid={`row-company-${company.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{company.name}</p>
                          <p className="text-xs text-muted-foreground">Kod: {company.code}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCompanyDialog(company)} title="Düzenle" data-testid={`button-edit-company-${company.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCompany(company.id, company.name)} title="Sil" data-testid={`button-delete-company-${company.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Project Types Section */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Proje Tipleri
                </CardTitle>
                <CardDescription>
                  Proje tiplerini ve her tipin varsayılan fazlarını yönetin. Yeni proje oluşturulduğunda seçilen tipe ait fazlar otomatik eklenir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {projectTypesLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : projectTypes.length === 0 ? (
                  <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Henüz proje tipi tanımlı değil.</p>
                    <p className="text-sm text-muted-foreground mt-1">Aşağıdan yeni tipler ekleyebilirsiniz.</p>
                    <div className="flex gap-2 mt-4 justify-center">
                      <Input
                        placeholder="Tip adı..."
                        value={newProjectTypeName}
                        onChange={(e) => setNewProjectTypeName(e.target.value)}
                        className="max-w-xs"
                        data-testid="input-new-project-type-name"
                      />
                      <Input
                        placeholder="Kod"
                        value={newProjectTypeCode}
                        onChange={(e) => setNewProjectTypeCode(e.target.value)}
                        className="w-24"
                        data-testid="input-new-project-type-code"
                      />
                      <Button onClick={handleAddProjectType} disabled={createProjectTypeMutation.isPending} data-testid="button-add-project-type">
                        {createProjectTypeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <span className="ml-1">Ekle</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Project types list */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Proje Tipleri</h4>
                      {/* Add new project type */}
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Tip adı..."
                          value={newProjectTypeName}
                          onChange={(e) => setNewProjectTypeName(e.target.value)}
                          className="flex-1"
                          data-testid="input-new-project-type-name"
                        />
                        <Input
                          placeholder="Kod"
                          value={newProjectTypeCode}
                          onChange={(e) => setNewProjectTypeCode(e.target.value)}
                          className="w-20"
                          data-testid="input-new-project-type-code"
                        />
                        <Button size="sm" onClick={handleAddProjectType} disabled={createProjectTypeMutation.isPending} data-testid="button-add-project-type">
                          {createProjectTypeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                      {projectTypes.map((type, index) => (
                        <div 
                          key={type.id} 
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedProjectTypeId === type.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/30'}`}
                          onClick={() => setSelectedProjectTypeId(type.id)}
                          data-testid={`row-project-type-${type.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-mono w-5">{index + 1}.</span>
                            <span className="font-medium">{type.name}</span>
                            {type.code && <span className="text-xs text-muted-foreground">({type.code})</span>}
                          </div>
                          <div className="flex gap-0.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={(e) => { e.stopPropagation(); handleMoveProjectType(type.id, 'up'); }}
                              disabled={index === 0}
                              title="Yukarı taşı"
                              data-testid={`button-move-up-type-${type.id}`}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={(e) => { e.stopPropagation(); handleMoveProjectType(type.id, 'down'); }}
                              disabled={index === projectTypes.length - 1}
                              title="Aşağı taşı"
                              data-testid={`button-move-down-type-${type.id}`}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:text-destructive" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteProjectType(type.id, type.name); }}
                              title="Sil"
                              data-testid={`button-delete-type-${type.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Phases for selected project type - Cost and Revenue sections */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {selectedProjectTypeId ? `${projectTypes.find(t => t.id === selectedProjectTypeId)?.name} Fazları` : 'Tip seçin'}
                      </h4>
                      {selectedProjectTypeId ? (
                        <div className="space-y-4">
                          {/* Cost Phases Section */}
                          <div className="border rounded-lg p-3 bg-red-50/30">
                            <h5 className="font-medium text-sm mb-2 text-red-700">Gider Fazları (Cost)</h5>
                            <div className="flex gap-2 mb-2">
                              <Input
                                placeholder="Yeni gider fazı..."
                                value={newCostPhaseName}
                                onChange={(e) => setNewCostPhaseName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddProjectTypePhase('cost')}
                                className="text-sm"
                                data-testid="input-new-cost-phase"
                              />
                              <Button size="sm" onClick={() => handleAddProjectTypePhase('cost')} disabled={createProjectTypePhaseMutation.isPending} data-testid="button-add-cost-phase">
                                {createProjectTypePhaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                              </Button>
                            </div>
                            {costPhasesLoading ? (
                              <div className="flex justify-center p-2">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : costPhases.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">Henüz gider fazı yok.</p>
                            ) : (
                              <div className="space-y-1">
                                {costPhases.map((phase, index) => (
                                  <div key={phase.id} className="flex items-center justify-between p-2 border rounded bg-white hover:bg-muted/30 transition-colors" data-testid={`row-cost-phase-${phase.id}`}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground text-xs font-mono w-5">{index + 1}.</span>
                                      <span className="text-sm">{phase.name}</span>
                                    </div>
                                    <div className="flex gap-0.5">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveProjectTypePhase(phase.id, 'up', 'cost')} disabled={index === 0} data-testid={`button-move-up-cost-phase-${phase.id}`}>
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveProjectTypePhase(phase.id, 'down', 'cost')} disabled={index === costPhases.length - 1} data-testid={`button-move-down-cost-phase-${phase.id}`}>
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteProjectTypePhase(phase.id, phase.name)} data-testid={`button-delete-cost-phase-${phase.id}`}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Revenue Phases Section */}
                          <div className="border rounded-lg p-3 bg-green-50/30">
                            <h5 className="font-medium text-sm mb-2 text-green-700">Gelir Fazları (Revenue)</h5>
                            <div className="flex gap-2 mb-2">
                              <Input
                                placeholder="Yeni gelir fazı..."
                                value={newRevenuePhaseName}
                                onChange={(e) => setNewRevenuePhaseName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddProjectTypePhase('revenue')}
                                className="text-sm"
                                data-testid="input-new-revenue-phase"
                              />
                              <Button size="sm" onClick={() => handleAddProjectTypePhase('revenue')} disabled={createProjectTypePhaseMutation.isPending} data-testid="button-add-revenue-phase">
                                {createProjectTypePhaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                              </Button>
                            </div>
                            {revenuePhasesLoading ? (
                              <div className="flex justify-center p-2">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : revenuePhases.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">Henüz gelir fazı yok.</p>
                            ) : (
                              <div className="space-y-1">
                                {revenuePhases.map((phase, index) => (
                                  <div key={phase.id} className="flex items-center justify-between p-2 border rounded bg-white hover:bg-muted/30 transition-colors" data-testid={`row-revenue-phase-${phase.id}`}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground text-xs font-mono w-5">{index + 1}.</span>
                                      <span className="text-sm">{phase.name}</span>
                                    </div>
                                    <div className="flex gap-0.5">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveProjectTypePhase(phase.id, 'up', 'revenue')} disabled={index === 0} data-testid={`button-move-up-revenue-phase-${phase.id}`}>
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveProjectTypePhase(phase.id, 'down', 'revenue')} disabled={index === revenuePhases.length - 1} data-testid={`button-move-down-revenue-phase-${phase.id}`}>
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteProjectTypePhase(phase.id, phase.name)} data-testid={`button-delete-revenue-phase-${phase.id}`}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center p-4">Fazlarını görmek için bir tip seçin.</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

      </Tabs>

      <Dialog open={isNewCompanyOpen} onOpenChange={setIsNewCompanyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Şirket Ekle</DialogTitle>
            <DialogDescription>Sisteme yeni bir şirket tanımlayın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Şirket Adı</Label>
              <Input id="company-name" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Örnek Şirket A.Ş." data-testid="input-new-company-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-code">Şirket Kodu</Label>
              <Input id="company-code" value={newCompanyCode} onChange={(e) => setNewCompanyCode(e.target.value)} placeholder="ORNEK" data-testid="input-new-company-code" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCompanyOpen(false)}>İptal</Button>
            <Button onClick={handleCreateCompany} disabled={createCompanyMutation.isPending} data-testid="button-create-company">
              {createCompanyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şirket Düzenle</DialogTitle>
            <DialogDescription>Şirket bilgilerini güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-company-name">Şirket Adı</Label>
              <Input id="edit-company-name" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} data-testid="input-edit-company-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company-code">Şirket Kodu</Label>
              <Input id="edit-company-code" value={editCompanyCode} onChange={(e) => setEditCompanyCode(e.target.value)} data-testid="input-edit-company-code" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCompanyOpen(false)}>İptal</Button>
            <Button onClick={handleEditCompany} disabled={updateCompanyMutation.isPending} data-testid="button-save-company">
              {updateCompanyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
