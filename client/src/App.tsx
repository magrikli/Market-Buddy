import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import { useStore } from "./lib/store";

// Import real pages
import Dashboard from "@/pages/Dashboard";
import DepartmentBudget from "@/pages/DepartmentBudget";
import ProjectBudget from "@/pages/ProjectBudget";
import Transactions from "@/pages/Transactions";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";

function Router() {
  const { currentUser } = useStore();

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
