import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { useProjectProcesses, useCreateProjectProcess, useUpdateProjectProcess, useApproveProcess, useReviseProcess, useRevertProcess, useDeleteProjectProcess } from "@/lib/queries";
import type { ProjectProcess } from "@/lib/api";
import { toast } from "sonner";
import { 
  Plus, ChevronDown, ChevronRight, CalendarIcon, Trash2, Edit2, Check, X, 
  RotateCcw, History, Clock, CheckCircle2, AlertCircle, GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessesTabProps {
  projectId: string;
  projectName: string;
}

interface TreeNode extends ProjectProcess {
  children: TreeNode[];
  level: number;
}

function buildTree(processes: ProjectProcess[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

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

  return roots;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function traverse(node: TreeNode) {
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
  const [newProcess, setNewProcess] = useState({ name: "", parentId: "", startDate: new Date(), endDate: addDays(new Date(), 30) });
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
        startDate: format(newProcess.startDate, "yyyy-MM-dd"),
        endDate: format(newProcess.endDate, "yyyy-MM-dd"),
      });
      toast.success("Süreç oluşturuldu");
      setIsAddDialogOpen(false);
      setNewProcess({ name: "", parentId: "", startDate: new Date(), endDate: addDays(new Date(), 30) });
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
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-process">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Süreç
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Süreç Ağacı</CardTitle>
          </CardHeader>
          <CardContent>
            {flatProcesses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henüz süreç tanımlanmamış
              </div>
            ) : (
              <div className="space-y-1">
                {tree.map(node => (
                  <ProcessTreeNode
                    key={node.id}
                    node={node}
                    expandedNodes={expandedNodes}
                    toggleExpand={toggleExpand}
                    isAdmin={isAdmin}
                    onEdit={setEditingProcess}
                    onApprove={handleApprove}
                    onRevise={setRevisionDialogProcess}
                    onRevert={handleRevert}
                    onDelete={handleDelete}
                    onHistory={setHistoryDialogProcess}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gantt Şeması</CardTitle>
          </CardHeader>
          <CardContent>
            {flatProcesses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henüz süreç tanımlanmamış
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex border-b text-xs text-muted-foreground mb-2 pb-2">
                    <div className="w-40 shrink-0 font-medium">Süreç</div>
                    <div className="flex-1 flex">
                      {Array.from({ length: Math.ceil(ganttDays.length / 7) }).map((_, i) => (
                        <div key={i} className="flex-1 text-center border-l border-gray-200 first:border-l-0">
                          {format(addDays(ganttRange.start, i * 7), "dd MMM", { locale: tr })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {flatProcesses.map(process => (
                      <div key={process.id} className="flex items-center h-8">
                        <div 
                          className="w-40 shrink-0 text-sm truncate pr-2" 
                          style={{ paddingLeft: `${process.level * 16}px` }}
                          title={process.name}
                        >
                          {process.name}
                        </div>
                        <div className="flex-1 relative h-6 bg-gray-100 rounded">
                          <div
                            className={cn(
                              "absolute h-full rounded text-xs flex items-center justify-center text-white font-medium",
                              process.status === 'approved' ? 'bg-green-500' :
                              process.status === 'pending' ? 'bg-yellow-500' :
                              process.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                            )}
                            style={getGanttBarStyle(process)}
                            title={`${format(parseISO(process.startDate), "dd.MM.yyyy")} - ${format(parseISO(process.endDate), "dd.MM.yyyy")}`}
                          >
                            {differenceInDays(parseISO(process.endDate), parseISO(process.startDate)) > 7 && (
                              <span className="truncate px-1">{process.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Süreç Ekle</DialogTitle>
            <DialogDescription>Proje için yeni bir süreç tanımlayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Süreç Adı</Label>
              <Input
                value={newProcess.name}
                onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
                placeholder="Örn: Tasarım Aşaması"
                data-testid="input-process-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Üst Süreç (Opsiyonel)</Label>
              <Select value={newProcess.parentId} onValueChange={(v) => setNewProcess({ ...newProcess, parentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Üst süreç seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Yok (Ana Süreç)</SelectItem>
                  {processes.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

interface ProcessTreeNodeProps {
  node: TreeNode;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  isAdmin: boolean;
  onEdit: (p: ProjectProcess) => void;
  onApprove: (p: ProjectProcess) => void;
  onRevise: (p: ProjectProcess) => void;
  onRevert: (p: ProjectProcess) => void;
  onDelete: (p: ProjectProcess) => void;
  onHistory: (p: ProjectProcess) => void;
}

function ProcessTreeNode({ node, expandedNodes, toggleExpand, isAdmin, onEdit, onApprove, onRevise, onRevert, onDelete, onHistory }: ProcessTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 group",
          node.status === 'approved' && "bg-green-50/50"
        )}
        style={{ paddingLeft: `${node.level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => toggleExpand(node.id)} className="p-0.5 hover:bg-muted rounded">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate" data-testid={`text-process-${node.id}`}>{node.name}</span>
            <Badge variant="outline" className={cn("text-xs shrink-0", statusColors[node.status])}>
              {statusLabels[node.status]}
            </Badge>
            {node.currentRevision > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">Rev {node.currentRevision}</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(parseISO(node.startDate), "dd.MM.yyyy")} - {format(parseISO(node.endDate), "dd.MM.yyyy")}
            </span>
            <span>{differenceInDays(parseISO(node.endDate), parseISO(node.startDate)) + 1} gün</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onHistory(node)} title="Geçmiş">
            <History className="h-3.5 w-3.5" />
          </Button>
          {isAdmin && (
            <>
              {node.status === 'draft' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => onApprove(node)} title="Onayla">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {node.status === 'approved' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600" onClick={() => onRevise(node)} title="Revize Et">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {node.status === 'draft' && node.previousStartDate && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => onRevert(node)} title="Geri Al">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              {node.status === 'draft' && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)} title="Düzenle">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(node)} title="Sil">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <ProcessTreeNode
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onApprove={onApprove}
              onRevise={onRevise}
              onRevert={onRevert}
              onDelete={onDelete}
              onHistory={onHistory}
            />
          ))}
        </div>
      )}
    </div>
  );
}
