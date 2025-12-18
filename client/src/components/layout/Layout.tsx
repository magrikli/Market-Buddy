import { Sidebar } from "./Sidebar";
import { useStore } from "@/lib/store";
import { Redirect } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="h-full p-8 max-w-7xl mx-auto w-full ml-[80.5px] mr-[80.5px]">
            {children}
        </div>
      </main>
    </div>
  );
}
