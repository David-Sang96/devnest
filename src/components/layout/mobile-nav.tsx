"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { FileText, Columns3, Braces, KeyRound, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/json", label: "JSON", icon: Braces },
  { href: "/password", label: "Password", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-sidebar"
      aria-label="Mobile navigation"
    >
      {navItems.map(({ href, label, icon: Icon }, index) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <motion.div
            key={href}
            className="flex flex-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
          >
            <Link
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-sidebar-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5 shrink-0" />
              <span>{label}</span>
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
