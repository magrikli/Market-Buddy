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
    defaultValue?: string;
}

export function AddEntityDialog({ isOpen, onClose, onSave, title, description, placeholder, defaultValue }: AddDialogProps) {
    const [name, setName] = useState(defaultValue || "");
    
    // Reset name when dialog opens with new defaultValue
    const [lastDefaultValue, setLastDefaultValue] = useState(defaultValue);
    if (defaultValue !== lastDefaultValue) {
        setName(defaultValue || "");
        setLastDefaultValue(defaultValue);
    }

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

interface AddProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, code?: string, projectTypeId?: string) => void;
    projectTypes: { id: string; name: string; code?: string | null }[];
    isLoading?: boolean;
}

export function AddProjectDialog({ isOpen, onClose, onSave, projectTypes, isLoading }: AddProjectDialogProps) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [projectTypeId, setProjectTypeId] = useState<string>("");

    const handleSave = () => {
        if (name.trim()) {
            const typeId = projectTypeId && projectTypeId !== "__none__" ? projectTypeId : undefined;
            onSave(name, code.trim() || undefined, typeId);
            setName("");
            setCode("");
            setProjectTypeId("");
            onClose();
        }
    };

    const handleClose = () => {
        setName("");
        setCode("");
        setProjectTypeId("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Proje Ekle</DialogTitle>
                    <DialogDescription>Bütçe sistemine yeni bir proje tanımlayın.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1 space-y-2">
                            <Label htmlFor="project-code">Proje Kodu</Label>
                            <Input 
                                id="project-code" 
                                placeholder="Örn: PRJ001" 
                                value={code} 
                                onChange={(e) => setCode(e.target.value)}
                                data-testid="input-project-code"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="project-name">Proje Adı</Label>
                            <Input 
                                id="project-name" 
                                placeholder="Örn: E-Ticaret Platformu" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                data-testid="input-project-name"
                            />
                        </div>
                    </div>
                    {projectTypes.length > 0 && (
                        <div className="space-y-2">
                            <Label>Proje Tipi (opsiyonel)</Label>
                            <Select value={projectTypeId || "__none__"} onValueChange={setProjectTypeId}>
                                <SelectTrigger data-testid="select-project-type">
                                    <SelectValue placeholder="Tip seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Tip seçilmedi (boş proje)</SelectItem>
                                    {projectTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name}{type.code ? ` (${type.code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Seçilen tipe göre varsayılan fazlar otomatik oluşturulur.
                            </p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>İptal</Button>
                    <Button onClick={handleSave} disabled={!name.trim()} data-testid="button-create-project">Oluştur</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
