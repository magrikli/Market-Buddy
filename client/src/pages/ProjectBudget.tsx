import { useStore } from "@/lib/store";
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
import { PlusCircle, Download, Filter, Loader2, Plus, MoreHorizontal, Pencil, Trash2, FolderGit2, Layers } from "lucide-react";
import { useState } from "react";
import { AddEntityDialog, AddBudgetItemDialog } from "@/components/budget/AddEntityDialogs";
import { toast } from "sonner";
import type { BudgetMonthValues } from "@/lib/store";

export default function ProjectBudget() {
  const { currentYear, setYear, currentUser } = useStore();
  const { data: projects = [], isLoading } = useProjects(currentYear);
  
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
    try {
      await createProjectMutation.mutateAsync(name);
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

  const years = [2024, 2025, 2026];

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
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          {currentUser?.role === 'admin' && (
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsNewProjectOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Proje
            </Button>
          )}
        </div>
      </div>

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
            <Accordion type="multiple" className="w-full" defaultValue={visibleProjects.map(p => p.id)}>
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
                      {(project.phases || []).length === 0 ? (
                        <div className="text-center p-8 bg-muted/10 rounded-lg border border-dashed">
                          <Layers className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                          <p className="text-muted-foreground text-sm">Henüz faz eklenmemiş.</p>
                        </div>
                      ) : (
                        <Tabs defaultValue="costs" className="w-full">
                          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                            <TabsTrigger value="costs">Giderler</TabsTrigger>
                            <TabsTrigger value="revenue">Gelirler</TabsTrigger>
                          </TabsList>

                          <TabsContent value="costs" className="space-y-4">
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
                          </TabsContent>

                          <TabsContent value="revenue" className="space-y-4">
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
                          </TabsContent>
                        </Tabs>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
