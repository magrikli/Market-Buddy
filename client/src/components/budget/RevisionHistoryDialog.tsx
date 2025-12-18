import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CostItem, RevenueItem } from "@/lib/store";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface RevisionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: CostItem | RevenueItem | null;
}

export function RevisionHistoryDialog({
  isOpen,
  onClose,
  item,
}: RevisionHistoryDialogProps) {
  if (!item) return null;

  const allRevisions = [...item.history].sort((a, b) => b.revision - a.revision);
  
  // Also include current state as the latest "revision" if it has changes, 
  // but usually history tracks committed past states. 
  // For this mockup, let's assume history array contains past valid states.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revizyon Geçmişi: {item.name}</DialogTitle>
          <DialogDescription>
            Bu kalem için yapılan tüm değişikliklerin kaydı.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rev No</TableHead>
                <TableHead className="w-[150px]">Tarih</TableHead>
                <TableHead className="w-[150px]">Düzenleyen</TableHead>
                <TableHead className="text-right">Toplam Tutar</TableHead>
                <TableHead className="text-right">Detay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRevisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Henüz bir revizyon geçmişi bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                allRevisions.map((rev) => (
                  <TableRow key={rev.revision}>
                    <TableCell className="font-medium">Rev.{rev.revision}</TableCell>
                    <TableCell>
                      {format(new Date(rev.date), "d MMM yyyy HH:mm", { locale: tr })}
                    </TableCell>
                    <TableCell>{rev.editor}</TableCell>
                    <TableCell className="text-right font-mono">
                      € {new Intl.NumberFormat('tr-TR').format(Object.values(rev.values).reduce((a, b) => a + b, 0))}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                        {/* Summary of monthly distribution could go here */}
                        Ocak: {new Intl.NumberFormat('tr-TR').format(rev.values[0] || 0)}...
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
