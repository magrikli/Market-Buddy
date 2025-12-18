import { useStore } from "@/lib/store";
import { useDepartments, useCreateDepartment, useCreateCostGroup, useUpdateBudgetItem, useReviseBudgetItem, useApproveBudgetItem } from "@/lib/queries";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Download, Filter, Loader2 } from "lucide-react";
import { useState } from "react";
import { AddEntityDialog } from "@/components/budget/AddEntityDialogs";
import { toast } from "sonner";
import type { BudgetMonthValues } from "@/lib/store";

export default function DepartmentBudget() {
  const { currentYear, setYear, currentUser } = useStore();
  const { data: departments = [], isLoading } = useDepartments(currentYear);
  const createDepartmentMutation = useCreateDepartment();
  const createCostGroupMutation = useCreateCostGroup();
  const updateBudgetItemMutation = useUpdateBudgetItem();
  const reviseBudgetItemMutation = useReviseBudgetItem();
  const approveBudgetItemMutation = useApproveBudgetItem();
  
  // Dialog States
  const [isNewDeptOpen, setIsNewDeptOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [activeDeptForGroup, setActiveDeptForGroup] = useState<string | null>(null);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(amount);
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

  const years = [2024, 2025, 2026];

  // Filtering based on user role
  const visibleDepartments = currentUser?.role === 'admin' 
    ? departments 
    : departments.filter(d => currentUser?.assignedDepartmentIds.includes(d.id));

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
             <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsNewDeptOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Departman
             </Button>
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
            <Accordion type="multiple" className="w-full">
                {visibleDepartments.map((dept) => {
                    const deptTotal = dept.costGroups.reduce((acc, g) => acc + g.items.reduce((iAcc, i) => iAcc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0), 0);
                    
                    return (
                        <AccordionItem key={dept.id} value={dept.id} className="border-b border-border/50 px-6">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-lg text-foreground">{dept.name}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">{dept.costGroups.length} Grup</span>
                                    </div>
                                    <span className="font-mono font-medium text-foreground">€ {formatMoney(deptTotal)}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-6 pt-2">
                                <div className="space-y-6 pl-4 border-l-2 border-border/50 ml-2">
                                    {dept.costGroups.map((group) => {
                                        const groupTotal = group.items.reduce((acc, i) => acc + Object.values(i.values).reduce((vAcc, v) => vAcc + v, 0), 0);
                                        return (
                                            <div key={group.id} className="space-y-3">
                                                <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-sm text-foreground">{group.name}</h4>
                                                    </div>
                                                    <span className="text-sm font-mono text-muted-foreground">€ {formatMoney(groupTotal)}</span>
                                                </div>
                                                
                                                <BudgetTable 
                                                    items={group.items}
                                                    isAdmin={currentUser?.role === 'admin'}
                                                    onSave={handleUpdateItem}
                                                    onRevise={handleReviseItem}
                                                    onApprove={handleApproveItem}
                                                />
                                            </div>
                                        );
                                    })}
                                    
                                    <Button 
                                        variant="outline" 
                                        className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary/50"
                                        onClick={() => {
                                            setActiveDeptForGroup(dept.id);
                                            setIsNewGroupOpen(true);
                                        }}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Yeni Maliyet Grubu Ekle
                                    </Button>
                                </div>
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
