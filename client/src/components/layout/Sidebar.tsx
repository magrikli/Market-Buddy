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
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { currentUser, logout } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!currentUser) return null;

  const navItems = [
    { href: "/", label: "Özet Paneli", icon: LayoutDashboard },
    { href: "/departments", label: "Departman Bütçesi", icon: Building2 },
    { href: "/projects", label: "Proje Bütçesi", icon: Briefcase },
    { href: "/transactions", label: "Harcama/Gelir", icon: Receipt },
    { href: "/reports", label: "Raporlar", icon: BarChart3 },
    ...(currentUser.role === 'admin' ? [{ href: "/admin", label: "Yönetim Paneli", icon: Settings }] : []),
  ];

  return (
    <div className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && <span className="font-bold text-xl text-primary tracking-tight">FinFlow</span>}
        {collapsed && <span className="font-bold text-xl text-primary mx-auto">FF</span>}
      </div>

      {/* Navigation */}
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

      {/* User & Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3 mb-4", collapsed && "justify-center")}>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <User className="h-4 w-4" />
            </div>
            {!collapsed && (
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{currentUser.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</span>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
              variant="outline" 
              size={collapsed ? "icon" : "sm"} 
              className={cn("flex-1 justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20", collapsed && "justify-center")}
              onClick={() => {
                  logout();
                  window.location.href = '/login';
              }}
          >
              <LogOut className="h-4 w-4 mr-2" />
              {!collapsed && "Çıkış Yap"}
          </Button>

          <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed(!collapsed)}
          >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
