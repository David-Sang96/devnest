import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { PageTransition } from "./page-transition";
import { CommandPalette } from "@/components/command-palette/command-palette";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
