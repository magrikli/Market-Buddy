import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useStore } from "@/lib/store";
import { Redirect } from "wouter";
import * as api from "@/lib/api";

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, setUser } = useStore();

  // Verify session with server on mount - this ensures the session cookie is active
  useEffect(() => {
    if (currentUser) {
      api.getCurrentUser()
        .then(({ user }) => {
          // Session is valid, update user data if needed
          setUser(user);
        })
        .catch(() => {
          // Session expired or invalid - user will be redirected to login
          setUser(null);
        });
    }
  }, []); // Run once on mount

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="h-full p-8 w-full">
            {children}
        </div>
      </main>
    </div>
  );
}
