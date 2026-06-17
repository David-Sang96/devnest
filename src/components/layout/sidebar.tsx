"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Columns3,
  Braces,
  KeyRound,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/json", label: "JSON Formatter", icon: Braces },
  { href: "/password", label: "Password Generator", icon: KeyRound },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 border-r border-border bg-sidebar shrink-0 h-full">
      <div className="px-4 py-5 border-b border-border">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          DevNest
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border flex items-center justify-between">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="size-4 shrink-0" />
          Settings
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
