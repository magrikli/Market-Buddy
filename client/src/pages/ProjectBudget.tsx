import { useStore } from "@/lib/store";
import { useProjects, useUpdateBudgetItem, useReviseBudgetItem, useApproveBudgetItem } from "@/lib/queries";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Download, FolderGit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { BudgetMonthValues } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

export default function ProjectBudget() {
  const { currentYear, setYear, currentUser } = useStore();
  const { data: projects = [], isLoading } = useProjects(currentYear);
  const updateBudgetItemMutation = useUpdateBudgetItem();
  const reviseBudgetItemMutation = useReviseBudgetItem();
  const approveBudgetItemMutation = useApproveBudgetItem();

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

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(amount);
  };

  const years = [2024, 2025, 2026];

  const visibleProjects = currentUser?.role === 'admin' 
    ? projects 
    : projects.filter(p => currentUser?.assignedProjectIds.includes(p.id));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Proje Bütçesi</h1>
          <p className="text-muted-foreground mt-1">Proje bazlı gelir/gider planlaması.</p>
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
            <Download className="h-4 w-4" />
          </Button>
          {currentUser?.role === 'admin' && (
             <Button className="bg-primary hover:bg-primary/90">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Proje
             </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {visibleProjects.length === 0 ? (
            <div className="text-center p-12 bg-muted/20 rounded-lg border border-dashed">
                <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">Proje Bulunamadı</h3>
                <p className="text-muted-foreground">Atanmış bir projeniz bulunmuyor.</p>
            </div>
        ) : (
            visibleProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden border-border/50 shadow-md">
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FolderGit2 className="h-5 w-5 text-primary" />
                                {project.name}
                            </CardTitle>
                            <Badge variant="outline" className="bg-background">Aktif Proje</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Tabs defaultValue="costs" className="w-full">
                            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                                <TabsTrigger value="costs">Giderler (Costs)</TabsTrigger>
                                <TabsTrigger value="revenue">Gelirler (Revenue)</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="costs" className="space-y-6">
                                <Accordion type="multiple" className="w-full" defaultValue={(project.phases || []).map(p => p.id)}>
                                    {project.phases.map((phase) => (
                                        <AccordionItem key={phase.id} value={phase.id} className="border border-border/40 rounded-lg mb-4 px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3">
                                                <span className="font-medium">{phase.name}</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-4 pt-2">
                                                <BudgetTable 
                                                    items={phase.costItems || []}
                                                    isAdmin={currentUser?.role === 'admin'}
                                                    onSave={handleUpdateItem}
                                                    onRevise={handleReviseItem}
                                                    onApprove={handleApproveItem}
                                                    onSubmitForApproval={handleSubmitForApproval}
                                                    onWithdraw={handleWithdraw}
                                                    type="cost"
                                                />
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </TabsContent>
                            
                            <TabsContent value="revenue" className="space-y-6">
                                <Accordion type="multiple" className="w-full" defaultValue={(project.phases || []).map(p => p.id)}>
                                    {project.phases.map((phase) => (
                                        <AccordionItem key={phase.id} value={phase.id} className="border border-border/40 rounded-lg mb-4 px-4 overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-3">
                                                <span className="font-medium">{phase.name}</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-4 pt-2">
                                                <BudgetTable 
                                                    items={phase.revenueItems || []}
                                                    isAdmin={currentUser?.role === 'admin'}
                                                    onSave={handleUpdateItem}
                                                    onRevise={handleReviseItem}
                                                    onApprove={handleApproveItem}
                                                    onSubmitForApproval={handleSubmitForApproval}
                                                    onWithdraw={handleWithdraw}
                                                    type="revenue"
                                                />
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            ))
        )}
      </div>
    </div>
  );
}

