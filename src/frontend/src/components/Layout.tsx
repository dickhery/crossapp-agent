import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2, LogOut, Menu } from "lucide-react";
import { type ReactNode, useState } from "react";

import { MobileSidebar, Sidebar } from "@/components/Sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { MCP_DOCS_URL } from "@/lib/mcp";

function PrincipalBadge() {
  const { principalText, principalShort } = useAuth();

  if (!principalText) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-ocid="header.principal_menu"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Avatar className="h-7 w-7" data-ocid="header.avatar">
            <AvatarFallback className="bg-primary/10 text-[10px] font-mono text-primary">
              {principalShort?.slice(0, 2).toUpperCase() ?? "II"}
            </AvatarFallback>
          </Avatar>
          <span
            className="hidden font-mono text-xs text-muted-foreground sm:inline"
            data-ocid="header.principal_short"
          >
            {principalShort}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72"
        data-ocid="header.principal_menu_content"
      >
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Signed in as
        </DropdownMenuLabel>
        <div className="px-2 py-1.5">
          <p
            className="break-all font-mono text-[11px] leading-relaxed text-foreground"
            data-ocid="header.principal_full"
          >
            {principalText}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { logout, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });

  const routeTitle = (() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path === "/setup") return "Setup";
    if (path.startsWith("/workflows/") && path !== "/workflows")
      return "Edit Workflow";
    const seg = path.split("/")[1] ?? "";
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  })();

  return (
    <header
      data-ocid="header"
      className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6"
    >
      <Button
        variant="ghost"
        size="icon"
        data-ocid="header.mobile_menu_button"
        aria-label="Open navigation"
        onClick={onOpenMobile}
        className="h-9 w-9 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>

      <h1
        className="font-display text-base font-semibold tracking-tight text-foreground"
        data-ocid="header.route_title"
      >
        {routeTitle}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        {isInitializing ? (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-label="Initializing session"
          />
        ) : (
          <PrincipalBadge />
        )}

        <Button
          variant="ghost"
          size="sm"
          data-ocid="header.logout_button"
          aria-label="Sign out"
          onClick={() => {
            void logout();
            void navigate({ to: "/login" });
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      data-ocid="layout"
      className="flex h-dvh w-full overflow-hidden bg-background text-foreground"
    >
      {/* Desktop sidebar — fixed width, hidden on small screens */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <main
          data-ocid="main"
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <footer
          data-ocid="footer"
          className="border-t border-border bg-card px-4 py-3 sm:px-6"
        >
          <p className="text-center font-mono text-[11px] text-muted-foreground/70">
            IC MCP ·{" "}
            <a
              href={MCP_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              mcp.internetcomputer.org
            </a>
            {" · "}
            Built with{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.hostname : "",
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
