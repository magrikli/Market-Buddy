import { useStore, getAvailableYears } from "@/lib/store";
import { 
  useProjects, useCreateProject, useUpdateProject, useDeleteProject,
  useCreateProjectPhase, useUpdateProjectPhase, useDeleteProjectPhase,
  useCreateBudgetItem, useUpdateBudgetItem, useReviseBudgetItem, 
  useApproveBudgetItem, useRevertBudgetItem, useDeleteBudgetItem 
} from "@/lib/queries";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Download, Filter, Loader2, Plus, MoreHorizontal, Pencil, Trash2, FolderGit2, Layers, Clock, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddEntityDialog, AddBudgetItemDialog } from "@/components/budget/AddEntityDialogs";
import { toast } from "sonner";
import type { BudgetMonthValues } from "@/lib/store";
import ProjectProcessesTab from "@/components/ProjectProcessesTab";

export default function ProjectBudget() {
  const { currentYear, setYear, currentUser, selectedCompanyId } = useStore();
  const { data: projects = [], isLoading } = useProjects(currentYear, selectedCompanyId);
  
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const createPhaseMutation = useCreateProjectPhase();
  const updatePhaseMutation = useUpdateProjectPhase();
  const deletePhaseMutation = useDeleteProjectPhase();
  const createBudgetItemMutation = useCreateBudgetItem();
  const updateBudgetItemMutation = useUpdateBudgetItem();
  const reviseBudgetItemMutation = useReviseBudgetItem();
  const approveBudgetItemMutation = useApproveBudgetItem();
  const revertBudgetItemMutation = useRevertBudgetItem();
  const deleteBudgetItemMutation = useDeleteBudgetItem();
  
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewPhaseOpen, setIsNewPhaseOpen] = useState(false);
  const [isNewCostItemOpen, setIsNewCostItemOpen] = useState(false);
  const [isNewRevenueItemOpen, setIsNewRevenueItemOpen] = useState(false);
  const [activeProjectForPhase, setActiveProjectForPhase] = useState<string | null>(null);
  const [activePhaseForItem, setActivePhaseForItem] = useState<string | null>(null);
  
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editPhaseOpen, setEditPhaseOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{id: string; name: string} | null>(null);
  const [editingPhase, setEditingPhase] = useState<{id: string; name: string} | null>(null);
  const [activeTabByProject, setActiveTabByProject] = useState<Record<string, string>>({});
  const [expandedProjects, setExpandedProjects] = useState<string[] | null>(null);

  type ImportRow = {
    rowNumber: number;
    itemId: string;
    projectName: string;
    phaseName: string;
    itemName: string;
    itemType: 'cost' | 'revenue';
    monthlyValues: number[];
    status: 'pending' | 'update' | 'create' | 'error';
    matchedPhaseId?: string;
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

  const handleAddProject = async (name: string) => {
    if (!selectedCompanyId) {
      toast.error("Lütfen önce bir şirket seçin");
      return;
    }
    try {
      const newProject = await createProjectMutation.mutateAsync({ name, companyId: selectedCompanyId });
      setExpandedProjects(prev => prev === null ? [newProject.id] : [...prev, newProject.id]);
      toast.success("Proje eklendi", { description: name });
      setIsNewProjectOpen(false);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleEditProject = async (name: string) => {
    if (!editingProject) return;
    try {
      await updateProjectMutation.mutateAsync({ id: editingProject.id, name });
      toast.success("Proje güncellendi", { description: name });
      setEditProjectOpen(false);
      setEditingProject(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`"${name}" projesini silmek istediğinize emin misiniz? Bu işlem tüm fazları ve bütçe kalemlerini de silecektir.`)) return;
    try {
      await deleteProjectMutation.mutateAsync(id);
      toast.success("Proje silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAddPhase = async (name: string) => {
    if (!activeProjectForPhase) return;
    try {
      await createPhaseMutation.mutateAsync({ name, projectId: activeProjectForPhase });
      toast.success("Faz eklendi", { description: name });
      setIsNewPhaseOpen(false);
      setActiveProjectForPhase(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleEditPhase = async (name: string) => {
    if (!editingPhase) return;
    try {
      await updatePhaseMutation.mutateAsync({ id: editingPhase.id, name });
      toast.success("Faz güncellendi", { description: name });
      setEditPhaseOpen(false);
      setEditingPhase(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleDeletePhase = async (id: string, name: string) => {
    if (!confirm(`"${name}" fazını silmek istediğinize emin misiniz? Bu işlem tüm bütçe kalemlerini de silecektir.`)) return;
    try {
      await deletePhaseMutation.mutateAsync(id);
      toast.success("Faz silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAddCostItem = async (name: string, type: 'cost' | 'revenue') => {
    if (!activePhaseForItem) return;
    try {
      await createBudgetItemMutation.mutateAsync({ 
        name, 
        type: 'cost', 
        projectPhaseId: activePhaseForItem,
        year: currentYear 
      });
      toast.success("Gider kalemi eklendi", { description: name });
      setIsNewCostItemOpen(false);
      setActivePhaseForItem(null);
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleAddRevenueItem = async (name: string, type: 'cost' | 'revenue') => {
    if (!activePhaseForItem) return;
    try {
      await createBudgetItemMutation.mutateAsync({ 
        name, 
        type: 'revenue', 
        projectPhaseId: activePhaseForItem,
        year: currentYear 
      });
      toast.success("Gelir kalemi eklendi", { description: name });
      setIsNewRevenueItemOpen(false);
      setActivePhaseForItem(null);
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
      await updateBudgetItemMutation.mutateAsync({ id: itemId, data: { status: 'pending' } });
      toast.success("Onaya gönderildi");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleWithdraw = async (itemId: string) => {
    try {
      await updateBudgetItemMutation.mutateAsync({ id: itemId, data: { status: 'draft' } });
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

  const handleDeleteBudgetItem = async (id: string, name: string) => {
    if (!confirm(`"${name}" kalemini silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteBudgetItemMutation.mutateAsync(id);
      toast.success("Bütçe kalemi silindi", { description: name });
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    }
  };

  const handleExportBudgetItems = () => {
    const lines: string[] = [];
    lines.push("ItemId,Proje,Faz,Kalem,Tür,Durum,Ocak,Şubat,Mart,Nisan,Mayıs,Haziran,Temmuz,Ağustos,Eylül,Ekim,Kasım,Aralık");
    
    const statusLabels: Record<string, string> = {
      'draft': 'Taslak',
      'pending': 'Beklemede',
      'approved': 'Onaylı',
      'rejected': 'Reddedildi'
    };
    
    visibleProjects.forEach(project => {
      (project.phases || []).forEach((phase: any) => {
        const allItems = [
          ...(phase.costItems || []).map((item: any) => ({ ...item, type: 'cost' })),
          ...(phase.revenueItems || []).map((item: any) => ({ ...item, type: 'revenue' }))
        ];
        allItems.forEach((item: any) => {
          const monthValues = months.map((_, idx) => item.values[idx] || 0);
          const escapedName = item.name.includes(',') ? `"${item.name}"` : item.name;
          const escapedProject = project.name.includes(',') ? `"${project.name}"` : project.name;
          const escapedPhase = phase.name.includes(',') ? `"${phase.name}"` : phase.name;
          const statusLabel = statusLabels[item.status] || item.status || 'Taslak';
          lines.push(`${item.id},${escapedProject},${escapedPhase},${escapedName},${item.type},${statusLabel},${monthValues.join(',')}`);
        });
      });
    });
    
    const csvContent = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proje_butce_${currentYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV dışa aktarıldı");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error("CSV dosyası en az bir veri satırı içermeli");
          return;
        }
        
        const headers = lines[0].split(",").map(h => h.trim());
        const expectedHeaders = ["ItemId", "Proje", "Faz", "Kalem", "Tür"];
        const hasValidHeaders = expectedHeaders.every(h => headers.includes(h));
        
        if (!hasValidHeaders) {
          toast.error("Geçersiz CSV formatı", { description: "Başlıklar: ItemId,Proje,Faz,Kalem,Tür,Ocak,...,Aralık" });
          return;
        }
        
        const dataRows: ImportRow[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
          if (values.length < 18) continue;
          
          const itemId = values[0] || "";
          const projectName = values[1] || "";
          const phaseName = values[2] || "";
          const itemName = values[3] || "";
          const itemType = values[4] === 'revenue' ? 'revenue' : 'cost';
          // Skip values[5] (Durum) - ignored on import
          const monthlyValues = values.slice(6, 18).map(v => parseFloat(v) || 0);
          
          let status: ImportRow['status'] = 'pending';
          let matchedPhaseId: string | undefined;
          let errorMessage: string | undefined;
          
          if (itemId) {
            let found = false;
            for (const proj of projects) {
              for (const phase of (proj.phases || [])) {
                const allItems = [...(phase.costItems || []), ...(phase.revenueItems || [])];
                if (allItems.some((item: any) => item.id === itemId)) {
                  found = true;
                  matchedPhaseId = phase.id;
                  break;
                }
              }
              if (found) break;
            }
            status = found ? 'update' : 'error';
            if (!found) errorMessage = 'ItemId bulunamadı';
          } else {
            if (!projectName || !phaseName || !itemName) {
              status = 'error';
              errorMessage = 'Yeni kayıt için Proje, Faz ve Kalem adı gerekli';
            } else {
              const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
              if (!project) {
                status = 'error';
                errorMessage = `Proje bulunamadı: ${projectName}`;
              } else {
                const phase = (project.phases || []).find((ph: any) => ph.name.toLowerCase() === phaseName.toLowerCase());
                if (!phase) {
                  status = 'error';
                  errorMessage = `Faz bulunamadı: ${phaseName}`;
                } else {
                  status = 'create';
                  matchedPhaseId = phase.id;
                }
              }
            }
          }
          
          dataRows.push({
            rowNumber: i,
            itemId,
            projectName,
            phaseName,
            itemName,
            itemType,
            monthlyValues,
            status,
            matchedPhaseId,
            errorMessage
          });
        }
        
        setImportData(dataRows);
        setIsImportDialogOpen(true);
      } catch (err) {
        toast.error("CSV dosyası okunamadı");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleImportBudgetItems = async () => {
    if (importData.length === 0) return;
    
    const validRows = importData.filter(r => r.status !== 'error');
    if (validRows.length === 0) {
      toast.error("İçe aktarılacak geçerli satır yok");
      return;
    }
    
    setImporting(true);
    let updateCount = 0;
    let createCount = 0;
    let errorCount = 0;
    
    for (const row of validRows) {
      try {
        const monthlyValuesObj: BudgetMonthValues = {};
        row.monthlyValues.forEach((val, idx) => {
          monthlyValuesObj[idx] = val;
        });
        
        if (row.status === 'update' && row.itemId) {
          await updateBudgetItemMutation.mutateAsync({ 
            id: row.itemId, 
            data: { monthlyValues: monthlyValuesObj } 
          });
          updateCount++;
        } else if (row.status === 'create' && row.matchedPhaseId) {
          await createBudgetItemMutation.mutateAsync({
            name: row.itemName,
            type: row.itemType,
            projectPhaseId: row.matchedPhaseId,
            year: currentYear
          });
          const newItemId = projects
            .flatMap(p => (p.phases || []))
            .find((ph: any) => ph.id === row.matchedPhaseId)
            ?.[row.itemType === 'cost' ? 'costItems' : 'revenueItems']
            ?.slice(-1)[0]?.id;
          
          if (newItemId) {
            await updateBudgetItemMutation.mutateAsync({
              id: newItemId,
              data: { monthlyValues: monthlyValuesObj }
            });
          }
          createCount++;
        }
      } catch (err: any) {
        errorCount++;
        console.error(`Row ${row.rowNumber} error:`, err);
      }
    }
    
    setImporting(false);
    setIsImportDialogOpen(false);
    setImportData([]);
    
    if (errorCount === 0) {
      toast.success("İçe aktarma tamamlandı", { 
        description: `${updateCount} güncellendi, ${createCount} oluşturuldu` 
      });
    } else {
      toast.warning("İçe aktarma tamamlandı", { 
        description: `${updateCount} güncellendi, ${createCount} oluşturuldu, ${errorCount} hata` 
      });
    }
  };

  const years = getAvailableYears();

  const visibleProjects = currentUser?.role === 'admin' 
    ? projects 
    : projects.filter(p => currentUser?.assignedProjectIds.includes(p.id));

  const totalCosts = visibleProjects.reduce((acc, proj) => {
    return acc + (proj.phases || []).reduce((pAcc: number, phase: any) => {
      return pAcc + (phase.costItems || []).reduce((iAcc: number, item: any) => {
        return iAcc + Object.values(item.values as Record<string, number>).reduce((mAcc, val) => mAcc + val, 0);
      }, 0);
    }, 0);
  }, 0);

  const totalRevenue = visibleProjects.reduce((acc, proj) => {
    return acc + (proj.phases || []).reduce((pAcc: number, phase: any) => {
      return pAcc + (phase.revenueItems || []).reduce((iAcc: number, item: any) => {
        return iAcc + Object.values(item.values as Record<string, number>).reduce((mAcc, val) => mAcc + val, 0);
      }, 0);
    }, 0);
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Proje Bütçesi</h1>
          <p className="text-muted-foreground mt-1">Proje bazlı gelir/gider planlaması ve yönetimi.</p>
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
            <Button 
              className="bg-primary hover:bg-primary/90" 
              onClick={() => setIsNewProjectOpen(true)}
              disabled={!selectedCompanyId}
              title={!selectedCompanyId ? "Lütfen önce bir şirket seçin" : undefined}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Proje
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-end ml-auto">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardHeader className="pb-2 text-right">
            <CardDescription className="text-xs uppercase tracking-wider">Toplam Projeler</CardDescription>
            <CardTitle className="text-2xl font-bold">{visibleProjects.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20 shadow-sm">
          <CardHeader className="pb-2 text-right">
            <CardDescription className="text-xs uppercase tracking-wider">Toplam Giderler</CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">€{formatMoney(totalCosts)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-2 text-right">
            <CardDescription className="text-xs uppercase tracking-wider">Toplam Gelirler</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">€{formatMoney(totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-lg">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-primary" />
              {currentYear} Proje Bütçeleri
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : visibleProjects.length === 0 ? (
            <div className="text-center p-12 bg-muted/20 rounded-lg border border-dashed">
              <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Proje Bulunamadı</h3>
              <p className="text-muted-foreground">
                {currentUser?.role === 'admin' 
                  ? 'Henüz proje eklenmemiş. Yeni proje eklemek için yukarıdaki butonu kullanın.'
                  : 'Atanmış bir projeniz bulunmuyor.'}
              </p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full" value={expandedProjects === null ? visibleProjects.map(p => p.id) : expandedProjects} onValueChange={setExpandedProjects}>
              {visibleProjects.map((project) => {
                const projectCostTotal = (project.phases || []).reduce((acc: number, phase: any) => 
                  acc + (phase.costItems || []).reduce((iAcc: number, item: any) => 
                    iAcc + Object.values(item.values as Record<string, number>).reduce((sum, v) => sum + v, 0), 0), 0);
                const projectRevenueTotal = (project.phases || []).reduce((acc: number, phase: any) => 
                  acc + (phase.revenueItems || []).reduce((iAcc: number, item: any) => 
                    iAcc + Object.values(item.values as Record<string, number>).reduce((sum, v) => sum + v, 0), 0), 0);
                
                return (
                  <AccordionItem key={project.id} value={project.id} className="border-b border-border/50 px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <FolderGit2 className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">{project.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {(project.phases || []).length} Faz
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-destructive font-mono">€{formatMoney(projectCostTotal)}</span>
                            <span className="text-emerald-600 font-mono">€{formatMoney(projectRevenueTotal)}</span>
                          </div>
                          {currentUser?.role === 'admin' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveProjectForPhase(project.id); setIsNewPhaseOpen(true); }}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Yeni Faz Ekle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingProject({ id: project.id, name: project.name }); setEditProjectOpen(true); }}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id, project.name); }} className="text-destructive">
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
                        <Tabs 
                            value={activeTabByProject[project.id] || "costs"} 
                            onValueChange={(value) => setActiveTabByProject(prev => ({ ...prev, [project.id]: value }))}
                            className="w-full"
                          >
                          <div className="flex items-center justify-between mb-6">
                            <TabsList className="grid w-full max-w-md grid-cols-3">
                              <TabsTrigger value="costs">Giderler</TabsTrigger>
                              <TabsTrigger value="revenue">Gelirler</TabsTrigger>
                              <TabsTrigger value="processes" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Süreçler
                              </TabsTrigger>
                            </TabsList>
                            {currentUser?.role === 'admin' && (
                              <>
                                {(activeTabByProject[project.id] === "costs" || activeTabByProject[project.id] === "revenue" || !activeTabByProject[project.id]) && (
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setActiveProjectForPhase(project.id); setIsNewPhaseOpen(true); }}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Faz Ekle
                                  </Button>
                                )}
                                {activeTabByProject[project.id] === "processes" && (
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const event = new CustomEvent('exportProcesses', { detail: { projectId: project.id } });
                                        window.dispatchEvent(event);
                                      }}
                                      data-testid="button-export-processes"
                                      title="Dışa Aktar"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const event = new CustomEvent('importProcesses', { detail: { projectId: project.id } });
                                        window.dispatchEvent(event);
                                      }}
                                      data-testid="button-import-processes"
                                      title="İçe Aktar"
                                    >
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const event = new CustomEvent('openNewProcessDialog', { detail: { projectId: project.id } });
                                        window.dispatchEvent(event);
                                      }}
                                    >
                                      <Plus className="mr-1 h-3 w-3" />
                                      Süreç Ekle
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <TabsContent value="costs" className="space-y-4">
                            {(project.phases || []).length === 0 ? (
                              <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                                <Layers className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                                <p className="text-muted-foreground text-sm">Henüz faz eklenmemiş. Faz eklemek için sağ üstteki butonu kullanın.</p>
                              </div>
                            ) : (
                            <div className="space-y-4 pl-4 border-l-2 border-border/50 ml-2">
                              {(project.phases || []).map((phase: any) => {
                                const phaseTotal = (phase.costItems || []).reduce((acc: number, i: any) => acc + Object.values(i.values as Record<string, number>).reduce((vAcc, v) => vAcc + v, 0), 0);
                                const monthlyTotals = getMonthlyTotals(phase.costItems || []);
                                
                                return (
                                  <div key={phase.id} className="space-y-0">
                                    <div className="rounded-t-md border border-b-0 border-border overflow-hidden bg-card">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-primary/10">
                                              <th className="w-[200px] text-left p-2 font-semibold sticky left-0 bg-primary/10 z-10">
                                                <div className="flex items-center gap-2">
                                                  <Layers className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-foreground">{phase.name}</span>
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
                                              <th className="text-right w-[150px] p-2 bg-primary/20">
                                                <div className="flex items-center justify-end gap-2">
                                                  <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-muted-foreground font-medium">Toplam</span>
                                                    <span className="font-mono font-bold text-foreground">€ {formatMoney(phaseTotal)}</span>
                                                  </div>
                                                  {currentUser?.role === 'admin' && (
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                          <MoreHorizontal className="h-3 w-3" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { setActivePhaseForItem(phase.id); setIsNewCostItemOpen(true); }}>
                                                          <Plus className="mr-2 h-4 w-4" />
                                                          Yeni Gider Kalemi
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setEditingPhase({ id: phase.id, name: phase.name }); setEditPhaseOpen(true); }}>
                                                          <Pencil className="mr-2 h-4 w-4" />
                                                          Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeletePhase(phase.id, phase.name)} className="text-destructive">
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
                                      items={phase.costItems || []}
                                      isAdmin={currentUser?.role === 'admin'}
                                      onSave={handleUpdateItem}
                                      onRevise={handleReviseItem}
                                      onApprove={handleApproveItem}
                                      onDelete={handleDeleteBudgetItem}
                                      onSubmitForApproval={handleSubmitForApproval}
                                      onWithdraw={handleWithdraw}
                                      onRevert={handleRevertItem}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </TabsContent>

                          <TabsContent value="revenue" className="space-y-4">
                            {(project.phases || []).length === 0 ? (
                              <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                                <Layers className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                                <p className="text-muted-foreground text-sm">Henüz faz eklenmemiş. Faz eklemek için sağ üstteki butonu kullanın.</p>
                              </div>
                            ) : (
                            <div className="space-y-4 pl-4 border-l-2 border-border/50 ml-2">
                              {(project.phases || []).map((phase: any) => {
                                const phaseTotal = (phase.revenueItems || []).reduce((acc: number, i: any) => acc + Object.values(i.values as Record<string, number>).reduce((vAcc, v) => vAcc + v, 0), 0);
                                const monthlyTotals = getMonthlyTotals(phase.revenueItems || []);
                                
                                return (
                                  <div key={phase.id} className="space-y-0">
                                    <div className="rounded-t-md border border-b-0 border-border overflow-hidden bg-card">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-emerald-500/10">
                                              <th className="w-[200px] text-left p-2 font-semibold sticky left-0 bg-emerald-500/10 z-10">
                                                <div className="flex items-center gap-2">
                                                  <Layers className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-foreground">{phase.name}</span>
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
                                              <th className="text-right w-[150px] p-2 bg-emerald-500/20">
                                                <div className="flex items-center justify-end gap-2">
                                                  <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-muted-foreground font-medium">Toplam</span>
                                                    <span className="font-mono font-bold text-foreground">€ {formatMoney(phaseTotal)}</span>
                                                  </div>
                                                  {currentUser?.role === 'admin' && (
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                          <MoreHorizontal className="h-3 w-3" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => { setActivePhaseForItem(phase.id); setIsNewRevenueItemOpen(true); }}>
                                                          <Plus className="mr-2 h-4 w-4" />
                                                          Yeni Gelir Kalemi
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { setEditingPhase({ id: phase.id, name: phase.name }); setEditPhaseOpen(true); }}>
                                                          <Pencil className="mr-2 h-4 w-4" />
                                                          Düzenle
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeletePhase(phase.id, phase.name)} className="text-destructive">
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
                                      items={phase.revenueItems || []}
                                      isAdmin={currentUser?.role === 'admin'}
                                      onSave={handleUpdateItem}
                                      onRevise={handleReviseItem}
                                      onApprove={handleApproveItem}
                                      onDelete={handleDeleteBudgetItem}
                                      onSubmitForApproval={handleSubmitForApproval}
                                      onWithdraw={handleWithdraw}
                                      onRevert={handleRevertItem}
                                      type="revenue"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="processes">
                            <ProjectProcessesTab 
                              projectId={project.id}
                              projectName={project.name}
                            />
                          </TabsContent>
                        </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <AddEntityDialog 
        isOpen={isNewProjectOpen} 
        onClose={() => setIsNewProjectOpen(false)} 
        onSave={handleAddProject}
        title="Yeni Proje Ekle"
        description="Bütçe sistemine yeni bir proje tanımlayın."
        placeholder="Örn: E-Ticaret Platformu"
      />

      <AddEntityDialog 
        isOpen={isNewPhaseOpen} 
        onClose={() => { setIsNewPhaseOpen(false); setActiveProjectForPhase(null); }} 
        onSave={handleAddPhase}
        title="Yeni Faz Ekle"
        description="Seçili proje altına yeni bir faz ekleyin."
        placeholder="Örn: Faz 1: Tasarım"
      />

      <AddBudgetItemDialog 
        isOpen={isNewCostItemOpen} 
        onClose={() => { setIsNewCostItemOpen(false); setActivePhaseForItem(null); }} 
        onSave={handleAddCostItem}
        title="Yeni Gider Kalemi"
        description="Seçili faz altına yeni bir gider kalemi ekleyin."
      />

      <AddBudgetItemDialog 
        isOpen={isNewRevenueItemOpen} 
        onClose={() => { setIsNewRevenueItemOpen(false); setActivePhaseForItem(null); }} 
        onSave={handleAddRevenueItem}
        title="Yeni Gelir Kalemi"
        description="Seçili faz altına yeni bir gelir kalemi ekleyin."
      />

      <AddEntityDialog 
        isOpen={editProjectOpen} 
        onClose={() => { setEditProjectOpen(false); setEditingProject(null); }} 
        onSave={handleEditProject}
        title="Proje Düzenle"
        description="Proje adını güncelleyin."
        placeholder="Proje adı"
        defaultValue={editingProject?.name}
      />

      <AddEntityDialog 
        isOpen={editPhaseOpen} 
        onClose={() => { setEditPhaseOpen(false); setEditingPhase(null); }} 
        onSave={handleEditPhase}
        title="Faz Düzenle"
        description="Faz adını güncelleyin."
        placeholder="Faz adı"
        defaultValue={editingPhase?.name}
      />

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bütçe Kalemleri İçe Aktar</DialogTitle>
            <DialogDescription>
              Aşağıdaki önizlemeyi kontrol edin ve içe aktarın.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Proje</TableHead>
                  <TableHead>Faz</TableHead>
                  <TableHead>Kalem</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, idx) => (
                  <TableRow 
                    key={idx}
                    className={
                      row.status === 'error' ? 'bg-red-50 dark:bg-red-950/20' :
                      row.status === 'update' ? 'bg-blue-50 dark:bg-blue-950/20' :
                      row.status === 'create' ? 'bg-green-50 dark:bg-green-950/20' : ''
                    }
                  >
                    <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                    <TableCell>
                      {row.status === 'error' && (
                        <span className="text-xs text-red-600 font-medium" title={row.errorMessage}>
                          ⚠ Hata
                        </span>
                      )}
                      {row.status === 'update' && (
                        <span className="text-xs text-blue-600 font-medium">🔄 Güncelle</span>
                      )}
                      {row.status === 'create' && (
                        <span className="text-xs text-green-600 font-medium">➕ Oluştur</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{row.projectName}</TableCell>
                    <TableCell className="text-sm">{row.phaseName}</TableCell>
                    <TableCell className="text-sm font-medium">{row.itemName}</TableCell>
                    <TableCell className="text-xs">
                      {row.itemType === 'cost' ? 'Gider' : 'Gelir'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      €{formatMoney(row.monthlyValues.reduce((a, b) => a + b, 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {importData.some(r => r.status === 'error') && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">Hatalı Satırlar:</p>
                <ul className="mt-1 text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                  {importData.filter(r => r.status === 'error').map((r, idx) => (
                    <li key={idx}>Satır {r.rowNumber}: {r.errorMessage}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto">
              <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded"></span> Yeni
              <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded ml-2"></span> Güncelleme
              <span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded ml-2"></span> Hata
            </div>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleImportBudgetItems} 
              disabled={importing || importData.every(r => r.status === 'error')}
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
