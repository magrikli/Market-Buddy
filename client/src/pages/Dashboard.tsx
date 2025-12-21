import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useDepartments, useProjects, useDashboardStats, useExpenseRatio, useDepartmentGroupsBreakdown, useProjectPhasesBreakdown } from "@/lib/queries";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowUpRight, Clock, CheckCircle2, Calendar } from "lucide-react";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const currentYearValue = new Date().getFullYear();
const yearOptions = [currentYearValue - 2, currentYearValue - 1, currentYearValue, currentYearValue + 1, currentYearValue + 2];

export default function Dashboard() {
  const { currentYear, setYear, selectedCompanyId } = useStore();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  const { data: departments = [], isLoading: deptLoading } = useDepartments(currentYear, selectedCompanyId);
  const { data: projects = [], isLoading: projLoading } = useProjects(currentYear, selectedCompanyId);
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats(currentYear, selectedCompanyId);
  const { data: expenseRatioData } = useExpenseRatio(currentYear, selectedCompanyId);
  const { data: deptGroupsData } = useDepartmentGroupsBreakdown(
    currentYear, 
    selectedCompanyId, 
    selectedDepartmentId !== 'all' ? selectedDepartmentId : null
  );
  const { data: projectPhasesData } = useProjectPhasesBreakdown(
    currentYear, 
    selectedCompanyId, 
    selectedProjectId !== 'all' ? selectedProjectId : null
  );

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
  const totalActuals = dashboardStats?.totalActuals || 0;
  const pendingCount = dashboardStats?.pendingCount || 0;
  const usagePercent = totalBudget > 0 ? Math.round((totalActuals / totalBudget) * 100) : 0;
  
  const isLoading = deptLoading || projLoading || statsLoading;

  // Build chart data from monthly budget items and real transactions
  const chartData = monthNames.map((name, index) => {
    const monthKey = String(index);
    
    let monthBudget = 0;
    departments.forEach(dep => {
      (dep.costGroups || []).forEach(group => {
        (group.items || []).forEach((item: any) => {
          const values = item.values as Record<string, number> | undefined;
          monthBudget += Number(values?.[monthKey]) || 0;
        });
      });
    });
    projects.forEach(proj => {
      (proj.phases || []).forEach(phase => {
        (phase.costItems || []).forEach((item: any) => {
          const values = item.values as Record<string, number> | undefined;
          monthBudget += Number(values?.[monthKey]) || 0;
        });
      });
    });
    
    const actual = dashboardStats?.monthlyData?.[index]?.actual || 0;
    
    return {
      name,
      Butce: Math.round(monthBudget),
      Gerceklesen: Math.round(actual),
    };
  });

  const recentTransactions = dashboardStats?.recentTransactions || [];

  const renderCustomLabel = ({ name, percentage }: { name: string; percentage: number }) => {
    if (percentage < 5) return null;
    return `${percentage}%`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Özet Paneli</h1>
          <p className="text-muted-foreground">Finansal durum özeti ve performans metrikleri.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={String(currentYear)} onValueChange={(val) => setYear(Number(val))}>
            <SelectTrigger className="w-[120px]" data-testid="select-year">
              <SelectValue placeholder="Yıl Seçin" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Bütçe ({currentYear})</CardTitle>
            <span className="text-xs font-bold px-2 py-1 rounded bg-primary/10 text-primary">Yıllık</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-budget">€ {new Intl.NumberFormat('tr-TR').format(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">Onaylanan departman ve proje bütçeleri</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kullanılan Bütçe</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-used-budget">€ {new Intl.NumberFormat('tr-TR').format(totalActuals)}</div>
            <p className="text-xs text-muted-foreground mt-1">%{usagePercent} kullanım oranı</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onay Bekleyenler</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount} Kalem</div>
            <p className="text-xs text-muted-foreground mt-1">Admin onayı gerektiriyor</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Projeler</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-project-count">{projects.length} Proje</div>
            <p className="text-xs text-muted-foreground mt-1">Devam eden süreçler</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Ratio Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Proje / Departman Gider Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {expenseRatioData && expenseRatioData.data.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseRatioData.data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseRatioData.data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `€${new Intl.NumberFormat('tr-TR').format(value)}`}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Henüz gider kaydı yok
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                            <Bar dataKey="Gerceklesen" name="Gerçekleşen" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Department Groups and Project Phases Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Departman Grup Giderleri</CardTitle>
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger className="w-[200px]" data-testid="select-department">
                <SelectValue placeholder="Departman Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Departmanlar</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {deptGroupsData && deptGroupsData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptGroupsData.data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deptGroupsData.data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `€${new Intl.NumberFormat('tr-TR').format(value)}`}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Seçili departman için gider kaydı yok
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Proje Faz Giderleri</CardTitle>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]" data-testid="select-project">
                <SelectValue placeholder="Proje Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Projeler</SelectItem>
                {projects.map(proj => (
                  <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {projectPhasesData && projectPhasesData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectPhasesData.data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectPhasesData.data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `€${new Intl.NumberFormat('tr-TR').format(value)}`}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Seçili proje için gider kaydı yok
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Son İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Henüz işlem kaydı yok</p>
            ) : (
              recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div className={`h-2 w-2 mt-2 rounded-full ${tx.type === 'expense' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium">{tx.description || 'İşlem'}</span>
                      <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {tx.type === 'expense' ? '-' : '+'}€{new Intl.NumberFormat('tr-TR').format((tx.amount || 0) / 100)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70">
                      {tx.date ? format(new Date(tx.date), 'd MMMM yyyy', { locale: tr }) : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
