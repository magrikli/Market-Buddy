import { Switch, Route } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import { useStore } from "./lib/store";
import { getCurrentUser } from "./lib/api";
import { useEffect } from "react";

// Import real pages
import Dashboard from "@/pages/Dashboard";
import DepartmentBudget from "@/pages/DepartmentBudget";
import ProjectBudget from "@/pages/ProjectBudget";
import Transactions from "@/pages/Transactions";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";

function Router() {
  const { currentUser, setUser } = useStore();
  
  // Restore session on mount
  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (data?.user) {
      setUser(data.user);
    }
  }, [data, setUser]);

  // Show loading while checking session (but not on error - that means not logged in)
  if (isLoading && !isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        <Layout>
            <Dashboard />
        </Layout>
      </Route>
      <Route path="/departments">
        <Layout>
            <DepartmentBudget />
        </Layout>
      </Route>
      <Route path="/projects">
        <Layout>
            <ProjectBudget />
        </Layout>
      </Route>
      <Route path="/transactions">
        <Layout>
            <Transactions />
        </Layout>
      </Route>
      <Route path="/reports">
        <Layout>
            <Reports />
        </Layout>
      </Route>
      <Route path="/admin">
        <Layout>
            <Admin />
        </Layout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
