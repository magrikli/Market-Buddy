import { useState } from "react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("admin"); // Default for demo
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useStore();
  const [_, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate network delay
    setTimeout(() => {
      const success = login(username);
      if (success) {
        setLocation("/");
      } else {
        setError("Kullanıcı adı bulunamadı. (Demo: 'admin' veya 'it_manager' deneyin)");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">FinFlow'a Hoşgeldiniz</CardTitle>
          <CardDescription>
            Devam etmek için lütfen giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                placeholder="kullanici_adi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value="password" // Mock password
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground text-right">Demo modu: Şifre gerekmez</p>
            </div>
            
            {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                    {error}
                </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Hızlı Giriş (Demo)
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" type="button" onClick={() => setUsername("admin")} className="text-xs">
                    Admin
                </Button>
                <Button variant="outline" type="button" onClick={() => setUsername("it_manager")} className="text-xs">
                    IT Manager
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
