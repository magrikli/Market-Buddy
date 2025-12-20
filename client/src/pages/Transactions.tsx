import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/lib/store";
import { useDepartments, useDepartmentGroups, useProjects, useCreateTransaction, useTransactions } from "@/lib/queries";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Save, Download, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = z.object({
  type: z.enum(["department_expense", "project_expense", "project_revenue"]),
  date: z.date(),
  amount: z.string().min(1, "Tutar giriniz"),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  itemId: z.string().optional(),
});

export default function Transactions() {
  const { currentYear, currentUser, selectedCompanyId } = useStore();
  const { data: allDepartments = [] } = useDepartments(currentYear, selectedCompanyId);
  const { data: departmentGroups = [] } = useDepartmentGroups();
  const { data: allProjects = [] } = useProjects(currentYear, selectedCompanyId);
  const createTransactionMutation = useCreateTransaction();
  const [loading, setLoading] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Get short ID (first 8 chars)
  const shortId = (id: string) => id?.substring(0, 8) || "";
  
  // Build item lookup map for import (short ID -> full ID)
  const buildItemLookup = () => {
    const lookup: Record<string, string> = {};
    departments.forEach(dept => {
      if (dept.costGroups) {
        dept.costGroups.forEach((cg: any) => {
          if (cg.items) {
            cg.items.forEach((item: any) => {
              lookup[shortId(item.id)] = item.id;
            });
          }
        });
      }
    });
    projects.forEach(proj => {
      if (proj.phases) {
        proj.phases.forEach((phase: any) => {
          if (phase.costItems) {
            phase.costItems.forEach((item: any) => {
              lookup[shortId(item.id)] = item.id;
            });
          }
          if (phase.revenueItems) {
            phase.revenueItems.forEach((item: any) => {
              lookup[shortId(item.id)] = item.id;
            });
          }
        });
      }
    });
    return lookup;
  };

  // Export CSV template with reference data (short IDs)
  const handleExportTemplate = () => {
    const lines: string[] = [];
    
    // Main data headers
    lines.push("=== VERİ GİRİŞ ŞABLONU (Kısa ID Kullanın) ===");
    lines.push("Tarih;Tür;KalemID;Tutar;Açıklama");
    lines.push("2025-12-20;department_expense;abcd1234;1000;Örnek açıklama");
    lines.push("");
    lines.push("=== TÜR SEÇENEKLERİ ===");
    lines.push("department_expense = Departman Gideri");
    lines.push("project_expense = Proje Gideri");
    lines.push("project_revenue = Proje Geliri");
    lines.push("");
    
    // Department reference list
    lines.push("=== DEPARTMAN KALEMLERİ ===");
    lines.push("Departman;Grup;Kalem;KısaID");
    departments.forEach(dept => {
      if (dept.costGroups && dept.costGroups.length > 0) {
        dept.costGroups.forEach((cg: any) => {
          if (cg.items && cg.items.length > 0) {
            cg.items.forEach((item: any) => {
              lines.push(`${dept.name};${cg.name};${item.name};${shortId(item.id)}`);
            });
          }
        });
      }
    });
    lines.push("");
    
    // Project reference list
    lines.push("=== PROJE KALEMLERİ ===");
    lines.push("Proje;Faz;Kalem;KısaID;Tür");
    projects.forEach(proj => {
      if (proj.phases && proj.phases.length > 0) {
        proj.phases.forEach((phase: any) => {
          if (phase.costItems && phase.costItems.length > 0) {
            phase.costItems.forEach((item: any) => {
              lines.push(`${proj.name};${phase.name};${item.name};${shortId(item.id)};Gider`);
            });
          }
          if (phase.revenueItems && phase.revenueItems.length > 0) {
            phase.revenueItems.forEach((item: any) => {
              lines.push(`${proj.name};${phase.name};${item.name};${shortId(item.id)};Gelir`);
            });
          }
        });
      }
    });
    
    const csvContent = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transaction_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Şablon indirildi - 8 haneli kısa ID kullanın");
  };

  // Handle file selection
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
      
      const headers = lines[0].split(";").map(h => h.trim());
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(";").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || "";
        });
        return row;
      });
      
      setImportData(dataRows);
      setIsImportDialogOpen(true);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // Process import
  const handleImport = async () => {
    if (importData.length === 0) return;
    
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    
    // Build lookup for short IDs
    const itemLookup = buildItemLookup();
    
    for (const row of importData) {
      try {
        const type = row["Tür"] === "project_revenue" ? "revenue" : "expense";
        const shortItemId = row["KalemID"]?.trim() || "";
        // Match by short ID (8 chars) or full ID
        const fullItemId = itemLookup[shortItemId] || shortItemId;
        
        await createTransactionMutation.mutateAsync({
          type,
          date: row["Tarih"],
          amount: parseFloat(row["Tutar"]) || 0,
          description: row["Açıklama"] || "",
          budgetItemId: fullItemId || undefined,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    setImporting(false);
    setIsImportDialogOpen(false);
    setImportData([]);
    
    if (successCount > 0) {
      toast.success(`${successCount} kayıt başarıyla eklendi`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} kayıt eklenemedi`);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const departments = isAdmin 
    ? allDepartments 
    : allDepartments.filter(d => currentUser?.assignedDepartmentIds?.includes(d.id));
  const projects = isAdmin 
    ? allProjects 
    : allProjects.filter(p => currentUser?.assignedProjectIds?.includes(p.id));

  // Group departments by their group
  const departmentsByGroup = departments.reduce((acc, dept) => {
    const groupId = dept.groupId || 'ungrouped';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(dept);
    return acc;
  }, {} as Record<string, typeof departments>);

  const getGroupName = (groupId: string) => {
    if (groupId === 'ungrouped') return 'Grupsuz';
    const group = departmentGroups.find(g => g.id === groupId);
    return group?.name || 'Bilinmeyen Grup';
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "department_expense",
      description: "",
      amount: "",
    },
  });

  const watchType = form.watch("type");
  const watchDepartmentId = form.watch("departmentId");
  const watchProjectId = form.watch("projectId");

  // Calculate available items based on selection
  let availableItems: { id: string; name: string; groupName: string }[] = [];

  if (watchType === 'department_expense' && watchDepartmentId) {
    const dept = departments.find(d => d.id === watchDepartmentId);
    if (dept) {
      dept.costGroups.forEach(group => {
        group.items.forEach(item => {
          availableItems.push({ id: item.id, name: item.name, groupName: group.name });
        });
      });
    }
  } else if (watchType === 'project_expense' && watchProjectId) {
    const proj = projects.find(p => p.id === watchProjectId);
    if (proj) {
      proj.phases.forEach(phase => {
        phase.costItems.forEach(item => {
          availableItems.push({ id: item.id, name: item.name, groupName: phase.name });
        });
      });
    }
  } else if (watchType === 'project_revenue' && watchProjectId) {
    const proj = projects.find(p => p.id === watchProjectId);
    if (proj) {
      proj.phases.forEach(phase => {
        phase.revenueItems.forEach(item => {
          availableItems.push({ id: item.id, name: item.name, groupName: phase.name });
        });
      });
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await createTransactionMutation.mutateAsync({
        type: values.type.includes('expense') ? 'expense' : 'revenue',
        amount: parseFloat(values.amount),
        description: values.description,
        date: format(values.date, 'yyyy-MM-dd'),
        budgetItemId: values.itemId,
      });
      toast.success("Kayıt başarıyla eklendi", {
        description: `${values.description} - ${values.amount} €`
      });
      form.reset();
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const { data: transactionHistory = [] } = useTransactions(10);
  const history = transactionHistory.map((t: any) => ({
    id: t.id,
    date: t.date,
    desc: t.description,
    amount: t.amount,
    type: t.type === 'expense' ? 'Gider' : 'Gelir',
    category: '-',
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Harcama ve Gelir Girişi</h1>
          <p className="text-muted-foreground mt-1">Gerçekleşen finansal hareketleri sisteme kaydedin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Şablon İndir
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            CSV Yükle
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <Card className="lg:col-span-1 shadow-md h-fit">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg">Yeni Kayıt</CardTitle>
            <CardDescription>Harcama veya gelir ekleyin</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {!selectedCompanyId ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="font-medium">Şirket Seçimi Gerekli</p>
                <p className="text-sm mt-1">Kayıt ekleyebilmek için lütfen önce sol menüden bir şirket seçin.</p>
              </div>
            ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İşlem Türü</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="department_expense" id="department_expense" />
                            <label htmlFor="department_expense" className="text-sm font-medium cursor-pointer">Departman Harcaması</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="project_expense" id="project_expense" />
                            <label htmlFor="project_expense" className="text-sm font-medium cursor-pointer">Proje Harcaması</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="project_revenue" id="project_revenue" />
                            <label htmlFor="project_revenue" className="text-sm font-medium cursor-pointer">Proje Geliri</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tarih</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                field.onChange(new Date(e.target.value));
                              }
                            }}
                            max={format(new Date(), "yyyy-MM-dd")}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchType === 'department_expense' ? (
                    <FormField
                      control={form.control}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departman</FormLabel>
                          <Select onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("itemId", "");
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Departman seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(departmentsByGroup).map(([groupId, depts]) => (
                                <SelectGroup key={groupId}>
                                  <SelectLabel>{getGroupName(groupId)}</SelectLabel>
                                  {depts.map(d => (
                                    <SelectItem key={d.id} value={d.id} className="pl-6">{d.name}</SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proje</FormLabel>
                          <Select onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("itemId", "");
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Proje seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kalem (Item)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={availableItems.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={availableItems.length === 0 ? "Önce departman/proje seçin" : "Kalem seçin"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">({item.groupName})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tutar (€)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Sunucu lisans ödemesi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kaydet
                </Button>
              </form>
            </Form>
            )}
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
                <CardTitle>Son İşlemler</CardTitle>
                <CardDescription>Sisteme girilen son harcama ve gelirler</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Açıklama</TableHead>
                            <TableHead className="text-right">Tutar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium text-muted-foreground text-xs">{item.date}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{item.category}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{item.type}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{item.desc}</TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                    - € {new Intl.NumberFormat('tr-TR').format(item.amount)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CSV Import Önizleme</DialogTitle>
            <DialogDescription>
              {importData.length} kayıt bulundu. İçe aktarmak için onaylayın.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row["Tarih"]}</TableCell>
                    <TableCell>{row["Tür"]}</TableCell>
                    <TableCell>€ {row["Tutar"]}</TableCell>
                    <TableCell>{row["Açıklama"]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>İptal</Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importData.length} Kayıt Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
