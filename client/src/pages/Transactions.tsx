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
  const [csvFileName, setCsvFileName] = useState("");
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    rowIndex: number;
    matches: { id: string; name: string; context: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Types for import rows
  type ImportRow = {
    rowNumber: number;
    date: string;
    type: string;
    departmentName: string;
    projectName: string;
    itemName: string;
    amount: string;
    description: string;
    status: 'pending' | 'matched' | 'ambiguous' | 'error' | 'success';
    matchedItemId?: string;
    matches?: { id: string; name: string; context: string }[];
    errorMessage?: string;
  };

  // Find matching items by name
  const findItemsByName = (itemName: string, deptName?: string, projName?: string) => {
    const matches: { id: string; name: string; context: string }[] = [];
    
    // Search in departments
    if (!projName) {
      departments.forEach(dept => {
        if (deptName && dept.name.toLowerCase() !== deptName.toLowerCase()) return;
        if (dept.costGroups) {
          dept.costGroups.forEach((cg: any) => {
            if (cg.items) {
              cg.items.forEach((item: any) => {
                if (item.name.toLowerCase() === itemName.toLowerCase()) {
                  matches.push({
                    id: item.id,
                    name: item.name,
                    context: `${dept.name} > ${cg.name}`
                  });
                }
              });
            }
          });
        }
      });
    }
    
    // Search in projects
    if (!deptName) {
      projects.forEach(proj => {
        if (projName && proj.name.toLowerCase() !== projName.toLowerCase()) return;
        if (proj.phases) {
          proj.phases.forEach((phase: any) => {
            const items = [...(phase.costItems || []), ...(phase.revenueItems || [])];
            items.forEach((item: any) => {
              if (item.name.toLowerCase() === itemName.toLowerCase()) {
                matches.push({
                  id: item.id,
                  name: item.name,
                  context: `${proj.name} > ${phase.name}`
                });
              }
            });
          });
        }
      });
    }
    
    return matches;
  };

  // Export CSV template with name-based format
  const handleExportTemplate = () => {
    const lines: string[] = [];
    
    // Main data headers
    lines.push("Sıra,Tarih,Tür,Departman,Proje,Kalem,Tutar,Açıklama");
    lines.push("1,2025-12-20,expense,Bilgi Teknolojileri,,Yazılım Ekibi Maaşları,55000,Aralık maaş");
    lines.push("2,2025-12-20,revenue,,Yeni E-Ticaret,Erken Erişim Satışları,30000,");
    lines.push("");
    lines.push("=== AÇIKLAMA ===");
    lines.push("Sıra: Satır numarası (hata takibi için)");
    lines.push("Tür: expense (gider) veya revenue (gelir)");
    lines.push("Departman: Departman gideri için departman adı yazın");
    lines.push("Proje: Proje gideri/geliri için proje adı yazın");
    lines.push("Not: Departman veya Proje'den birini doldurun - ikisini birden doldurmayın");
    lines.push("");
    
    // Department reference list
    lines.push("=== MEVCUT DEPARTMANLAR VE KALEMLERİ ===");
    departments.forEach(dept => {
      if (dept.costGroups && dept.costGroups.length > 0) {
        dept.costGroups.forEach((cg: any) => {
          if (cg.items && cg.items.length > 0) {
            cg.items.forEach((item: any) => {
              lines.push(`Departman: ${dept.name} | Grup: ${cg.name} | Kalem: ${item.name}`);
            });
          }
        });
      }
    });
    lines.push("");
    
    // Project reference list
    lines.push("=== MEVCUT PROJELER VE KALEMLERİ ===");
    projects.forEach(proj => {
      if (proj.phases && proj.phases.length > 0) {
        proj.phases.forEach((phase: any) => {
          if (phase.costItems && phase.costItems.length > 0) {
            phase.costItems.forEach((item: any) => {
              lines.push(`Proje: ${proj.name} | Faz: ${phase.name} | Kalem: ${item.name} (Gider)`);
            });
          }
          if (phase.revenueItems && phase.revenueItems.length > 0) {
            phase.revenueItems.forEach((item: any) => {
              lines.push(`Proje: ${proj.name} | Faz: ${phase.name} | Kalem: ${item.name} (Gelir)`);
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
    toast.success("Şablon indirildi");
  };

  // Handle file selection - parse and match items
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim() && !line.startsWith("==="));
      
      if (lines.length < 2) {
        toast.error("CSV dosyası en az bir veri satırı içermeli");
        return;
      }
      
      const headers = lines[0].split(",").map(h => h.trim());
      const dataRows: ImportRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });
        
        // Skip empty rows or header/instruction rows
        if (!row["Kalem"] && !row["Tutar"]) continue;
        
        const rowNumber = parseInt(row["Sıra"]) || i;
        const itemName = row["Kalem"] || "";
        const deptName = row["Departman"] || "";
        const projName = row["Proje"] || "";
        
        // Find matching items
        const matches = findItemsByName(itemName, deptName || undefined, projName || undefined);
        
        let status: ImportRow['status'] = 'pending';
        let matchedItemId: string | undefined;
        let errorMessage: string | undefined;
        
        if (!itemName) {
          status = 'error';
          errorMessage = 'Kalem adı boş';
        } else if (matches.length === 0) {
          status = 'error';
          errorMessage = 'Kalem bulunamadı';
        } else if (matches.length === 1) {
          status = 'matched';
          matchedItemId = matches[0].id;
        } else {
          status = 'ambiguous';
          errorMessage = `${matches.length} eşleşme bulundu - seçim yapın`;
        }
        
        dataRows.push({
          rowNumber,
          date: row["Tarih"] || "",
          type: row["Tür"] || "expense",
          departmentName: deptName,
          projectName: projName,
          itemName,
          amount: row["Tutar"] || "0",
          description: row["Açıklama"] || "",
          status,
          matchedItemId,
          matches: matches.length > 1 ? matches : undefined,
          errorMessage,
        });
      }
      
      setImportData(dataRows);
      setIsImportDialogOpen(true);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // Handle item selection for ambiguous rows
  const handleSelectItem = (rowIndex: number, itemId: string) => {
    setImportData(prev => prev.map((row, idx) => 
      idx === rowIndex 
        ? { ...row, status: 'matched' as const, matchedItemId: itemId, errorMessage: undefined }
        : row
    ));
    setSelectionDialogOpen(false);
    setPendingSelection(null);
  };

  // Process import
  const handleImport = async () => {
    if (importData.length === 0) return;
    
    // Check if there are any ambiguous rows
    const ambiguousRows = importData.filter(r => r.status === 'ambiguous');
    if (ambiguousRows.length > 0) {
      toast.error(`${ambiguousRows.length} satırda seçim yapmanız gerekiyor`);
      return;
    }
    
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    
    const updatedRows = [...importData];
    
    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      if (row.status === 'error') {
        errorCount++;
        continue;
      }
      
      try {
        const type = row.type === "revenue" ? "revenue" : "expense";
        
        await createTransactionMutation.mutateAsync({
          type,
          date: row.date,
          amount: parseFloat(row.amount) || 0,
          description: row.description || "",
          budgetItemId: row.matchedItemId || undefined,
          csvFileName,
          csvRowNumber: row.rowNumber,
        });
        
        updatedRows[i] = { ...row, status: 'success' };
        successCount++;
      } catch {
        updatedRows[i] = { ...row, status: 'error', errorMessage: 'Kayıt oluşturulamadı' };
        errorCount++;
      }
    }
    
    setImportData(updatedRows);
    setImporting(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} kayıt başarıyla eklendi`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} kayıt eklenemedi`);
    }
    
    // Close dialog if all successful
    if (errorCount === 0) {
      setIsImportDialogOpen(false);
      setImportData([]);
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
        description: values.description || "",
        date: format(values.date, 'yyyy-MM-dd'),
        budgetItemId: values.itemId,
      });
      toast.success("Kayıt başarıyla eklendi", {
        description: `${values.description || "-"} - ${values.amount} €`
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>CSV Import Önizleme - {csvFileName}</DialogTitle>
            <DialogDescription>
              {importData.length} kayıt bulundu. 
              {importData.filter(r => r.status === 'matched').length} eşleşti, 
              {importData.filter(r => r.status === 'ambiguous').length} seçim bekliyor, 
              {importData.filter(r => r.status === 'error').length} hata.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sıra</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kalem</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row: ImportRow, idx) => (
                  <TableRow key={idx} className={
                    row.status === 'error' ? 'bg-red-50' : 
                    row.status === 'ambiguous' ? 'bg-yellow-50' : 
                    row.status === 'success' ? 'bg-green-50' : ''
                  }>
                    <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                    <TableCell className="text-xs">{row.date}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{row.itemName}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.departmentName || row.projectName || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">€ {row.amount}</TableCell>
                    <TableCell>
                      {row.status === 'matched' && <span className="text-green-600 text-xs">✓ Eşleşti</span>}
                      {row.status === 'ambiguous' && <span className="text-yellow-600 text-xs">⚠ Seçim gerekli</span>}
                      {row.status === 'error' && <span className="text-red-600 text-xs">✗ {row.errorMessage}</span>}
                      {row.status === 'success' && <span className="text-green-600 text-xs">✓ Kaydedildi</span>}
                    </TableCell>
                    <TableCell>
                      {row.status === 'ambiguous' && row.matches && (
                        <Select onValueChange={(val) => handleSelectItem(idx, val)}>
                          <SelectTrigger className="h-7 text-xs w-40">
                            <SelectValue placeholder="Seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            {row.matches.map((match) => (
                              <SelectItem key={match.id} value={match.id} className="text-xs">
                                <span>{match.name}</span>
                                <span className="text-muted-foreground ml-1">({match.context})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setImportData([]); }}>İptal</Button>
            <Button 
              onClick={handleImport} 
              disabled={importing || importData.some(r => r.status === 'ambiguous')}
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importData.filter(r => r.status === 'matched').length} Kayıt Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
