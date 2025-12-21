import { useStore, getAvailableYears } from "@/lib/store";
import { useDepartments, useCreateDepartment, useCreateCostGroup, useCreateBudgetItem, useUpdateBudgetItem, useReviseBudgetItem, useApproveBudgetItem, useRevertBudgetItem, useUpdateDepartment, useDeleteDepartment, useUpdateCostGroup, useDeleteCostGroup, useDeleteBudgetItem, useDepartmentGroups, useCreateDepartmentGroup, useUpdateDepartmentGroup, useDeleteDepartmentGroup } from "@/lib/queries";
import type { DepartmentGroup } from "@/lib/store";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Download, Filter, Loader2, Plus, MoreHorizontal, Pencil, Trash2, FolderOpen, Building2, Upload, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { useState, useRef } from "react";
import { AddEntityDialog, AddBudgetItemDialog } from "@/components/budget/AddEntityDialogs";
import { toast } from "sonner";
import type { BudgetMonthValues } from "@/lib/store";

export default function DepartmentBudget() {
  const { currentYear, setYear, currentUser, selectedCompanyId } = useStore();
  const { data: departments = [], isLoading } = useDepartments(currentYear, selectedCompanyId);
  const { data: departmentGroups = [] } = useDepartmentGroups();
  const createDepartmentMutation = useCreateDepartment();
  const createCostGroupMutation = useCreateCostGroup();
  const createBudgetItemMutation = useCreateBudgetItem();
  const updateBudgetItemMutation = useUpdateBudgetItem();
  const reviseBudgetItemMutation = useReviseBudgetItem();
  const approveBudgetItemMutation = useApproveBudgetItem();
  const revertBudgetItemMutation = useRevertBudgetItem();
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

  // Import/Export states
  type ImportRow = {
    rowNumber: number;
    itemId: string;
    departmentName: string;
    groupName: string;
    itemName: string;
    monthlyValues: number[];
    status: 'pending' | 'update' | 'create' | 'error';
    matchedCostGroupId?: string;
    errorMessage?: string;
  };
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const getDeptMonthlyTotals = (dept: any) => {
    const totals: Record<number, number> = {};
    for (let i = 0; i < 12; i++) {
      totals[i] = (dept.costGroups || []).reduce((sum: number, group: any) => 
        sum + (group.items || []).reduce((iSum: number, item: any) => iSum + (item.values[i] || 0), 0), 0);
    }
    return totals;
  };
  
  const handleAddDepartment = async (name: string) => {
    try {
      await createDepartmentMutation.mutateAsync({ name, companyId: selectedCompanyId });
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
      await updateBudgetItemMutation.mutateAsync({ id: itemId, updates: { monthlyValues: values } });
      toast.success("Güncellendi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleReviseItem = async (itemId: string, revisionReason?: string) => {
    try {
      await reviseBudgetItemMutation.mutateAsync({ id: itemId, editorName: currentUser?.name || 'Unknown', revisionReason });
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

  const handleSubmitForApproval = async (itemId: string) => {
    try {
      await updateBudgetItemMutation.mutateAsync({ id: itemId, updates: { status: 'pending' } });
      toast.success("Onaya gönderildi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleWithdraw = async (itemId: string) => {
    try {
      await updateBudgetItemMutation.mutateAsync({ id: itemId, updates: { status: 'draft' } });
      toast.success("Geri çekildi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleRevertItem = async (itemId: string) => {
    try {
      await revertBudgetItemMutation.mutateAsync(itemId);
      toast.success("Önceki onaylı değerlere geri alındı");
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
      await updateDepartmentGroupMutation.mutateAsync({ id: editingDeptGroup.id, updates: { name } });
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
      await updateCostGroupMutation.mutateAsync({ id: editingGroup.id, updates: { name } });
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

  // Reorder Department Groups
  const handleReorderDeptGroup = async (groupId: string, direction: 'up' | 'down') => {
    const sortedGroups = [...departmentGroups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const currentIndex = sortedGroups.findIndex(g => g.id === groupId);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sortedGroups.length) return;
    
    const currentGroup = sortedGroups[currentIndex];
    const swapGroup = sortedGroups[swapIndex];
    
    // Use array indices for new sortOrder values to ensure proper ordering
    const newCurrentSortOrder = swapIndex;
    const newSwapSortOrder = currentIndex;
    
    try {
      await Promise.all([
        updateDepartmentGroupMutation.mutateAsync({ id: currentGroup.id, updates: { sortOrder: newCurrentSortOrder } }),
        updateDepartmentGroupMutation.mutateAsync({ id: swapGroup.id, updates: { sortOrder: newSwapSortOrder } }),
      ]);
    } catch (error: any) {
      toast.error("Sıralama güncellenemedi", { description: error.message });
    }
  };

  // Reorder Departments within a group
  const handleReorderDepartment = async (deptId: string, direction: 'up' | 'down', groupId: string | null) => {
    const deptsInGroup = departments.filter(d => d.groupId === groupId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const currentIndex = deptsInGroup.findIndex(d => d.id === deptId);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= deptsInGroup.length) return;
    
    const currentDept = deptsInGroup[currentIndex];
    const swapDept = deptsInGroup[swapIndex];
    
    // Use array indices for new sortOrder values to ensure proper ordering
    const newCurrentSortOrder = swapIndex;
    const newSwapSortOrder = currentIndex;
    
    try {
      await Promise.all([
        updateDepartmentMutation.mutateAsync({ id: currentDept.id, updates: { sortOrder: newCurrentSortOrder } }),
        updateDepartmentMutation.mutateAsync({ id: swapDept.id, updates: { sortOrder: newSwapSortOrder } }),
      ]);
    } catch (error: any) {
      toast.error("Sıralama güncellenemedi", { description: error.message });
    }
  };

  // Reorder Cost Groups within a department
  const handleReorderCostGroup = async (costGroupId: string, direction: 'up' | 'down', deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    
    const costGroups = [...dept.costGroups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const currentIndex = costGroups.findIndex(g => g.id === costGroupId);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= costGroups.length) return;
    
    const currentCostGroup = costGroups[currentIndex];
    const swapCostGroup = costGroups[swapIndex];
    
    // Use array indices for new sortOrder values to ensure proper ordering
    const newCurrentSortOrder = swapIndex;
    const newSwapSortOrder = currentIndex;
    
    try {
      await Promise.all([
        updateCostGroupMutation.mutateAsync({ id: currentCostGroup.id, updates: { sortOrder: newCurrentSortOrder } }),
        updateCostGroupMutation.mutateAsync({ id: swapCostGroup.id, updates: { sortOrder: newSwapSortOrder } }),
      ]);
    } catch (error: any) {
      toast.error("Sıralama güncellenemedi", { description: error.message });
    }
  };

  // Reorder Budget Items within a cost group
  const handleReorderBudgetItem = async (itemId: string, direction: 'up' | 'down', costGroupId: string) => {
    let items: any[] = [];
    for (const dept of departments) {
      const costGroup = dept.costGroups.find((g: any) => g.id === costGroupId);
      if (costGroup) {
        items = [...costGroup.items].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        break;
      }
    }
    
    const currentIndex = items.findIndex((i: any) => i.id === itemId);
    if (currentIndex === -1) return;
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    
    const currentItem = items[currentIndex];
    const swapItem = items[swapIndex];
    
    // Use array indices for new sortOrder values to ensure proper ordering
    const newCurrentSortOrder = swapIndex;
    const newSwapSortOrder = currentIndex;
    
    try {
      await Promise.all([
        updateBudgetItemMutation.mutateAsync({ id: currentItem.id, updates: { sortOrder: newCurrentSortOrder } }),
        updateBudgetItemMutation.mutateAsync({ id: swapItem.id, updates: { sortOrder: newSwapSortOrder } }),
      ]);
    } catch (error: any) {
      toast.error("Sıralama güncellenemedi", { description: error.message });
    }
  };

  const handleExportBudgetItems = () => {
    const lines: string[] = [];
    lines.push("ItemId,Departman,Grup,Kalem,Durum,Ocak,Şubat,Mart,Nisan,Mayıs,Haziran,Temmuz,Ağustos,Eylül,Ekim,Kasım,Aralık");
    
    const statusLabels: Record<string, string> = {
      'draft': 'Taslak',
      'pending': 'Beklemede',
      'approved': 'Onaylı',
      'rejected': 'Reddedildi'
    };
    
    visibleDepartments.forEach(dept => {
      dept.costGroups.forEach((costGroup: any) => {
        costGroup.items.forEach((item: any) => {
          const monthValues = months.map((_, idx) => item.values[idx] || 0);
          const escapedName = item.name.includes(',') ? `"${item.name}"` : item.name;
          const escapedDept = dept.name.includes(',') ? `"${dept.name}"` : dept.name;
          const escapedGroup = costGroup.name.includes(',') ? `"${costGroup.name}"` : costGroup.name;
          const statusLabel = statusLabels[item.status] || item.status || 'Taslak';
          lines.push(`${item.id},${escapedDept},${escapedGroup},${escapedName},${statusLabel},${monthValues.join(',')}`);
        });
      });
    });
    
    const csvContent = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `departman_butce_${currentYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV dosyası indirildi");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV dosyası en az bir veri satırı içermeli");
        return;
      }
      
      const headers = lines[0].split(",").map(h => h.trim());
      const dataRows: ImportRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 17) continue;
        
        const itemId = values[0] || "";
        const deptName = values[1] || "";
        const groupName = values[2] || "";
        const itemName = values[3] || "";
        // Skip values[4] (Durum) - ignored on import
        const monthlyValues = values.slice(5, 17).map(v => parseFloat(v) || 0);
        
        let status: ImportRow['status'] = 'pending';
        let matchedCostGroupId: string | undefined;
        let errorMessage: string | undefined;
        
        if (itemId) {
          let found = false;
          for (const dept of departments) {
            for (const cg of dept.costGroups) {
              const existingItem = cg.items.find((it: any) => it.id === itemId);
              if (existingItem) {
                found = true;
                matchedCostGroupId = cg.id;
                status = 'update';
                break;
              }
            }
            if (found) break;
          }
          if (!found) {
            status = 'error';
            errorMessage = 'ItemId bulunamadı';
          }
        } else {
          if (!deptName || !groupName || !itemName) {
            status = 'error';
            errorMessage = 'Yeni kalem için Departman, Grup ve Kalem adı gerekli';
          } else {
            const dept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
            if (!dept) {
              status = 'error';
              errorMessage = `Departman bulunamadı: ${deptName}`;
            } else {
              const cg = dept.costGroups.find((g: any) => g.name.toLowerCase() === groupName.toLowerCase());
              if (!cg) {
                status = 'error';
                errorMessage = `Grup bulunamadı: ${groupName}`;
              } else {
                matchedCostGroupId = cg.id;
                status = 'create';
              }
            }
          }
        }
        
        dataRows.push({
          rowNumber: i,
          itemId,
          departmentName: deptName,
          groupName,
          itemName,
          monthlyValues,
          status,
          matchedCostGroupId,
          errorMessage
        });
      }
      
      setImportData(dataRows);
      setIsImportDialogOpen(true);
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImportBudgetItems = async () => {
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const row of importData) {
        if (row.status === 'error') {
          errorCount++;
          continue;
        }
        
        try {
          if (row.status === 'update' && row.itemId) {
            const monthlyValuesObj: BudgetMonthValues = {};
            row.monthlyValues.forEach((val, idx) => {
              monthlyValuesObj[idx] = val;
            });
            await updateBudgetItemMutation.mutateAsync({ 
              id: row.itemId, 
              updates: { monthlyValues: monthlyValuesObj } 
            });
            successCount++;
          } else if (row.status === 'create' && row.matchedCostGroupId) {
            const monthlyValuesObj: BudgetMonthValues = {};
            row.monthlyValues.forEach((val, idx) => {
              monthlyValuesObj[idx] = val;
            });
            await createBudgetItemMutation.mutateAsync({
              name: row.itemName,
              type: 'cost',
              costGroupId: row.matchedCostGroupId,
              monthlyValues: monthlyValuesObj,
              year: currentYear
            });
            successCount++;
          }
        } catch (err: any) {
          errorCount++;
          console.error(`Row ${row.rowNumber} error:`, err);
        }
      }
      
      toast.success(`İçe aktarma tamamlandı`, { 
        description: `${successCount} başarılı, ${errorCount} hatalı` 
      });
      setIsImportDialogOpen(false);
      setImportData([]);
    } catch (error: any) {
      toast.error("İçe aktarma hatası", { description: error.message });
    } finally {
      setImporting(false);
    }
  };

  const years = getAvailableYears();

  // Filtering based on user role
  const visibleDepartments = currentUser?.role === 'admin' 
    ? departments 
    : departments.filter(d => currentUser?.assignedDepartmentIds.includes(d.id));

  // Group departments by their groupId - sorted by sortOrder
  const sortedDepartmentGroups = [...departmentGroups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const groupedDepartments = sortedDepartmentGroups.map(group => ({
    group,
    departments: visibleDepartments
      .filter(d => d.groupId === group.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(dept => ({
        ...dept,
        costGroups: [...dept.costGroups]
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(cg => ({
            ...cg,
            items: [...cg.items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          }))
      }))
  })).filter(g => g.departments.length > 0);

  const ungroupedDepartments = visibleDepartments
    .filter(d => !d.groupId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(dept => ({
      ...dept,
      costGroups: [...dept.costGroups]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(cg => ({
          ...cg,
          items: [...cg.items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        }))
    }));

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
          <Button variant="outline" size="icon" onClick={handleExportBudgetItems} data-testid="button-export-csv">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} data-testid="button-import-csv">
            <Upload className="h-4 w-4" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            className="hidden"
          />
          {currentUser?.role === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  disabled={!selectedCompanyId}
                  title={!selectedCompanyId ? "Lütfen önce bir şirket seçin" : undefined}
                >
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

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bütçe Kalemlerini İçe Aktar</DialogTitle>
            <DialogDescription>
              CSV dosyasından bütçe kalemleri içe aktarılacak. Önizlemeyi kontrol edin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Satır</TableHead>
                  <TableHead className="w-[80px]">Durum</TableHead>
                  <TableHead>Departman</TableHead>
                  <TableHead>Grup</TableHead>
                  <TableHead>Kalem</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, idx) => (
                  <TableRow 
                    key={idx} 
                    className={
                      row.status === 'error' ? 'bg-destructive/10' : 
                      row.status === 'update' ? 'bg-blue-500/10' : 
                      row.status === 'create' ? 'bg-green-500/10' : ''
                    }
                  >
                    <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                    <TableCell>
                      {row.status === 'error' && (
                        <span className="text-destructive text-xs font-medium" title={row.errorMessage}>Hata</span>
                      )}
                      {row.status === 'update' && (
                        <span className="text-blue-600 text-xs font-medium">Güncelle</span>
                      )}
                      {row.status === 'create' && (
                        <span className="text-green-600 text-xs font-medium">Yeni</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{row.departmentName}</TableCell>
                    <TableCell className="text-xs">{row.groupName}</TableCell>
                    <TableCell className="text-xs">{row.itemName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatMoney(row.monthlyValues.reduce((a, b) => a + b, 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 bg-green-500/30 rounded mr-1"></span> Yeni: {importData.filter(r => r.status === 'create').length}
              <span className="inline-block w-3 h-3 bg-blue-500/30 rounded mx-1 ml-4"></span> Güncelle: {importData.filter(r => r.status === 'update').length}
              <span className="inline-block w-3 h-3 bg-destructive/30 rounded mx-1 ml-4"></span> Hata: {importData.filter(r => r.status === 'error').length}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setImportData([]); }}>
                İptal
              </Button>
              <Button 
                onClick={handleImportBudgetItems} 
                disabled={importing || importData.filter(r => r.status !== 'error').length === 0}
                data-testid="button-confirm-import"
              >
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                İçe Aktar ({importData.filter(r => r.status !== 'error').length})
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
                              <DropdownMenuItem onClick={() => handleReorderDeptGroup(group.id, 'up')}>
                                <ArrowUp className="mr-2 h-4 w-4" />
                                Yukarı Taşı
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReorderDeptGroup(group.id, 'down')}>
                                <ArrowDown className="mr-2 h-4 w-4" />
                                Aşağı Taşı
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
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
                      {groupDepts.map((dept, deptIndex) => {
                        const deptTotal = dept.costGroups.reduce((acc, g) => acc + g.items.reduce((iAcc, i) => iAcc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0), 0);
                        const deptMonthlyTotals = getDeptMonthlyTotals(dept);
                        return (
                          <AccordionItem key={dept.id} value={dept.id} className="border-b border-border/50 group">
                            <AccordionTrigger className="hover:no-underline py-0 [&>svg]:hidden">
                              <div className="w-full overflow-x-auto">
                                <div className="pl-4 ml-2">
                                  <div className="rounded-t-md border border-b-0 border-border overflow-hidden bg-muted/30">
                                    <table className="w-full text-xs">
                                      <tbody>
                                        <tr>
                                          <td className="text-left p-2 font-semibold sticky left-0 bg-muted/30 z-10" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                                            <div className="flex items-center gap-2">
                                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                              <span className="text-foreground break-words">{dept.name}</span>
                                            </div>
                                          </td>
                                          {months.map((m, idx) => (
                                            <td key={m} className="text-right min-w-[80px] p-2">
                                              <span className="font-mono font-semibold text-foreground">{formatMoney(deptMonthlyTotals[idx])}</span>
                                            </td>
                                          ))}
                                          <td className="text-right w-[150px] p-2 bg-primary/10">
                                            <div className="flex items-center justify-end gap-2 pr-6">
                                          <span className="font-mono font-bold text-foreground">€ {formatMoney(deptTotal)}</span>
                                          {currentUser?.role === 'admin' && (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                  <MoreHorizontal className="h-3 w-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReorderDepartment(dept.id, 'up', dept.groupId); }}>
                                                  <ArrowUp className="mr-2 h-4 w-4" />
                                                  Yukarı Taşı
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReorderDepartment(dept.id, 'down', dept.groupId); }}>
                                                  <ArrowDown className="mr-2 h-4 w-4" />
                                                  Aşağı Taşı
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
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
                                      </td>
                                    </tr>
                                  </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-2">
                              <div className="space-y-4 pl-4 border-l-2 border-border/50 ml-2">
                                {dept.costGroups.map((costGroup, costGroupIndex) => {
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
                                                  <span className="text-foreground">{costGroup.name}</span>
                                                </th>
                                                {months.map((m, idx) => (
                                                  <th key={m} className="text-right min-w-[80px] p-2">
                                                    <div className="flex flex-col items-end">
                                                      <span className="text-[10px] text-muted-foreground font-medium">{m}</span>
                                                      <span className="font-mono font-semibold text-foreground">{formatMoney(monthlyTotals[idx])}</span>
                                                    </div>
                                                  </th>
                                                ))}
                                                <th className="text-right w-[150px] p-2 bg-primary/20">
                                                  <div className="flex items-center justify-end gap-2">
                                                    <div className="flex flex-col items-end">
                                                      <span className="text-[10px] text-muted-foreground font-medium">Toplam</span>
                                                      <span className="font-mono font-bold text-foreground">€ {formatMoney(costGroupTotal)}</span>
                                                    </div>
                                                    {currentUser?.role === 'admin' && (
                                                      <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <MoreHorizontal className="h-3 w-3" />
                                                          </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                          <DropdownMenuItem onClick={() => handleReorderCostGroup(costGroup.id, 'up', dept.id)}>
                                                            <ArrowUp className="mr-2 h-4 w-4" />
                                                            Yukarı Taşı
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => handleReorderCostGroup(costGroup.id, 'down', dept.id)}>
                                                            <ArrowDown className="mr-2 h-4 w-4" />
                                                            Aşağı Taşı
                                                          </DropdownMenuItem>
                                                          <DropdownMenuSeparator />
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
                                              </tr>
                                            </thead>
                                          </table>
                                        </div>
                                      </div>
                                      <BudgetTable 
                                        items={costGroup.items}
                                        isAdmin={currentUser?.role === 'admin'}
                                        selectedYear={currentYear}
                                        onSave={handleUpdateItem}
                                        onRevise={handleReviseItem}
                                        onApprove={handleApproveItem}
                                        onDelete={handleDeleteBudgetItem}
                                        onSubmitForApproval={handleSubmitForApproval}
                                        onWithdraw={handleWithdraw}
                                        onRevert={handleRevertItem}
                                        onReorder={(itemId, direction) => handleReorderBudgetItem(itemId, direction, costGroup.id)}
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
                      const deptMonthlyTotals = getDeptMonthlyTotals(dept);
                      return (
                        <AccordionItem key={dept.id} value={dept.id} className="border-b border-border/50 group">
                          <AccordionTrigger className="hover:no-underline py-0 [&>svg]:hidden">
                            <div className="w-full overflow-x-auto">
                              <div className="pl-4 ml-2">
                                <div className="rounded-t-md border border-b-0 border-border overflow-hidden bg-muted/30">
                                  <table className="w-full text-xs">
                                    <tbody>
                                      <tr>
                                        <td className="text-left p-2 font-semibold sticky left-0 bg-muted/30 z-10" style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                                          <div className="flex items-center gap-2">
                                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-foreground break-words">{dept.name}</span>
                                          </div>
                                        </td>
                                        {months.map((m, idx) => (
                                          <td key={m} className="text-right min-w-[80px] p-2">
                                            <span className="font-mono font-semibold text-foreground">{formatMoney(deptMonthlyTotals[idx])}</span>
                                          </td>
                                        ))}
                                        <td className="text-right w-[150px] p-2 bg-primary/10">
                                          <div className="flex items-center justify-end gap-2 pr-6">
                                        <span className="font-mono font-bold text-foreground">€ {formatMoney(deptTotal)}</span>
                                        {currentUser?.role === 'admin' && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <MoreHorizontal className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReorderDepartment(dept.id, 'up', null); }}>
                                                <ArrowUp className="mr-2 h-4 w-4" />
                                                Yukarı Taşı
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReorderDepartment(dept.id, 'down', null); }}>
                                                <ArrowDown className="mr-2 h-4 w-4" />
                                                Aşağı Taşı
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
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
                                    </td>
                                  </tr>
                                </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4 pt-2">
                            <div className="space-y-4 pl-4 border-l-2 border-border/50 ml-2">
                              {dept.costGroups.map((costGroup, costGroupIndex) => {
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
                                                <span className="text-foreground">{costGroup.name}</span>
                                              </th>
                                              {months.map((m, idx) => (
                                                <th key={m} className="text-right min-w-[80px] p-2">
                                                  <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-muted-foreground font-medium">{m}</span>
                                                    <span className="font-mono font-semibold text-foreground">{formatMoney(monthlyTotals[idx])}</span>
                                                  </div>
                                                </th>
                                              ))}
                                              <th className="text-right w-[150px] p-2 bg-primary/20">
                                                <div className="flex items-center justify-end gap-2">
                                                  <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-muted-foreground font-medium">Toplam</span>
                                                    <span className="font-mono font-bold text-foreground">€ {formatMoney(costGroupTotal)}</span>
                                                  </div>
                                                  {currentUser?.role === 'admin' && (
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                          <MoreHorizontal className="h-3 w-3" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleReorderCostGroup(costGroup.id, 'up', dept.id)}>
                                                          <ArrowUp className="mr-2 h-4 w-4" />
                                                          Yukarı Taşı
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleReorderCostGroup(costGroup.id, 'down', dept.id)}>
                                                          <ArrowDown className="mr-2 h-4 w-4" />
                                                          Aşağı Taşı
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
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
                                            </tr>
                                          </thead>
                                        </table>
                                      </div>
                                    </div>
                                    <BudgetTable 
                                      items={costGroup.items}
                                      isAdmin={currentUser?.role === 'admin'}
                                      selectedYear={currentYear}
                                      onSave={handleUpdateItem}
                                      onRevise={handleReviseItem}
                                      onApprove={handleApproveItem}
                                      onDelete={handleDeleteBudgetItem}
                                      onSubmitForApproval={handleSubmitForApproval}
                                      onWithdraw={handleWithdraw}
                                      onRevert={handleRevertItem}
                                      onReorder={(itemId, direction) => handleReorderBudgetItem(itemId, direction, costGroup.id)}
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
