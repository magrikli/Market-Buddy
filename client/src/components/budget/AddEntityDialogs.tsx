import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
