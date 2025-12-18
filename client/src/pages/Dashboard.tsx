import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useDepartments, useProjects } from "@/lib/queries";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { currentYear } = useStore();
  const { data: departments = [], isLoading: deptLoading } = useDepartments(currentYear);
  const { data: projects = [], isLoading: projLoading } = useProjects(currentYear);

  // Calculate totals
  const totalDepartmentBudget = departments.reduce((acc, dep) => 
    acc + (dep.costGroups || []).reduce((gAcc, group) => 
      gAcc + (group.items || []).reduce((iAcc, item) => 
        iAcc + Object.values(item.values || {}).reduce((vAcc: number, v: any) => vAcc + (Number(v) || 0), 0), 0), 0), 0);
  
  const totalProjectBudget = projects.reduce((acc, proj) => 
    acc + (proj.phases || []).reduce((pAcc, phase) => 
      pAcc + (phase.costItems || []).reduce((iAcc, item) => 
        iAcc + Object.values(item.values || {}).reduce((vAcc: number, v: any) => vAcc + (Number(v) || 0), 0), 0), 0), 0);

  const totalBudget = totalDepartmentBudget + totalProjectBudget;
  const mockActuals = totalBudget * 0.28;
  
  const isLoading = deptLoading || projLoading;

  const chartData = [
    { name: 'Oca', Butce: 4000, Gerceklesen: 2400 },
    { name: 'Şub', Butce: 3000, Gerceklesen: 1398 },
    { name: 'Mar', Butce: 2000, Gerceklesen: 9800 },
    { name: 'Nis', Butce: 2780, Gerceklesen: 3908 },
    { name: 'May', Butce: 1890, Gerceklesen: 4800 },
    { name: 'Haz', Butce: 2390, Gerceklesen: 3800 },
    { name: 'Tem', Butce: 3490, Gerceklesen: 4300 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Özet Paneli</h1>
        <p className="text-muted-foreground">Finansal durum özeti ve performans metrikleri.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Bütçe ({currentYear})</CardTitle>
            <span className="text-xs font-bold px-2 py-1 rounded bg-primary/10 text-primary">Yıllık</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ {new Intl.NumberFormat('tr-TR').format(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">Onaylanan departman ve proje bütçeleri</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kullanılan Bütçe</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ {new Intl.NumberFormat('tr-TR').format(mockActuals)}</div>
            <p className="text-xs text-muted-foreground mt-1">%28 kullanım oranı</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onay Bekleyenler</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 Kalem</div>
            <p className="text-xs text-muted-foreground mt-1">Admin onayı gerektiriyor</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Projeler</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length} Proje</div>
            <p className="text-xs text-muted-foreground mt-1">Devam eden süreçler</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Bütçe vs Gerçekleşen (Aylık)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{fill: '#f3f4f6'}}
                            />
                            <Bar dataKey="Butce" name="Bütçe" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Gerçekleşen" name="Gerçekleşen" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Son Aktiviteler</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                            <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">Bütçe revizyonu yapıldı</span>
                                <span className="text-xs text-muted-foreground">IT Departmanı - Personel Giderleri - Rev.2</span>
                                <span className="text-[10px] text-muted-foreground/70">2 saat önce • Admin</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
