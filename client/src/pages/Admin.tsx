import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { useDepartments, useApproveBudgetItem } from "@/lib/queries";
import { Search, UserPlus, Settings, Shield, CheckCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Admin() {
  const { currentYear } = useStore();
  const { data: departments = [] } = useDepartments(currentYear);
  const approveBudgetItemMutation = useApproveBudgetItem();

  const handleBulkApprove = () => {
      toast.success("5 adet bütçe kalemi onaylandı");
  };

  // Mock pending items aggregation
  const pendingItems = [
      { id: 1, dept: 'Bilgi Teknolojileri', group: 'Personel', item: 'Yeni Yazılımcı Maaşı', amount: 45000, date: '2025-01-10' },
      { id: 2, dept: 'İnsan Kaynakları', group: 'Eğitim', item: 'Liderlik Eğitimi', amount: 5000, date: '2025-01-12' },
      { id: 3, dept: 'Bilgi Teknolojileri', group: 'Altyapı', item: 'Yedekleme Sunucusu', amount: 2000, date: '2025-01-14' },
  ];

  // Mock users for display
  const users = [
    { id: 'u-1', username: 'admin', name: 'Sistem Yöneticisi', role: 'admin', assignedDepartmentIds: ['1', '2'], assignedProjectIds: ['1'] },
    { id: 'u-2', username: 'it_manager', name: 'Ahmet Yılmaz', role: 'user', assignedDepartmentIds: ['1'], assignedProjectIds: ['1'] },
    { id: 'u-3', username: 'ik_manager', name: 'Ayşe Demir', role: 'user', assignedDepartmentIds: ['2'], assignedProjectIds: [] },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-1">Sistem ayarları ve kullanıcı yetkilendirme.</p>
      </div>

      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
            <TabsTrigger value="approvals">Onay Bekleyenler</TabsTrigger>
            <TabsTrigger value="users">Kullanıcı Yönetimi</TabsTrigger>
            <TabsTrigger value="settings">Sistem Ayarları</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Toplu Onay</CardTitle>
                        <CardDescription>Departmanlardan gelen onay bekleyen bütçe kalemleri</CardDescription>
                    </div>
                    <Button onClick={handleBulkApprove} className="bg-emerald-600 hover:bg-emerald-700">
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
        </TabsContent>

        <TabsContent value="users">
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle>Kullanıcılar</CardTitle>
                        <CardDescription>Sisteme erişimi olan personelleri yönetin</CardDescription>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Yeni Kullanıcı
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="İsim veya e-posta ile ara..."
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
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
                                            {user.assignedDepartmentIds.length} Departman, {user.assignedProjectIds.length} Proje
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm">Düzenle</Button>
                                </div>
                            </div>
                        ))}
                    </div>
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
    </div>
  );
}
