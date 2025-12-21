import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Building2, 
  Briefcase, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Key,
  Loader2,
  GitCommit
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { CompanySelector } from "./CompanySelector";

export function Sidebar() {
  const [location] = useLocation();
  const { currentUser, logout } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{ version: string; commitHash: string }>({ version: "", commitHash: "" });

  useEffect(() => {
    fetch("/api/version")
      .then(res => res.json())
      .then(data => setVersionInfo({ version: data.version || "", commitHash: data.commitHash || "" }))
      .catch(() => setVersionInfo({ version: "", commitHash: "" }));
  }, []);

  if (!currentUser) return null;

  const navItems = [
    { href: "/", label: "Özet Paneli", icon: LayoutDashboard },
    { href: "/departments", label: "Departman Bütçesi", icon: Building2 },
    { href: "/projects", label: "Proje Bütçesi", icon: Briefcase },
    { href: "/transactions", label: "Harcama/Gelir", icon: Receipt },
    { href: "/reports", label: "Raporlar", icon: BarChart3 },
    ...(currentUser.role === 'admin' ? [{ href: "/admin", label: "Yönetim Paneli", icon: Settings }] : []),
  ];

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yeni şifreler eşleşmiyor");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("Yeni şifre en az 4 karakter olmalı");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(currentUser.id, currentPassword, newPassword);
      toast.success("Şifre başarıyla değiştirildi");
      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Hata", { description: error.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {!collapsed && <span className="font-bold text-xl text-primary tracking-tight">FinFlow</span>}
          {collapsed && <span className="font-bold text-xl text-primary mx-auto">FF</span>}
        </div>
        {!collapsed && (versionInfo.version || versionInfo.commitHash) && (
          <span className="text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1" title={`v${versionInfo.version} (${versionInfo.commitHash})`}>
            {versionInfo.version && <span>v{versionInfo.version}</span>}
            {versionInfo.commitHash && (
              <>
                <GitCommit className="h-3 w-3" />
                {versionInfo.commitHash}
              </>
            )}
          </span>
        )}
      </div>

      <div className={cn("px-2 py-3 border-b border-sidebar-border", collapsed && "px-1")}>
        <CompanySelector collapsed={collapsed} />
      </div>

      <div className="flex-1 py-4 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "justify-start gap-3 h-auto py-2 px-2 hover:bg-sidebar-accent/50",
                  collapsed ? "w-full justify-center px-0" : "flex-1"
                )}
                data-testid="button-user-menu"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm font-medium truncate">{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{currentUser.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={collapsed ? "center" : "end"} side={collapsed ? "right" : "top"} className="w-48">
              <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)} data-testid="menu-change-password">
                <Key className="h-4 w-4 mr-2" />
                Şifre Değiştir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive" data-testid="menu-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            className={cn("h-8 w-8 text-muted-foreground hover:text-foreground shrink-0", collapsed && "w-full")}
            onClick={() => setCollapsed(!collapsed)}
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
            <DialogDescription>Güvenliğiniz için şifrenizi düzenli olarak değiştirin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mevcut Şifre</Label>
              <Input 
                id="current-password" 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="••••••••"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Yeni Şifre</Label>
              <Input 
                id="new-password" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="••••••••"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>İptal</Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword} data-testid="button-save-password">
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
