import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Save, X, History, Lock, CheckCircle, Trash2, MoreHorizontal, Edit2, Clock, FileEdit, Send, Undo2, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";
import { useState, Fragment } from "react";
import { CostItem, RevenueItem, BudgetMonthValues } from "@/lib/store";
import { RevisionHistoryDialog } from "./RevisionHistoryDialog";

interface BudgetTableProps {
  items: (CostItem | RevenueItem)[];
  onSave: (itemId: string, values: BudgetMonthValues) => void;
  onRevise: (itemId: string, revisionReason?: string) => void;
  onApprove?: (itemId: string) => void;
  onDelete?: (itemId: string, name: string) => void;
  onSubmitForApproval?: (itemId: string) => void;
  onWithdraw?: (itemId: string) => void;
  onRevert?: (itemId: string) => void;
  onReorder?: (itemId: string, direction: 'up' | 'down') => void;
  isAdmin?: boolean;
  type?: 'cost' | 'revenue';
}

const months = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const currentMonth = new Date().getMonth(); // 0-indexed (0 = January, 11 = December)

export function BudgetTable({ items, onSave, onRevise, onApprove, onDelete, onSubmitForApproval, onWithdraw, onRevert, onReorder, isAdmin = false, type = 'cost' }: BudgetTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<BudgetMonthValues>({});
  
  // Dialog state
  const [historyItem, setHistoryItem] = useState<CostItem | RevenueItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Revision dialog state
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionItemId, setRevisionItemId] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  const startEditing = (item: CostItem | RevenueItem) => {
    setEditingId(item.id);
    setEditValues({ ...item.values });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEditing = (itemId: string) => {
    onSave(itemId, editValues);
    setEditingId(null);
  };

  const handleValueChange = (monthIndex: number, value: string) => {
    const numValue = parseInt(value.replace(/\./g, ''), 10) || 0;
    setEditValues(prev => ({ ...prev, [monthIndex]: numValue }));
  };

  const openHistory = (item: CostItem | RevenueItem) => {
    setHistoryItem(item);
    setIsHistoryOpen(true);
  };

  const openRevisionDialog = (itemId: string) => {
    setRevisionItemId(itemId);
    setRevisionReason("");
    setRevisionDialogOpen(true);
  };

  const confirmRevision = () => {
    if (revisionItemId) {
      onRevise(revisionItemId, revisionReason || undefined);
      setRevisionDialogOpen(false);
      setRevisionItemId(null);
      setRevisionReason("");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'pending': return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'rejected': return <X className="h-3.5 w-3.5 text-red-500" />;
      default: return <FileEdit className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <>
      <div className="rounded-b-md border-x border-b border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableBody>
              {items.map((item) => {
                const isEditing = editingId === item.id;
                const total = isEditing 
                  ? Object.values(editValues).reduce((a, b) => a + b, 0)
                  : Object.values(item.values).reduce((a, b) => a + b, 0);
                
                const hasPreviousApproved = item.previousApprovedValues && Object.keys(item.previousApprovedValues).length > 0;
                const previousTotal = hasPreviousApproved 
                  ? Object.values(item.previousApprovedValues!).reduce((a, b) => a + b, 0) 
                  : 0;

                return (
                  <Fragment key={item.id}>
                    <TableRow className={cn("hover:bg-muted/30 transition-colors", item.status === 'approved' && "opacity-60")}>
                      <TableCell className="w-[200px] font-medium sticky left-0 bg-card z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] p-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            {item.revision > 0 && <span className="text-[10px] text-muted-foreground">Rev.{item.revision}</span>}
                          </div>
                        </div>
                      </TableCell>
                      {months.map((_, index) => {
                        const isPastMonth = index < currentMonth;
                        return (
                          <TableCell key={index} className={cn("min-w-[80px] text-right p-2", isPastMonth && "bg-muted/30")}>
                            {isEditing ? (
                              isPastMonth ? (
                                <span className="block tabular-nums text-muted-foreground">
                                  {formatMoney(editValues[index] || 0)}
                                </span>
                              ) : (
                                <Input 
                                  className="h-7 w-[65px] ml-auto text-right text-xs px-1 border-primary/30 focus-visible:ring-1" 
                                  value={editValues[index] || 0}
                                  onChange={(e) => handleValueChange(index, e.target.value)}
                                />
                              )
                            ) : (
                              <span className={cn(
                                "block tabular-nums",
                                type === 'revenue' && "text-emerald-600 font-medium",
                                isPastMonth && "text-muted-foreground"
                              )}>
                                {formatMoney(item.values[index] || 0)}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="w-[150px] text-right font-bold tabular-nums bg-muted/10 p-2">
                        <div className="flex items-center justify-end gap-2">
                          <span>€ {formatMoney(total)}</span>
                          {isEditing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => saveEditing(item.id)}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={cancelEditing}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isAdmin && onReorder && (
                                  <>
                                    <DropdownMenuItem onClick={() => onReorder(item.id, 'up')}>
                                      <ArrowUp className="mr-2 h-4 w-4" />
                                      Yukarı Taşı
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onReorder(item.id, 'down')}>
                                      <ArrowDown className="mr-2 h-4 w-4" />
                                      Aşağı Taşı
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {item.status === 'approved' ? (
                                  <DropdownMenuItem onClick={() => openRevisionDialog(item.id)}>
                                    <Lock className="mr-2 h-4 w-4 text-amber-600" />
                                    Revize Et
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => startEditing(item)}>
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Düzenle
                                  </DropdownMenuItem>
                                )}
                                
                                {item.status === 'draft' && onSubmitForApproval && (
                                  <DropdownMenuItem onClick={() => onSubmitForApproval(item.id)}>
                                    <Send className="mr-2 h-4 w-4 text-blue-600" />
                                    Onaya Gönder
                                  </DropdownMenuItem>
                                )}

                                {item.status === 'pending' && onWithdraw && (
                                  <DropdownMenuItem onClick={() => onWithdraw(item.id)}>
                                    <Undo2 className="mr-2 h-4 w-4 text-orange-600" />
                                    Geri Çek
                                  </DropdownMenuItem>
                                )}

                                {hasPreviousApproved && item.status !== 'approved' && onRevert && (
                                  <DropdownMenuItem onClick={() => onRevert(item.id)}>
                                    <RotateCcw className="mr-2 h-4 w-4 text-amber-600" />
                                    Önceki Onaylıya Geri Al
                                  </DropdownMenuItem>
                                )}
                                
                                {isAdmin && item.status === 'pending' && onApprove && (
                                  <DropdownMenuItem onClick={() => onApprove(item.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                    Onayla
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => openHistory(item)}>
                                  <History className="mr-2 h-4 w-4" />
                                  Geçmiş
                                </DropdownMenuItem>
                                
                                {isAdmin && onDelete && (
                                  <DropdownMenuItem onClick={() => onDelete(item.id, item.name)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Sil
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {hasPreviousApproved && item.status !== 'approved' && (
                      <TableRow className="bg-amber-50/50 border-t-0">
                        <TableCell className="w-[200px] font-medium sticky left-0 bg-amber-50/50 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] p-2">
                          <div className="flex items-center gap-2 text-amber-700">
                            <span className="text-[10px] italic">Önceki Onaylı</span>
                          </div>
                        </TableCell>
                        {months.map((_, index) => (
                          <TableCell key={index} className="min-w-[80px] text-right p-2 text-amber-700/70">
                            <span className="block tabular-nums text-[10px]">
                              {formatMoney(item.previousApprovedValues![index] || 0)}
                            </span>
                          </TableCell>
                        ))}
                        <TableCell className="w-[150px] text-right tabular-nums bg-amber-100/30 p-2 text-amber-700/70">
                          <span className="text-[10px]">€ {formatMoney(previousTotal)}</span>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <RevisionHistoryDialog 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        item={historyItem} 
      />

      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Revizyon Gerekçesi</DialogTitle>
            <DialogDescription>
              Bu bütçe kalemini revize etmek için bir gerekçe yazın.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="revision-reason">Gerekçe</Label>
              <Textarea
                id="revision-reason"
                placeholder="Revizyon nedenini açıklayın..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-revision-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)} data-testid="button-cancel-revision">
              İptal
            </Button>
            <Button onClick={confirmRevision} data-testid="button-confirm-revision">
              Revize Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
