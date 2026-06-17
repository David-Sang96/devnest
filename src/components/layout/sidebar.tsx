"use client";

import { useState, useRef, useEffect } from "react";
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

const MIN_WIDTH = 160;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 224;

export function Sidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const currentWidth = useRef(DEFAULT_WIDTH);

  // Load persisted width after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) {
        const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
        setWidth(clamped);
        currentWidth.current = clamped;
      }
    }
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = currentWidth.current;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(e: MouseEvent) {
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + e.clientX - startX)
      );
      currentWidth.current = newWidth;
      setWidth(newWidth);
    }

    function onMouseUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("sidebar-width", String(currentWidth.current));
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function handleDoubleClick() {
    setWidth(DEFAULT_WIDTH);
    currentWidth.current = DEFAULT_WIDTH;
    localStorage.setItem("sidebar-width", String(DEFAULT_WIDTH));
  }

  return (
    <aside
      className="hidden md:flex flex-col bg-sidebar shrink-0 h-full relative"
      style={{ width }}
    >
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
                <span className="truncate">{label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border flex items-center justify-between">
        <div className="relative min-w-0">
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
            <span className="truncate">Settings</span>
          </Link>
        </div>
        <ThemeToggle />
      </div>

      {/* Resize handle — motion parent propagates "hovered" variant to child */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize · Double-click to reset"
        initial="idle"
        whileHover="hovered"
      >
        <motion.div
          className="absolute inset-y-0 right-0 w-px bg-border group-hover:bg-primary/60 transition-colors duration-150"
          variants={{
            idle: { scaleX: 1 },
            hovered: { scaleX: 3 },
          }}
          style={{ transformOrigin: "right" }}
          transition={{ duration: 0.15 }}
        />
      </motion.div>
    </aside>
  );
}
