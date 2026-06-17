import { Sidebar } from "./sidebar";
import { PageTransition } from "./page-transition";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
