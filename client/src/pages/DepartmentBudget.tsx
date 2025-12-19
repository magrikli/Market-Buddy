import { useStore } from "@/lib/store";
import { useDepartments, useCreateDepartment, useCreateCostGroup, useCreateBudgetItem, useUpdateBudgetItem, useReviseBudgetItem, useApproveBudgetItem, useUpdateDepartment, useDeleteDepartment, useUpdateCostGroup, useDeleteCostGroup, useDeleteBudgetItem, useDepartmentGroups, useCreateDepartmentGroup, useUpdateDepartmentGroup, useDeleteDepartmentGroup } from "@/lib/queries";
import type { DepartmentGroup } from "@/lib/store";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Download, Filter, Loader2, Plus, MoreHorizontal, Pencil, Trash2, FolderOpen, Building2 } from "lucide-react";
import { useState } from "react";
import { AddEntityDialog, AddBudgetItemDialog } from "@/components/budget/AddEntityDialogs";
import { toast } from "sonner";
import type { BudgetMonthValues } from "@/lib/store";

export default function DepartmentBudget() {
  const { currentYear, setYear, currentUser } = useStore();
  const { data: departments = [], isLoading } = useDepartments(currentYear);
  const { data: departmentGroups = [] } = useDepartmentGroups();
  const createDepartmentMutation = useCreateDepartment();
  const createCostGroupMutation = useCreateCostGroup();
  const createBudgetItemMutation = useCreateBudgetItem();
  const updateBudgetItemMutation = useUpdateBudgetItem();
  const reviseBudgetItemMutation = useReviseBudgetItem();
  const approveBudgetItemMutation = useApproveBudgetItem();
  const updateDepartmentMutation = useUpdateDepartment();
  const deleteDepartmentMutation = useDeleteDepartment();
  const updateCostGroupMutation = useUpdateCostGroup();
  const deleteCostGroupMutation = useDeleteCostGroup();
  const deleteBudgetItemMutation = useDeleteBudgetItem();
  const createDepartmentGroupMutation = useCreateDepartmentGroup();
  const updateDepartmentGroupMutation = useUpdateDepartmentGroup();
  const deleteDepartmentGroupMutation = useDeleteDepartmentGroup();
  
  // Dialog States
  const [isNewDeptOpen, setIsNewDeptOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [isNewDeptGroupOpen, setIsNewDeptGroupOpen] = useState(false);
  const [activeDeptForGroup, setActiveDeptForGroup] = useState<string | null>(null);
  const [activeGroupForItem, setActiveGroupForItem] = useState<string | null>(null);
  
  // Edit dialog states
  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editDeptGroupOpen, setEditDeptGroupOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<{id: string; name: string} | null>(null);
  const [editingGroup, setEditingGroup] = useState<{id: string; name: string} | null>(null);
  const [editingDeptGroup, setEditingDeptGroup] = useState<{id: string; name: string} | null>(null);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(amount);
  };

  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  const getMonthlyTotals = (items: any[]) => {
    const totals: Record<number, number> = {};
    for (let i = 0; i < 12; i++) {
      totals[i] = items.reduce((sum, item) => sum + (item.values[i] || 0), 0);
    }
    return totals;
  };
  
  const handleAddDepartment = async (name: string) => {
    try {
      await createDepartmentMutation.mutateAsync(name);
      toast.success("Departman eklendi", { description: name });
      setIsNewDeptOpen(false);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAddGroup = async (name: string) => {
    if (!activeDeptForGroup) return;
    try {
      await createCostGroupMutation.mutateAsync({ name, departmentId: activeDeptForGroup });
      toast.success("Maliyet grubu eklendi", { description: name });
      setIsNewGroupOpen(false);
      setActiveDeptForGroup(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAddItem = async (name: string, type: 'cost' | 'revenue') => {
    if (!activeGroupForItem) return;
    try {
      await createBudgetItemMutation.mutateAsync({ 
        name, 
        type: 'cost', 
        costGroupId: activeGroupForItem,
        year: currentYear 
      });
      toast.success("Bütçe kalemi eklendi", { description: name });
      setIsNewItemOpen(false);
      setActiveGroupForItem(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleUpdateItem = async (itemId: string, values: BudgetMonthValues) => {
    try {
      await updateBudgetItemMutation.mutateAsync({ id: itemId, data: { monthlyValues: values } });
      toast.success("Güncellendi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleReviseItem = async (itemId: string) => {
    try {
      await reviseBudgetItemMutation.mutateAsync({ id: itemId, editorName: currentUser?.name || 'Unknown' });
      toast.success("Revizyon oluşturuldu");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleApproveItem = async (itemId: string) => {
    try {
      await approveBudgetItemMutation.mutateAsync(itemId);
      toast.success("Onaylandı");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleEditDepartment = async (name: string) => {
    if (!editingDept) return;
    try {
      await updateDepartmentMutation.mutateAsync({ id: editingDept.id, updates: { name } });
      toast.success("Departman güncellendi", { description: name });
      setEditDeptOpen(false);
      setEditingDept(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAddDeptGroup = async (name: string) => {
    try {
      await createDepartmentGroupMutation.mutateAsync(name);
      toast.success("Departman grubu eklendi", { description: name });
      setIsNewDeptGroupOpen(false);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleEditDeptGroup = async (name: string) => {
    if (!editingDeptGroup) return;
    try {
      await updateDepartmentGroupMutation.mutateAsync({ id: editingDeptGroup.id, name });
      toast.success("Departman grubu güncellendi", { description: name });
      setEditDeptGroupOpen(false);
      setEditingDeptGroup(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteDeptGroup = async (id: string, name: string) => {
    if (!confirm(`"${name}" departman grubunu silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteDepartmentGroupMutation.mutateAsync(id);
      toast.success("Departman grubu silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAssignDeptToGroup = async (deptId: string, groupId: string | null) => {
    try {
      await updateDepartmentMutation.mutateAsync({ id: deptId, updates: { groupId } });
      toast.success("Departman grubu güncellendi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`"${name}" departmanını silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteDepartmentMutation.mutateAsync(id);
      toast.success("Departman silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleEditGroup = async (name: string) => {
    if (!editingGroup) return;
    try {
      await updateCostGroupMutation.mutateAsync({ id: editingGroup.id, name });
      toast.success("Maliyet grubu güncellendi", { description: name });
      setEditGroupOpen(false);
      setEditingGroup(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`"${name}" maliyet grubunu silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteCostGroupMutation.mutateAsync(id);
      toast.success("Maliyet grubu silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteBudgetItem = async (id: string, name: string) => {
    if (!confirm(`"${name}" kalemini silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteBudgetItemMutation.mutateAsync(id);
      toast.success("Bütçe kalemi silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const years = [2024, 2025, 2026];

  // Filtering based on user role
  const visibleDepartments = currentUser?.role === 'admin' 
    ? departments 
    : departments.filter(d => currentUser?.assignedDepartmentIds.includes(d.id));

  // Group departments by their groupId
  const groupedDepartments = departmentGroups.map(group => ({
    group,
    departments: visibleDepartments.filter(d => d.groupId === group.id)
  })).filter(g => g.departments.length > 0);

  const ungroupedDepartments = visibleDepartments.filter(d => !d.groupId);

  const totalBudget = visibleDepartments.reduce((acc, dep) => {
      return acc + dep.costGroups.reduce((gAcc, group) => {
          return gAcc + group.items.reduce((iAcc, item) => {
              return iAcc + Object.values(item.values).reduce((mAcc, val) => mAcc + val, 0);
          }, 0);
      }, 0);
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Departman Bütçesi</h1>
          <p className="text-muted-foreground mt-1">Departman bazlı gider planlaması ve yönetimi.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={currentYear.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[120px] bg-background">
              <SelectValue placeholder="Yıl" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          {currentUser?.role === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ekle
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsNewDeptGroupOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Departman Grubu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsNewDeptOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Departman
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AddEntityDialog 
        isOpen={isNewDeptOpen} 
        onClose={() => setIsNewDeptOpen(false)} 
        onSave={handleAddDepartment}
        title="Yeni Departman Ekle"
        description="Bütçe sistemine yeni bir departman tanımlayın."
        placeholder="Örn: Pazarlama Departmanı"
      />

      <AddEntityDialog 
        isOpen={isNewGroupOpen} 
        onClose={() => setIsNewGroupOpen(false)} 
        onSave={handleAddGroup}
        title="Yeni Maliyet Grubu"
        description="Seçili departman altına yeni bir gider grubu ekleyin."
        placeholder="Örn: Seyahat Giderleri"
      />

      <AddBudgetItemDialog 
        isOpen={isNewItemOpen} 
        onClose={() => { setIsNewItemOpen(false); setActiveGroupForItem(null); }} 
        onSave={handleAddItem}
        title="Yeni Bütçe Kalemi"
        description="Seçili maliyet grubu altına yeni bir gider kalemi ekleyin."
      />

      <AddEntityDialog 
        isOpen={editDeptOpen} 
        onClose={() => { setEditDeptOpen(false); setEditingDept(null); }} 
        onSave={handleEditDepartment}
        title="Departman Düzenle"
        description="Departman adını güncelleyin."
        placeholder="Departman adı"
        defaultValue={editingDept?.name}
      />

      <AddEntityDialog 
        isOpen={editGroupOpen} 
        onClose={() => { setEditGroupOpen(false); setEditingGroup(null); }} 
        onSave={handleEditGroup}
        title="Maliyet Grubu Düzenle"
        description="Maliyet grubu adını güncelleyin."
        placeholder="Maliyet grubu adı"
        defaultValue={editingGroup?.name}
      />

      <AddEntityDialog 
        isOpen={isNewDeptGroupOpen} 
        onClose={() => setIsNewDeptGroupOpen(false)} 
        onSave={handleAddDeptGroup}
        title="Yeni Departman Grubu"
        description="Departmanları gruplamak için yeni bir kategori oluşturun."
        placeholder="Örn: Operasyonlar"
      />

      <AddEntityDialog 
        isOpen={editDeptGroupOpen} 
        onClose={() => { setEditDeptGroupOpen(false); setEditingDeptGroup(null); }} 
        onSave={handleEditDeptGroup}
        title="Departman Grubu Düzenle"
        description="Departman grubu adını güncelleyin."
        placeholder="Grup adı"
        defaultValue={editingDeptGroup?.name}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">Toplam Yıllık Bütçe</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary">€ {formatMoney(totalBudget)}</div>
                <p className="text-xs text-muted-foreground mt-1">{currentYear} yılı için onaylanmış ve taslak toplam</p>
            </CardContent>
        </Card>
        {/* Can add more summary cards here */}
      </div>

      {/* Main Content */}
      <Card className="shadow-md border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : visibleDepartments.length === 0 ? (
             <div className="p-12 text-center text-muted-foreground">
                <p>Görüntülenecek departman bulunamadı.</p>
             </div>
          ) : (
            <div className="divide-y divide-border/50">
              {/* Grouped Departments */}
              {groupedDepartments.map(({ group, departments: groupDepts }) => {
                const groupTotal = groupDepts.reduce((acc, dept) => 
                  acc + dept.costGroups.reduce((gAcc, g) => 
                    gAcc + g.items.reduce((iAcc, i) => 
                      iAcc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0), 0), 0);

                return (
                  <div key={group.id} className="p-4">
                    <div className="flex items-center justify-between mb-3 bg-primary/5 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <span className="font-bold text-lg text-primary">{group.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-xs font-medium text-primary">{groupDepts.length} Departman</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-primary">€ {formatMoney(groupTotal)}</span>
                        {currentUser?.role === 'admin' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingDeptGroup({ id: group.id, name: group.name }); setEditDeptGroupOpen(true); }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteDeptGroup(group.id, group.name)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    <Accordion type="multiple" className="w-full pl-4 border-l-2 border-primary/20">
                      {groupDepts.map((dept) => {
                        const deptTotal = dept.costGroups.reduce((acc, g) => acc + g.items.reduce((iAcc, i) => iAcc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0), 0);
                        return (
                          <AccordionItem key={dept.id} value={dept.id} className="border-b border-border/50 px-4">
                            <AccordionTrigger className="hover:no-underline py-3">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-3">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold text-foreground">{dept.name}</span>
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">{dept.costGroups.length} Grup</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-medium text-foreground">€ {formatMoney(deptTotal)}</span>
                                  {currentUser?.role === 'admin' && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveDeptForGroup(dept.id); setIsNewGroupOpen(true); }}>
                                          <PlusCircle className="mr-2 h-4 w-4" />
                                          Yeni Grup Ekle
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingDept({ id: dept.id, name: dept.name }); setEditDeptOpen(true); }}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Düzenle
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAssignDeptToGroup(dept.id, null); }}>
                                          <FolderOpen className="mr-2 h-4 w-4" />
                                          Gruptan Çıkar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(dept.id, dept.name); }} className="text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Sil
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-2">
                              <div className="space-y-4 pl-4 border-l-2 border-border/50 ml-2">
                                {dept.costGroups.map((costGroup) => {
                                  const costGroupTotal = costGroup.items.reduce((acc, i) => acc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0);
                                  const monthlyTotals = getMonthlyTotals(costGroup.items);
                                  return (
                                    <div key={costGroup.id} className="space-y-0">
                                      <div className="rounded-t-md border border-b-0 border-border overflow-hidden bg-card">
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="bg-primary/10">
                                                <th className="w-[200px] text-left p-2 font-semibold sticky left-0 bg-primary/10 z-10">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-foreground">{costGroup.name}</span>
                                                    {currentUser?.role === 'admin' && (
                                                      <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <MoreHorizontal className="h-3 w-3" />
                                                          </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start">
                                                          <DropdownMenuItem onClick={() => { setActiveGroupForItem(costGroup.id); setIsNewItemOpen(true); }}>
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Yeni Kalem Ekle
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => { setEditingGroup({ id: costGroup.id, name: costGroup.name }); setEditGroupOpen(true); }}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Düzenle
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleDeleteGroup(costGroup.id, costGroup.name)} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Sil
                                                          </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                      </DropdownMenu>
                                                    )}
                                                  </div>
                                                </th>
                                                {months.map((m, idx) => (
                                                  <th key={m} className="text-right min-w-[80px] p-2">
                                                    <div className="flex flex-col items-end">
                                                      <span className="text-[10px] text-muted-foreground font-medium">{m}</span>
                                                      <span className="font-mono font-semibold text-foreground">{formatMoney(monthlyTotals[idx])}</span>
                                                    </div>
                                                  </th>
                                                ))}
                                                <th className="text-right w-[100px] p-2 bg-primary/20">
                                                  <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-muted-foreground font-medium">Toplam</span>
                                                    <span className="font-mono font-bold text-foreground">€ {formatMoney(costGroupTotal)}</span>
                                                  </div>
                                                </th>
                                                <th className="w-[120px] p-2"></th>
                                                <th className="w-[100px] p-2 sticky right-0 bg-primary/10 z-10"></th>
                                              </tr>
                                            </thead>
                                          </table>
                                        </div>
                                      </div>
                                      <BudgetTable 
                                        items={costGroup.items}
                                        isAdmin={currentUser?.role === 'admin'}
                                        onSave={handleUpdateItem}
                                        onRevise={handleReviseItem}
                                        onApprove={handleApproveItem}
                                        onDelete={handleDeleteBudgetItem}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                );
              })}

              {/* Ungrouped Departments */}
              {ungroupedDepartments.length > 0 && (
                <div className="p-4">
                  {groupedDepartments.length > 0 && (
                    <div className="flex items-center gap-3 mb-3 p-3">
                      <span className="font-medium text-muted-foreground">Grupsuz Departmanlar</span>
                    </div>
                  )}
                  <Accordion type="multiple" className="w-full">
                    {ungroupedDepartments.map((dept) => {
                      const deptTotal = dept.costGroups.reduce((acc, g) => acc + g.items.reduce((iAcc, i) => iAcc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0), 0);
                      return (
                        <AccordionItem key={dept.id} value={dept.id} className="border-b border-border/50 px-4">
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-3">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{dept.name}</span>
                                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">{dept.costGroups.length} Grup</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-medium text-foreground">€ {formatMoney(deptTotal)}</span>
                                {currentUser?.role === 'admin' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveDeptForGroup(dept.id); setIsNewGroupOpen(true); }}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Yeni Grup Ekle
                                      </DropdownMenuItem>
                                      {departmentGroups.length > 0 && departmentGroups.map(g => (
                                        <DropdownMenuItem key={g.id} onClick={(e) => { e.stopPropagation(); handleAssignDeptToGroup(dept.id, g.id); }}>
                                          <FolderOpen className="mr-2 h-4 w-4" />
                                          {g.name}'a Taşı
                                        </DropdownMenuItem>
                                      ))}
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingDept({ id: dept.id, name: dept.name }); setEditDeptOpen(true); }}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Düzenle
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(dept.id, dept.name); }} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Sil
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 pt-2">
                            <div className="space-y-4 pl-4 border-l-2 border-border/50 ml-2">
                              {dept.costGroups.map((costGroup) => {
                                const costGroupTotal = costGroup.items.reduce((acc, i) => acc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0);
                                const monthlyTotals = getMonthlyTotals(costGroup.items);
                                return (
                                  <div key={costGroup.id} className="space-y-0">
                                    <div className="rounded-t-md border border-b-0 border-border overflow-hidden bg-card">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-primary/10">
                                              <th className="w-[200px] text-left p-2 font-semibold sticky left-0 bg-primary/10 z-10">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-foreground">{costGroup.name}</span>
                                                  {currentUser?.role === 'admin' && (
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                          <MoreHorizontal className="h-3 w-3" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="start">
                                                        <DropdownMenuItem onClick={() => { setActiveGroupForItem(costGroup.id); setIsNewItemOpen(true); }}>
                                                          <Plus className="mr-2 h-4 w-4" />
                                                          Yeni Kalem Ekle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setEditingGroup({ id: costGroup.id, name: costGroup.name }); setEditGroupOpen(true); }}>
                                                          <Pencil className="mr-2 h-4 w-4" />
                                                          Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteGroup(costGroup.id, costGroup.name)} className="text-destructive">
                                                          <Trash2 className="mr-2 h-4 w-4" />
                                                          Sil
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  )}
                                                </div>
                                              </th>
                                              {months.map((m, idx) => (
                                                <th key={m} className="text-right min-w-[80px] p-2">
                                                  <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-muted-foreground font-medium">{m}</span>
                                                    <span className="font-mono font-semibold text-foreground">{formatMoney(monthlyTotals[idx])}</span>
                                                  </div>
                                                </th>
                                              ))}
                                              <th className="text-right w-[100px] p-2 bg-primary/20">
                                                <div className="flex flex-col items-end">
                                                  <span className="text-[10px] text-muted-foreground font-medium">Toplam</span>
                                                  <span className="font-mono font-bold text-foreground">€ {formatMoney(costGroupTotal)}</span>
                                                </div>
                                              </th>
                                              <th className="w-[120px] p-2"></th>
                                              <th className="w-[100px] p-2 sticky right-0 bg-primary/10 z-10"></th>
                                            </tr>
                                          </thead>
                                        </table>
                                      </div>
                                    </div>
                                    <BudgetTable 
                                      items={costGroup.items}
                                      isAdmin={currentUser?.role === 'admin'}
                                      onSave={handleUpdateItem}
                                      onRevise={handleReviseItem}
                                      onApprove={handleApproveItem}
                                      onDelete={handleDeleteBudgetItem}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
