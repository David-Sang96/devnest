"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex flex-col w-56 border-r border-border bg-sidebar shrink-0 h-full">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="px-4 py-5 border-b border-border"
      >
        <span className="text-lg font-semibold tracking-tight text-foreground">
          DevNest
        </span>
      </motion.div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }, index) => {
          const active = isActive(href);
          return (
            <motion.div
              key={href}
              className="relative"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, duration: 0.22, ease: "easeOut" }}
            >
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-primary rounded-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Link
                href={href}
                className={cn(
                  "relative z-10 flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border flex items-center justify-between">
        <div className="relative">
          {isActive("/settings") && (
            <motion.div
              layoutId="active-nav"
              className="absolute inset-0 bg-primary rounded-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <Link
            href="/settings"
            className={cn(
              "relative z-10 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive("/settings")
                ? "text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="size-4 shrink-0" />
            Settings
          </Link>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
