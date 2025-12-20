import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useDepartments, useProjects, useCreateTransaction, useTransactions } from "@/lib/queries";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = z.object({
  type: z.enum(["department_expense", "project_expense", "project_revenue"]),
  date: z.date(),
  amount: z.string().min(1, "Tutar giriniz"),
  description: z.string().min(3, "Açıklama giriniz"),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  itemId: z.string().optional(), // In real app, this would be cost item ID
});

export default function Transactions() {
  const { currentYear, currentUser, selectedCompanyId } = useStore();
  const { data: allDepartments = [] } = useDepartments(currentYear, selectedCompanyId);
  const { data: allProjects = [] } = useProjects(currentYear, selectedCompanyId);
  const createTransactionMutation = useCreateTransaction();
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const departments = isAdmin 
    ? allDepartments 
    : allDepartments.filter(d => currentUser?.assignedDepartmentIds?.includes(d.id));
  const projects = isAdmin 
    ? allProjects 
    : allProjects.filter(p => currentUser?.assignedProjectIds?.includes(p.id));

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Harcama ve Gelir Girişi</h1>
        <p className="text-muted-foreground mt-1">Gerçekleşen finansal hareketleri sisteme kaydedin.</p>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tür seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="department_expense">Departman Harcaması</SelectItem>
                          <SelectItem value="project_expense">Proje Harcaması</SelectItem>
                          <SelectItem value="project_revenue">Proje Geliri</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                            form.setValue("itemId", ""); // Reset item when parent changes
                        }} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Departman seçin" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
                            form.setValue("itemId", ""); // Reset item when parent changes
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
    </div>
  );
}
