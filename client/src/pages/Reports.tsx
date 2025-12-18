import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Reports() {
  const { currentYear, departments } = useStore();
  const [selectedReport, setSelectedReport] = useState("budget_vs_actual");

  // Mock comparison data for Rev1 vs Rev2 (normally would come from selection)
  const revComparisonData = [
    { name: 'AWS Sunucu Giderleri', rev1: 7500, rev2: 8000, diff: 500 },
    { name: 'Yazılım Lisansları', rev1: 2000, rev2: 2000, diff: 0 },
    { name: 'Donanım Bakım', rev1: 1500, rev2: 1200, diff: -300 },
  ];

  // Mock comparison data
  const comparisonData = [
    { name: 'Personel Giderleri', budget: 120000, actual: 115000, diff: 5000, percent: 95.8 },
    { name: 'Altyapı Giderleri', budget: 45000, actual: 48000, diff: -3000, percent: 106.6 },
    { name: 'Pazarlama', budget: 30000, actual: 12000, diff: 18000, percent: 40.0 },
    { name: 'Eğitim', budget: 10000, actual: 2500, diff: 7500, percent: 25.0 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Raporlar</h1>
          <p className="text-muted-foreground mt-1">Detaylı analiz ve karşılaştırma tabloları.</p>
        </div>
        <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Rapor Seçin" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="budget_vs_actual">Bütçe vs Gerçekleşen</SelectItem>
                <SelectItem value="rev_comparison">Revizyon Karşılaştırma</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {selectedReport === "budget_vs_actual" && (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Bütçe vs Gerçekleşen Analizi ({currentYear})</CardTitle>
                <CardDescription>Maliyet grupları bazında sapma analizi</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Kalem Adı</TableHead>
                            <TableHead className="text-right">Bütçe</TableHead>
                            <TableHead className="text-right">Gerçekleşen</TableHead>
                            <TableHead className="text-right">Fark (Tutar)</TableHead>
                            <TableHead className="text-right">Gerçekleşme %</TableHead>
                            <TableHead className="text-center w-[100px]">Durum</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {comparisonData.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{row.name}</TableCell>
                                <TableCell className="text-right tabular-nums">€ {new Intl.NumberFormat('tr-TR').format(row.budget)}</TableCell>
                                <TableCell className="text-right tabular-nums">€ {new Intl.NumberFormat('tr-TR').format(row.actual)}</TableCell>
                                <TableCell className={`text-right tabular-nums font-bold ${row.diff < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {row.diff > 0 ? '+' : ''}€ {new Intl.NumberFormat('tr-TR').format(row.diff)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {row.percent.toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-center">
                                    {row.percent > 100 ? (
                                        <div className="flex justify-center text-destructive" title="Bütçe Aşıldı">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                    ) : row.percent > 80 ? (
                                        <div className="flex justify-center text-amber-500" title="Sınıra Yakın">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                    ) : (
                                        <div className="flex justify-center text-emerald-500" title="Bütçe İçi">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}

      {selectedReport === "rev_comparison" && (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Revizyon Karşılaştırma</CardTitle>
                        <CardDescription>Departman bütçesi revizyon değişiklikleri</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
                        <Select defaultValue="rev1">
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue placeholder="Rev 1" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rev1">Revizyon 1</SelectItem>
                                <SelectItem value="rev0">Revizyon 0</SelectItem>
                            </SelectContent>
                        </Select>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Select defaultValue="rev2">
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue placeholder="Rev 2" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rev2">Revizyon 2</SelectItem>
                                <SelectItem value="current">Mevcut</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Kalem Adı</TableHead>
                            <TableHead className="text-right">Revizyon 1</TableHead>
                            <TableHead className="text-right">Revizyon 2</TableHead>
                            <TableHead className="text-right">Değişim</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {revComparisonData.map((row, i) => (
                            <TableRow key={i} className={cn(row.diff !== 0 && "bg-muted/10")}>
                                <TableCell className="font-medium">{row.name}</TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">€ {new Intl.NumberFormat('tr-TR').format(row.rev1)}</TableCell>
                                <TableCell className="text-right tabular-nums font-medium">€ {new Intl.NumberFormat('tr-TR').format(row.rev2)}</TableCell>
                                <TableCell className={cn("text-right tabular-nums font-bold", row.diff > 0 ? "text-emerald-600" : row.diff < 0 ? "text-destructive" : "text-muted-foreground")}>
                                    {row.diff > 0 ? '+' : ''}{row.diff !== 0 ? `€ ${new Intl.NumberFormat('tr-TR').format(row.diff)}` : '-'}
                                </TableCell>
                            </TableRow>
                         ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
