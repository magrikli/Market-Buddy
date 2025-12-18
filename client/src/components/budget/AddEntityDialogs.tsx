import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface AddDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    title: string;
    description: string;
    placeholder: string;
}

export function AddEntityDialog({ isOpen, onClose, onSave, title, description, placeholder }: AddDialogProps) {
    const [name, setName] = useState("");

    const handleSave = () => {
        if (name.trim()) {
            onSave(name);
            setName("");
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">İsim</Label>
                        <Input 
                            id="name" 
                            placeholder={placeholder} 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>İptal</Button>
                    <Button onClick={handleSave}>Ekle</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface AddBudgetItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, type: 'cost' | 'revenue') => void;
    title: string;
    description: string;
    showTypeSelect?: boolean;
}

export function AddBudgetItemDialog({ isOpen, onClose, onSave, title, description, showTypeSelect = false }: AddBudgetItemDialogProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<'cost' | 'revenue'>('cost');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name, type);
            setName("");
            setType('cost');
        }
    };

    const handleClose = () => {
        setName("");
        setType('cost');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="item-name">Kalem Adı</Label>
                        <Input 
                            id="item-name" 
                            placeholder="Örn: Yazılım Lisansları" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            data-testid="input-budget-item-name"
                        />
                    </div>
                    {showTypeSelect && (
                        <div className="space-y-2">
                            <Label>Kalem Tipi</Label>
                            <Select value={type} onValueChange={(v) => setType(v as 'cost' | 'revenue')}>
                                <SelectTrigger data-testid="select-budget-item-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cost">Gider (Cost)</SelectItem>
                                    <SelectItem value="revenue">Gelir (Revenue)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>İptal</Button>
                    <Button onClick={handleSave} data-testid="button-add-budget-item">Ekle</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
