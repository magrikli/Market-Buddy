import { useState, useMemo, Fragment, useEffect } from "react";
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
import { useProjectProcesses, useCreateProjectProcess, useUpdateProjectProcess, useSubmitProcessForApproval, useApproveProcess, useReviseProcess, useRevertProcess, useDeleteProjectProcess, useStartProcess, useFinishProcess } from "@/lib/queries";
import type { ProjectProcess } from "@/lib/api";
import { toast } from "sonner";
import { 
  Plus, ChevronDown, ChevronRight, CalendarIcon, Trash2, Edit2, 
  RotateCcw, History, Save, X, MoreHorizontal, Folder, FileText, CheckCircle2,
  Play, Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessesTabProps {
  projectId: string;
  projectName: string;
}

interface TreeNodeWithDates extends ProjectProcess {
  children: TreeNodeWithDates[];
  level: number;
  isGroup: boolean; // Derived from whether it has children
  calculatedStartDate?: string;
  calculatedEndDate?: string;
  calculatedDays?: number;
}

// Parse WBS for natural sorting (1.1 < 1.2 < 1.10)
function parseWbs(wbs: string): number[] {
  return wbs.split('.').map(s => parseInt(s, 10) || 0);
}

function compareWbs(a: string, b: string): number {
  const partsA = parseWbs(a);
  const partsB = parseWbs(b);
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

// Get parent WBS from a WBS string (e.g., "1.2.3" -> "1.2", "1" -> null)
function getParentWbs(wbs: string): string | null {
  const parts = wbs.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

function buildTree(processes: ProjectProcess[]): TreeNodeWithDates[] {
  // Sort by WBS first
  const sorted = [...processes].sort((a, b) => compareWbs(a.wbs, b.wbs));
  
  // Map by WBS for parent lookup
  const wbsToNode = new Map<string, TreeNodeWithDates>();
  const roots: TreeNodeWithDates[] = [];

  // Create nodes and store by WBS
  sorted.forEach(p => {
    const level = p.wbs.split('.').length - 1;
    const node: TreeNodeWithDates = { ...p, children: [], level, isGroup: false };
    wbsToNode.set(p.wbs, node);
  });

  // Build tree based on WBS hierarchy
  sorted.forEach(p => {
    const node = wbsToNode.get(p.wbs)!;
    const parentWbs = getParentWbs(p.wbs);
    
    if (parentWbs && wbsToNode.has(parentWbs)) {
      const parent = wbsToNode.get(parentWbs)!;
      parent.children.push(node);
      parent.isGroup = true; // Parent has children, so it's a group
    } else {
      roots.push(node);
    }
  });

  // Calculate group dates from children (bottom-up)
  function calculateGroupDates(node: TreeNodeWithDates): { start: Date; end: Date } | null {
    if (node.children.length === 0) {
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
  const submitForApprovalMutation = useSubmitProcessForApproval();
  const approveMutation = useApproveProcess();
  const reviseMutation = useReviseProcess();
  const revertMutation = useRevertProcess();
  const deleteMutation = useDeleteProjectProcess();
  const startMutation = useStartProcess();
  const finishMutation = useFinishProcess();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; wbs: string; startDate: string; endDate: string } | null>(null);
  const [revisionDialogProcess, setRevisionDialogProcess] = useState<ProjectProcess | null>(null);
  const [historyDialogProcess, setHistoryDialogProcess] = useState<ProjectProcess | null>(null);
  const [newProcess, setNewProcess] = useState({ name: "", wbs: "", startDate: new Date(), endDate: addDays(new Date(), 30) });
  const [revisionReason, setRevisionReason] = useState("");

  const tree = useMemo(() => buildTree(processes), [processes]);
  const flatProcesses = useMemo(() => flattenTree(tree), [tree]);

  // Listen for external event to open new process dialog
  useEffect(() => {
    const handleOpenDialog = (e: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      if (customEvent.detail.projectId === projectId) {
        setNewProcess(prev => ({ ...prev, wbs: getNextWbs() }));
        setIsAddDialogOpen(true);
      }
    };
    window.addEventListener('openNewProcessDialog', handleOpenDialog);
    return () => window.removeEventListener('openNewProcessDialog', handleOpenDialog);
  }, [projectId, processes]);

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

  // Calculate next available WBS for root level or under a parent
  const getNextWbs = (parentWbs?: string) => {
    const existingWbs = processes.map(p => p.wbs);
    if (!parentWbs) {
      // Root level - find next number
      const rootNumbers = existingWbs
        .filter(w => !w.includes('.'))
        .map(w => parseInt(w, 10) || 0);
      const maxRoot = rootNumbers.length > 0 ? Math.max(...rootNumbers) : 0;
      return String(maxRoot + 1);
    } else {
      // Child level - find next number under parent
      const prefix = parentWbs + '.';
      const childNumbers = existingWbs
        .filter(w => w.startsWith(prefix) && !w.substring(prefix.length).includes('.'))
        .map(w => parseInt(w.substring(prefix.length), 10) || 0);
      const maxChild = childNumbers.length > 0 ? Math.max(...childNumbers) : 0;
      return `${parentWbs}.${maxChild + 1}`;
    }
  };

  const handleCreate = async () => {
    if (!newProcess.name.trim()) {
      toast.error("Süreç adı gerekli");
      return;
    }
    if (!newProcess.wbs.trim()) {
      toast.error("WBS numarası gerekli");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: newProcess.name,
        projectId,
        wbs: newProcess.wbs,
        startDate: format(newProcess.startDate, "yyyy-MM-dd"),
        endDate: format(newProcess.endDate, "yyyy-MM-dd"),
      });
      toast.success("Süreç oluşturuldu");
      setIsAddDialogOpen(false);
      setNewProcess({ name: "", wbs: "", startDate: new Date(), endDate: addDays(new Date(), 30) });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const startEdit = (process: TreeNodeWithDates) => {
    setEditingId(process.id);
    setEditData({
      name: process.name,
      wbs: process.wbs,
      startDate: process.startDate.substring(0, 10),
      endDate: process.endDate.substring(0, 10),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async (processId: string, isGroup: boolean) => {
    if (!editData) return;
    try {
      await updateMutation.mutateAsync({
        id: processId,
        projectId,
        data: {
          name: editData.name,
          wbs: editData.wbs,
          startDate: isGroup ? undefined : editData.startDate,
          endDate: isGroup ? undefined : editData.endDate,
        },
      });
      toast.success("Güncellendi");
      setEditingId(null);
      setEditData(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubmitForApproval = async (process: ProjectProcess) => {
    try {
      await submitForApprovalMutation.mutateAsync({ id: process.id, projectId });
      toast.success("Onaya gönderildi");
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

  const handleStart = async (process: ProjectProcess) => {
    try {
      await startMutation.mutateAsync({ id: process.id, projectId });
      toast.success("Süreç başlatıldı");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleFinish = async (process: ProjectProcess) => {
    try {
      await finishMutation.mutateAsync({ id: process.id, projectId });
      toast.success("Süreç tamamlandı");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getGanttBarStyle = (startDateStr: string, endDateStr: string) => {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const totalDays = differenceInDays(ganttRange.end, ganttRange.start) + 1;
    const startOffset = differenceInDays(start, ganttRange.start);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getActualEndDate = (process: ProjectProcess): string => {
    if (process.actualEndDate) return process.actualEndDate;
    const today = new Date().toISOString();
    return today < process.endDate ? today : process.endDate;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
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
                    <th className="text-left p-3 font-medium w-[60px]">WBS</th>
                    <th className="text-left p-3 font-medium w-[200px]">Süreç Adı</th>
                    <th className="text-left p-3 font-medium w-[100px]">Başlangıç</th>
                    <th className="text-left p-3 font-medium w-[100px]">Bitiş</th>
                    <th className="text-left p-3 font-medium w-[80px]">Gün</th>
                    <th className="text-left p-3 font-medium min-w-[300px]">
                      <div className="relative h-4 text-xs text-muted-foreground">
                        {Array.from({ length: Math.ceil(ganttDays.length / 7) + 1 }).map((_, i) => {
                          const totalDays = differenceInDays(ganttRange.end, ganttRange.start) + 1;
                          const offsetDays = i * 7;
                          if (offsetDays > totalDays) return null;
                          const leftPercent = (offsetDays / totalDays) * 100;
                          return (
                            <div 
                              key={i} 
                              className="absolute text-center whitespace-nowrap"
                              style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                            >
                              {format(addDays(ganttRange.start, offsetDays), "dd MMM", { locale: tr })}
                            </div>
                          );
                        })}
                      </div>
                    </th>
                    <th className="w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {flatProcesses.map(process => {
                    const isEditing = editingId === process.id;
                    return (
                      <Fragment key={process.id}>
                      <tr className={cn("border-b hover:bg-muted/20", process.children.length > 0 && "bg-amber-50/50", isEditing && "bg-blue-50")}>
                        <td className="p-2">
                          {isEditing ? (
                            <Input
                              value={editData?.wbs ?? ''}
                              onChange={(e) => setEditData(prev => prev ? { ...prev, wbs: e.target.value } : null)}
                              className="w-20 h-8 text-xs font-mono"
                              placeholder="1.1"
                            />
                          ) : (
                            <span className={cn(
                              "font-mono text-xs",
                              process.isGroup ? "font-bold text-amber-700" : "text-muted-foreground"
                            )}>
                              {process.wbs}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing ? (
                            <div style={{ paddingLeft: `${process.level * 12}px` }}>
                              <Input
                                value={editData?.name ?? ''}
                                onChange={(e) => setEditData(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="h-8"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2" style={{ paddingLeft: `${process.level * 12}px` }}>
                              <span className={cn("font-medium truncate", process.children.length > 0 && "font-semibold")} title={process.name}>
                                {process.name}
                              </span>
                              {process.currentRevision > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  Rev {process.currentRevision}
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {isEditing && !process.isGroup ? (
                            <Input
                              type="date"
                              value={editData?.startDate?.substring(0, 10) ?? ''}
                              onChange={(e) => setEditData(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                              className="h-8 w-32"
                            />
                          ) : (
                            <div>
                              <div>
                                {process.isGroup && process.calculatedStartDate 
                                  ? format(parseISO(process.calculatedStartDate), "dd.MM.yyyy")
                                  : process.isGroup && process.children.length === 0
                                  ? <span className="text-gray-400 italic">-</span>
                                  : format(parseISO(process.startDate), "dd.MM.yyyy")}
                              </div>
                              {!process.isGroup && process.actualStartDate && (() => {
                                const actualStart = parseISO(process.actualStartDate);
                                const plannedStart = parseISO(process.startDate);
                                const isLate = actualStart > plannedStart;
                                return (
                                  <div className={cn("text-xs", isLate ? "text-red-600" : "text-green-600")}>
                                    {format(actualStart, "dd.MM.yyyy")}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {isEditing && !process.isGroup ? (
                            <Input
                              type="date"
                              value={editData?.endDate?.substring(0, 10) ?? ''}
                              onChange={(e) => setEditData(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                              className="h-8 w-32"
                            />
                          ) : (
                            <div>
                              <div>
                                {process.isGroup && process.calculatedEndDate 
                                  ? format(parseISO(process.calculatedEndDate), "dd.MM.yyyy")
                                  : process.isGroup && process.children.length === 0
                                  ? <span className="text-gray-400 italic">-</span>
                                  : format(parseISO(process.endDate), "dd.MM.yyyy")}
                              </div>
                              {!process.isGroup && process.actualStartDate && (() => {
                                if (!process.actualEndDate) {
                                  return <div className="text-xs text-orange-500 italic">Devam</div>;
                                }
                                const actualEnd = parseISO(process.actualEndDate);
                                const plannedEnd = parseISO(process.endDate);
                                const isLate = actualEnd > plannedEnd;
                                return (
                                  <div className={cn("text-xs", isLate ? "text-red-600" : "text-green-600")}>
                                    {format(actualEnd, "dd.MM.yyyy")}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center font-medium">
                          <div>
                            <div>
                              {process.isGroup 
                                ? (process.calculatedDays ?? <span className="text-gray-400">-</span>)
                                : differenceInDays(parseISO(process.endDate), parseISO(process.startDate)) + 1}
                            </div>
                            {!process.isGroup && process.actualStartDate && (() => {
                              const plannedDuration = differenceInDays(parseISO(process.endDate), parseISO(process.startDate)) + 1;
                              if (!process.actualEndDate) {
                                const currentDuration = differenceInDays(new Date(), parseISO(process.actualStartDate)) + 1;
                                return <div className={cn("text-xs", currentDuration > plannedDuration ? "text-red-600" : "text-orange-500")}>{currentDuration}</div>;
                              }
                              const actualDuration = differenceInDays(parseISO(process.actualEndDate), parseISO(process.actualStartDate)) + 1;
                              const isOver = actualDuration > plannedDuration;
                              return <div className={cn("text-xs", isOver ? "text-red-600" : "text-green-600")}>{actualDuration}</div>;
                            })()}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="relative h-8 bg-gray-100 rounded min-w-[200px]">
                            {process.isGroup ? (
                              process.calculatedStartDate && process.calculatedEndDate ? (
                                <div
                                  className="absolute h-2 top-3 bg-gray-800 rounded-sm"
                                  style={getGanttBarStyle(process.calculatedStartDate, process.calculatedEndDate)}
                                  title={`${process.calculatedDays} gün`}
                                />
                              ) : null
                            ) : (
                              <>
                                {/* Planned bar - top, thinner */}
                                <div
                                  className={cn(
                                    "absolute h-3 top-0 rounded-t text-[9px] flex items-center justify-center text-white font-medium opacity-60",
                                    process.status === 'approved' ? 'bg-blue-400' :
                                      process.status === 'pending' ? 'bg-yellow-400' :
                                      process.status === 'rejected' ? 'bg-red-400' : 'bg-gray-400'
                                  )}
                                  style={getGanttBarStyle(process.startDate, process.endDate)}
                                  title={`Planlanan: ${differenceInDays(parseISO(process.endDate), parseISO(process.startDate)) + 1} gün`}
                                />
                                {/* Actual bar - bottom, thinner */}
                                {process.actualStartDate && (() => {
                                  const plannedDuration = differenceInDays(parseISO(process.endDate), parseISO(process.startDate)) + 1;
                                  const actualEndDateStr = getActualEndDate(process);
                                  const actualDuration = differenceInDays(parseISO(actualEndDateStr), parseISO(process.actualStartDate)) + 1;
                                  const isOverBudget = actualDuration > plannedDuration;
                                  
                                  return (
                                    <div
                                      className={cn(
                                        "absolute h-3 bottom-0 rounded-b text-[9px] flex items-center justify-center text-white font-medium",
                                        process.actualEndDate 
                                          ? (isOverBudget ? 'bg-red-500' : 'bg-green-500')
                                          : (isOverBudget ? 'bg-red-500' : 'bg-orange-500')
                                      )}
                                      style={{
                                        ...getGanttBarStyle(process.actualStartDate, actualEndDateStr),
                                        ...(!process.actualEndDate ? { 
                                          background: isOverBudget 
                                            ? 'repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #f87171 4px, #f87171 8px)'
                                            : 'repeating-linear-gradient(45deg, #f97316, #f97316 4px, #fb923c 4px, #fb923c 8px)' 
                                        } : {})
                                      }}
                                      title={`Gerçekleşen: ${process.actualEndDate ? actualDuration : 'Devam ediyor'} gün`}
                                    />
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => saveEdit(process.id, process.isGroup)}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={cancelEdit}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
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
                                {!process.isGroup && !process.actualStartDate && (
                                  <DropdownMenuItem onClick={() => handleStart(process)}>
                                    <Play className="mr-2 h-4 w-4 text-green-600" />
                                    Başlat
                                  </DropdownMenuItem>
                                )}
                                {!process.isGroup && process.actualStartDate && !process.actualEndDate && (
                                  <DropdownMenuItem onClick={() => handleFinish(process)}>
                                    <Flag className="mr-2 h-4 w-4 text-blue-600" />
                                    Tamamla
                                  </DropdownMenuItem>
                                )}
                                {process.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleSubmitForApproval(process)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-yellow-600" />
                                    Onaya Gönder
                                  </DropdownMenuItem>
                                )}
                                {isAdmin && (
                                  <>
                                    {process.status === 'pending' && (
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
                                      <DropdownMenuItem onClick={() => startEdit(process)}>
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
                          )}
                        </td>
                      </tr>
                      </Fragment>
                    );
                  })}
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
              <FileText className="h-5 w-5 text-blue-500" /> Yeni Süreç Ekle
            </DialogTitle>
            <DialogDescription>
              Proje için yeni bir süreç tanımlayın. WBS numarası hiyerarşiyi belirler (örn: 1.1, 1.2, 2).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>WBS</Label>
                <Input
                  value={newProcess.wbs}
                  onChange={(e) => setNewProcess({ ...newProcess, wbs: e.target.value })}
                  placeholder="1.1"
                  className="font-mono"
                  data-testid="input-process-wbs"
                />
              </div>
              <div className="space-y-2 col-span-3">
                <Label>Süreç Adı</Label>
                <Input
                  value={newProcess.name}
                  onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
                  placeholder="Örn: UI Tasarımı"
                  data-testid="input-process-name"
                />
              </div>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              WBS numarası hiyerarşiyi belirler: "1" ana süreç, "1.1" ve "1.2" alt süreçlerdir. Alt süreçler olduğunda üst süreç bir grup haline gelir.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} data-testid="button-save-process">Kaydet</Button>
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

