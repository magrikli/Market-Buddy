import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { useProjectProcesses, useCreateProjectProcess, useUpdateProjectProcess, useApproveProcess, useReviseProcess, useRevertProcess, useDeleteProjectProcess } from "@/lib/queries";
import type { ProjectProcess } from "@/lib/api";
import { toast } from "sonner";
import { 
  Plus, ChevronDown, ChevronRight, CalendarIcon, Trash2, Edit2, 
  RotateCcw, History, CheckCircle2, MoreHorizontal, Folder, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessesTabProps {
  projectId: string;
  projectName: string;
}

interface TreeNodeWithDates extends ProjectProcess {
  children: TreeNodeWithDates[];
  level: number;
  calculatedStartDate?: string;
  calculatedEndDate?: string;
  calculatedDays?: number;
}

function buildTree(processes: ProjectProcess[]): TreeNodeWithDates[] {
  const nodeMap = new Map<string, TreeNodeWithDates>();
  const roots: TreeNodeWithDates[] = [];

  processes.forEach(p => {
    nodeMap.set(p.id, { ...p, children: [], level: 0 });
  });

  processes.forEach(p => {
    const node = nodeMap.get(p.id)!;
    if (p.parentId && nodeMap.has(p.parentId)) {
      const parent = nodeMap.get(p.parentId)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Calculate group dates from children (bottom-up)
  function calculateGroupDates(node: TreeNodeWithDates): { start: Date; end: Date } | null {
    if (!node.isGroup || node.children.length === 0) {
      return {
        start: parseISO(node.startDate),
        end: parseISO(node.endDate)
      };
    }

    let minStart: Date | null = null;
    let maxEnd: Date | null = null;

    for (const child of node.children) {
      const childDates = calculateGroupDates(child);
      if (childDates) {
        if (!minStart || childDates.start < minStart) minStart = childDates.start;
        if (!maxEnd || childDates.end > maxEnd) maxEnd = childDates.end;
      }
    }

    if (minStart && maxEnd) {
      node.calculatedStartDate = minStart.toISOString();
      node.calculatedEndDate = maxEnd.toISOString();
      node.calculatedDays = differenceInDays(maxEnd, minStart) + 1;
      return { start: minStart, end: maxEnd };
    }

    return null;
  }

  roots.forEach(calculateGroupDates);

  return roots;
}

function flattenTree(nodes: TreeNodeWithDates[]): TreeNodeWithDates[] {
  const result: TreeNodeWithDates[] = [];
  function traverse(node: TreeNodeWithDates) {
    result.push(node);
    node.children.forEach(traverse);
  }
  nodes.forEach(traverse);
  return result;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-300",
  approved: "bg-green-50 text-green-700 border-green-300",
  rejected: "bg-red-50 text-red-700 border-red-300",
};

const statusLabels: Record<string, string> = {
  draft: "Taslak",
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function ProjectProcessesTab({ projectId, projectName }: ProcessesTabProps) {
  const { currentUser } = useStore();
  const isAdmin = currentUser?.role === 'admin';

  const { data: processes = [], isLoading } = useProjectProcesses(projectId);
  const createMutation = useCreateProjectProcess();
  const updateMutation = useUpdateProjectProcess();
  const approveMutation = useApproveProcess();
  const reviseMutation = useReviseProcess();
  const revertMutation = useRevertProcess();
  const deleteMutation = useDeleteProjectProcess();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProjectProcess | null>(null);
  const [revisionDialogProcess, setRevisionDialogProcess] = useState<ProjectProcess | null>(null);
  const [historyDialogProcess, setHistoryDialogProcess] = useState<ProjectProcess | null>(null);
  const [newProcess, setNewProcess] = useState({ name: "", parentId: "", isGroup: false, startDate: new Date(), endDate: addDays(new Date(), 30) });
  const [revisionReason, setRevisionReason] = useState("");

  const tree = useMemo(() => buildTree(processes), [processes]);
  const flatProcesses = useMemo(() => flattenTree(tree), [tree]);

  const ganttRange = useMemo(() => {
    if (processes.length === 0) {
      const now = new Date();
      return { start: startOfMonth(now), end: endOfMonth(addDays(now, 90)) };
    }
    const dates = processes.flatMap(p => [parseISO(p.startDate), parseISO(p.endDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return { start: startOfMonth(minDate), end: endOfMonth(maxDate) };
  }, [processes]);

  const ganttDays = useMemo(() => 
    eachDayOfInterval({ start: ganttRange.start, end: ganttRange.end }),
    [ganttRange]
  );

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newProcess.name.trim()) {
      toast.error("Süreç adı gerekli");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: newProcess.name,
        projectId,
        parentId: newProcess.parentId || null,
        isGroup: newProcess.isGroup,
        startDate: format(newProcess.startDate, "yyyy-MM-dd"),
        endDate: format(newProcess.endDate, "yyyy-MM-dd"),
      });
      toast.success(newProcess.isGroup ? "Grup oluşturuldu" : "Süreç oluşturuldu");
      setIsAddDialogOpen(false);
      setNewProcess({ name: "", parentId: "", isGroup: false, startDate: new Date(), endDate: addDays(new Date(), 30) });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingProcess) return;
    try {
      await updateMutation.mutateAsync({
        id: editingProcess.id,
        projectId,
        data: {
          name: editingProcess.name,
          startDate: editingProcess.startDate,
          endDate: editingProcess.endDate,
          parentId: editingProcess.parentId,
        },
      });
      toast.success("Süreç güncellendi");
      setEditingProcess(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApprove = async (process: ProjectProcess) => {
    try {
      await approveMutation.mutateAsync({ id: process.id, projectId });
      toast.success("Süreç onaylandı");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRevise = async () => {
    if (!revisionDialogProcess) return;
    try {
      await reviseMutation.mutateAsync({
        id: revisionDialogProcess.id,
        projectId,
        editorName: currentUser?.name || "Unknown",
        revisionReason,
      });
      toast.success("Revizyon başlatıldı");
      setRevisionDialogProcess(null);
      setRevisionReason("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRevert = async (process: ProjectProcess) => {
    try {
      await revertMutation.mutateAsync({ id: process.id, projectId });
      toast.success("Önceki sürüme geri alındı");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (process: ProjectProcess) => {
    if (!confirm(`"${process.name}" sürecini silmek istediğinizden emin misiniz?`)) return;
    try {
      await deleteMutation.mutateAsync({ id: process.id, projectId });
      toast.success("Süreç silindi");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getGanttBarStyle = (process: ProjectProcess) => {
    const start = parseISO(process.startDate);
    const end = parseISO(process.endDate);
    const totalDays = differenceInDays(ganttRange.end, ganttRange.start) + 1;
    const startOffset = differenceInDays(start, ganttRange.start);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Proje Süreçleri</h2>
          <p className="text-sm text-muted-foreground">{projectName} projesinin süreç planlaması</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setNewProcess({ name: "", parentId: "", isGroup: true, startDate: new Date(), endDate: addDays(new Date(), 30) });
                setIsAddDialogOpen(true);
              }} 
              data-testid="button-add-group"
            >
              <Folder className="mr-2 h-4 w-4" />
              Yeni Grup
            </Button>
            <Button 
              onClick={() => {
                setNewProcess({ name: "", parentId: "", isGroup: false, startDate: new Date(), endDate: addDays(new Date(), 30) });
                setIsAddDialogOpen(true);
              }} 
              data-testid="button-add-process"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Süreç
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {flatProcesses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Henüz süreç tanımlanmamış
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium w-[200px]">Süreç Adı</th>
                    <th className="text-left p-3 font-medium w-[100px]">Başlangıç</th>
                    <th className="text-left p-3 font-medium w-[100px]">Bitiş</th>
                    <th className="text-left p-3 font-medium w-[80px]">Gün</th>
                    <th className="text-left p-3 font-medium min-w-[300px]">
                      <div className="flex text-xs text-muted-foreground">
                        {Array.from({ length: Math.min(Math.ceil(ganttDays.length / 7), 12) }).map((_, i) => (
                          <div key={i} className="flex-1 text-center">
                            {format(addDays(ganttRange.start, i * 7), "dd MMM", { locale: tr })}
                          </div>
                        ))}
                      </div>
                    </th>
                    <th className="w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {flatProcesses.map(process => (
                    <tr key={process.id} className="border-b hover:bg-muted/20">
                      <td className="p-3">
                        <div 
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${process.level * 16}px` }}
                        >
                          {process.children && process.children.length > 0 ? (
                            <button 
                              onClick={() => toggleExpand(process.id)} 
                              className="p-0.5 hover:bg-muted rounded"
                            >
                              {expandedNodes.has(process.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <div className="w-5" />
                          )}
                          {process.isGroup ? (
                            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          )}
                          <span className={cn("font-medium truncate", process.isGroup && "text-amber-700")} title={process.name}>
                            {process.name}
                          </span>
                          {process.currentRevision > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Rev {process.currentRevision}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {process.isGroup && process.calculatedStartDate 
                          ? format(parseISO(process.calculatedStartDate), "dd.MM.yyyy")
                          : process.isGroup && process.children.length === 0
                          ? <span className="text-gray-400 italic">-</span>
                          : format(parseISO(process.startDate), "dd.MM.yyyy")}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {process.isGroup && process.calculatedEndDate 
                          ? format(parseISO(process.calculatedEndDate), "dd.MM.yyyy")
                          : process.isGroup && process.children.length === 0
                          ? <span className="text-gray-400 italic">-</span>
                          : format(parseISO(process.endDate), "dd.MM.yyyy")}
                      </td>
                      <td className="p-3 text-center font-medium">
                        {process.isGroup 
                          ? (process.calculatedDays ?? <span className="text-gray-400">-</span>)
                          : differenceInDays(parseISO(process.endDate), parseISO(process.startDate)) + 1}
                      </td>
                      <td className="p-3">
                        <div className="relative h-6 bg-gray-100 rounded min-w-[200px]">
                          {process.isGroup ? (
                            process.calculatedStartDate && process.calculatedEndDate ? (
                              <div
                                className="absolute h-2 top-2 bg-gray-800 rounded-sm"
                                style={getGanttBarStyle({ 
                                  ...process, 
                                  startDate: process.calculatedStartDate, 
                                  endDate: process.calculatedEndDate 
                                })}
                                title={`${process.calculatedDays} gün`}
                              />
                            ) : null
                          ) : (
                            <div
                              className={cn(
                                "absolute h-full rounded text-[10px] flex items-center justify-center text-white font-medium",
                                process.status === 'approved' ? 'bg-green-500' :
                                  process.status === 'pending' ? 'bg-yellow-500' :
                                  process.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                              )}
                              style={getGanttBarStyle(process)}
                              title={`${differenceInDays(parseISO(process.endDate), parseISO(process.startDate)) + 1} gün`}
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setHistoryDialogProcess(process)}>
                              <History className="mr-2 h-4 w-4" />
                              Geçmiş
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                {process.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleApprove(process)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                    Onayla
                                  </DropdownMenuItem>
                                )}
                                {process.status === 'approved' && (
                                  <DropdownMenuItem onClick={() => setRevisionDialogProcess(process)}>
                                    <Edit2 className="mr-2 h-4 w-4 text-orange-600" />
                                    Revize Et
                                  </DropdownMenuItem>
                                )}
                                {process.status === 'draft' && process.previousStartDate && (
                                  <DropdownMenuItem onClick={() => handleRevert(process)}>
                                    <RotateCcw className="mr-2 h-4 w-4 text-blue-600" />
                                    Geri Al
                                  </DropdownMenuItem>
                                )}
                                {process.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => setEditingProcess(process)}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Düzenle
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(process)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {newProcess.isGroup ? (
                <><Folder className="h-5 w-5 text-amber-500" /> Yeni Grup Ekle</>
              ) : (
                <><FileText className="h-5 w-5 text-blue-500" /> Yeni Süreç Ekle</>
              )}
            </DialogTitle>
            <DialogDescription>
              {newProcess.isGroup 
                ? "Grup tarihler alt süreçlerden otomatik hesaplanır"
                : "Proje için yeni bir süreç tanımlayın"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{newProcess.isGroup ? 'Grup' : 'Süreç'} Adı</Label>
              <Input
                value={newProcess.name}
                onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
                placeholder={newProcess.isGroup ? "Örn: Tasarım Fazı" : "Örn: UI Tasarımı"}
                data-testid="input-process-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Üst Grup (Opsiyonel)</Label>
              <Select 
                value={newProcess.parentId || "__none__"} 
                onValueChange={(v) => setNewProcess({ ...newProcess, parentId: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Üst grup seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Yok (Ana Seviye)</SelectItem>
                  {processes.filter(p => p.isGroup).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!newProcess.isGroup && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Başlangıç Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newProcess.startDate, "dd.MM.yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newProcess.startDate}
                        onSelect={(d) => d && setNewProcess({ ...newProcess, startDate: d })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Bitiş Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newProcess.endDate, "dd.MM.yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newProcess.endDate}
                        onSelect={(d) => d && setNewProcess({ ...newProcess, endDate: d })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            {newProcess.isGroup && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Grubun başlangıç ve bitiş tarihleri, içindeki süreçlerin tarihlerine göre otomatik hesaplanacaktır.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} data-testid="button-save-process">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProcess} onOpenChange={() => setEditingProcess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Süreç Düzenle</DialogTitle>
          </DialogHeader>
          {editingProcess && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Süreç Adı</Label>
                <Input
                  value={editingProcess.name}
                  onChange={(e) => setEditingProcess({ ...editingProcess, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Başlangıç Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(parseISO(editingProcess.startDate), "dd.MM.yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseISO(editingProcess.startDate)}
                        onSelect={(d) => d && setEditingProcess({ ...editingProcess, startDate: format(d, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Bitiş Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(parseISO(editingProcess.endDate), "dd.MM.yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={parseISO(editingProcess.endDate)}
                        onSelect={(d) => d && setEditingProcess({ ...editingProcess, endDate: format(d, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProcess(null)}>İptal</Button>
            <Button onClick={handleUpdate}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revisionDialogProcess} onOpenChange={() => setRevisionDialogProcess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revizyon Başlat</DialogTitle>
            <DialogDescription>
              "{revisionDialogProcess?.name}" sürecini revize etmek için bir neden belirtin
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Revizyon Nedeni</Label>
            <Textarea
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="Revizyon nedenini açıklayın..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevisionDialogProcess(null); setRevisionReason(""); }}>
              İptal
            </Button>
            <Button onClick={handleRevise}>Revizyonu Başlat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialogProcess} onOpenChange={() => setHistoryDialogProcess(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revizyon Geçmişi</DialogTitle>
            <DialogDescription>"{historyDialogProcess?.name}" sürecinin geçmiş revizyonları</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-auto">
            {historyDialogProcess?.history && historyDialogProcess.history.length > 0 ? (
              <div className="space-y-3">
                {historyDialogProcess.history.map((rev, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Rev {rev.revision}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(rev.date), "dd.MM.yyyy HH:mm")}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div><span className="text-muted-foreground">Başlangıç:</span> {format(parseISO(rev.startDate), "dd.MM.yyyy")}</div>
                      <div><span className="text-muted-foreground">Bitiş:</span> {format(parseISO(rev.endDate), "dd.MM.yyyy")}</div>
                      {rev.revisionReason && (
                        <div className="mt-2 text-muted-foreground italic">"{rev.revisionReason}"</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">Düzenleyen: {rev.editor}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">Revizyon geçmişi bulunmuyor</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

