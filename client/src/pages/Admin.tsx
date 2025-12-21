import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { useDepartments, useProjects, useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUpdateUserAssignments, useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany, useUpdateUserCompanyAssignments, usePendingProcesses, useApproveProcess, useRejectProcess, useBulkApproveProcesses } from "@/lib/queries";
import { Search, UserPlus, Settings, CheckCheck, Pencil, Trash2, Loader2, Users, Building2, Plus, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useState } from "react";

export default function Admin() {
  const { currentYear } = useStore();
  const { data: departments = [] } = useDepartments(currentYear);
  const { data: projects = [] } = useProjects(currentYear);
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: pendingProcesses = [], isLoading: pendingProcessesLoading } = usePendingProcesses();
  const approveProcessMutation = useApproveProcess();
  const rejectProcessMutation = useRejectProcess();
  const bulkApproveMutation = useBulkApproveProcesses();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const updateAssignmentsMutation = useUpdateUserAssignments();
  const updateCompanyAssignmentsMutation = useUpdateUserCompanyAssignments();
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const deleteCompanyMutation = useDeleteCompany();

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

  const pendingItems = [
    { id: 1, dept: 'Bilgi Teknolojileri', group: 'Personel', item: 'Yeni Yazılımcı Maaşı', amount: 45000, date: '2025-01-10' },
    { id: 2, dept: 'İnsan Kaynakları', group: 'Eğitim', item: 'Liderlik Eğitimi', amount: 5000, date: '2025-01-12' },
    { id: 3, dept: 'Bilgi Teknolojileri', group: 'Altyapı', item: 'Yedekleme Sunucusu', amount: 2000, date: '2025-01-14' },
  ];

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
                <div className="space-y-2 border rounded-lg p-3">
                  {departments.map((dept) => (
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
                <CardTitle>Toplu Onay</CardTitle>
                <CardDescription>Departmanlardan gelen onay bekleyen bütçe kalemleri</CardDescription>
              </div>
              <Button onClick={handleBulkApprove} className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-bulk-approve">
                <CheckCheck className="mr-2 h-4 w-4" />
                Tümünü Onayla
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departman</TableHead>
                    <TableHead>Grup</TableHead>
                    <TableHead>Kalem</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-center">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.dept}</TableCell>
                      <TableCell>{item.group}</TableCell>
                      <TableCell>{item.item}</TableCell>
                      <TableCell className="text-right tabular-nums">€ {item.amount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.date}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">Onayla</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <Card>
            <CardHeader>
              <CardTitle>Genel Ayarlar</CardTitle>
              <CardDescription>Bütçe yılı ve para birimi ayarları</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aktif Bütçe Yılı</Label>
                  <Input value="2025" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Para Birimi</Label>
                  <Input value="EUR (€)" readOnly />
                </div>
              </div>
              <div className="pt-4">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Sistem Parametrelerini Düzenle
                </Button>
              </div>
            </CardContent>
          </Card>
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
