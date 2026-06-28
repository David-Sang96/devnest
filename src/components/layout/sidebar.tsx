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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/kanban", label: "Kanban", icon: Columns3 },
  { href: "/json", label: "JSON Formatter", icon: Braces },
  { href: "/password", label: "Password Generator", icon: KeyRound },
];

const COLLAPSED_WIDTH = 52;
const MIN_WIDTH = 160;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 224;

export function Sidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const currentWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("devnest-sidebar-collapsed");
    if (savedCollapsed === "true") {
      setCollapsed(true);
    }
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

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("devnest-sidebar-collapsed", String(next));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (collapsed) return;
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
    if (collapsed) return;
    setWidth(DEFAULT_WIDTH);
    currentWidth.current = DEFAULT_WIDTH;
    localStorage.setItem("sidebar-width", String(DEFAULT_WIDTH));
  }

  const effectiveWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <TooltipProvider>
      <aside
        className="hidden md:flex flex-col bg-sidebar shrink-0 h-full relative transition-[width] duration-200 overflow-hidden"
        style={{ width: effectiveWidth }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-4 py-5 border-b border-border shrink-0"
        >
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight text-foreground whitespace-nowrap">
              DevNest
            </span>
          )}
        </motion.div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }, index) => {
            const active = isActive(href);
            const linkEl = (
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
                    "relative z-10 flex items-center rounded-md text-sm font-medium transition-colors",
                    collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                    active
                      ? "text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </motion.div>
            );

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkEl;
          })}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            "px-3 py-4 border-t border-border flex",
            collapsed ? "flex-col items-center gap-2" : "items-center justify-between"
          )}
        >
          {/* Settings */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={cn(
                    "relative flex items-center justify-center p-2 rounded-md text-sm font-medium transition-colors",
                    isActive("/settings")
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Settings className="size-4 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          ) : (
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
          )}

          <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "gap-1")}>
            <ThemeToggle />
            <button
              onClick={toggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronLeft className="size-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Resize handle — hidden when collapsed */}
        {!collapsed && (
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
        )}
      </aside>
    </TooltipProvider>
  );
}
