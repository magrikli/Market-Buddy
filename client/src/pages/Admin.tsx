import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { Search, UserPlus, Settings, Shield } from "lucide-react";

export default function Admin() {
  const { users } = useStore();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Yönetim Paneli</h1>
        <p className="text-muted-foreground mt-1">Sistem ayarları ve kullanıcı yetkilendirme.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="users">Kullanıcı Yönetimi</TabsTrigger>
            <TabsTrigger value="settings">Sistem Ayarları</TabsTrigger>
        </TabsList>

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
