import { Link, useRouterState } from "@tanstack/react-router";
import {
  Brain,
  History,
  LayoutDashboard,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  ocid: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, ocid: "nav.dashboard" },
  { to: "/chat", label: "Chat", icon: MessageSquare, ocid: "nav.chat" },
  {
    to: "/workflows",
    label: "Workflows",
    icon: Workflow,
    ocid: "nav.workflows",
  },
  { to: "/memory", label: "Memory", icon: Brain, ocid: "nav.memory" },
  { to: "/history", label: "History", icon: History, ocid: "nav.history" },
];

export function Sidebar() {
  const location = useRouterState({ select: (s) => s.location });
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <aside
      data-ocid="sidebar"
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
              CrossApp Agent
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              on-chain · icp
            </p>
          </div>
        )}
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              data-ocid={item.ocid}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          data-ocid="sidebar.collapse_toggle"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-foreground",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          )}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}

// Mobile sidebar — slides in as an overlay. Rendered by Layout when the
// viewport is narrow.
export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useRouterState({ select: (s) => s.location });
  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <div
      data-ocid="sidebar.mobile"
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        role="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close navigation"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-64 transform shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col border-r border-border bg-card">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <span className="font-display text-sm font-semibold tracking-tight text-foreground">
                CrossApp Agent
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              data-ocid="sidebar.mobile.close"
              aria-label="Close navigation"
              onClick={onClose}
              className="h-9 w-9"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <nav
            className="flex flex-1 flex-col gap-1 p-3"
            aria-label="Primary mobile"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-ocid={`${item.ocid}.mobile`}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
