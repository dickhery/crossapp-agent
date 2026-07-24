import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { APP_NAME, APP_SUBTITLE } from "@/lib/brand";

export function LoginScreen() {
  const { login, isLoggingIn, isLoginError, isAuthenticated, isInitializing } =
    useAuth();
  const navigate = useNavigate();

  // Belt-and-suspenders: if auth flips while we are still on /login (e.g. the
  // route guard has not re-run yet), navigate home ourselves.
  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      void navigate({ to: "/" });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  return (
    <main
      data-ocid="login.screen"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-12"
    >
      {/* Ambient gradient backdrop — subtle, on-brand cyan/blue on neutral */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 14%, transparent) 0%, transparent 70%), radial-gradient(40% 40% at 80% 100%, color-mix(in oklch, var(--primary) 8%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div
          className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-subtle"
          data-ocid="login.logo"
        >
          <Sparkles className="h-7 w-7 text-primary" aria-hidden />
        </div>

        <h1
          className="font-display text-3xl font-semibold tracking-tight text-foreground"
          data-ocid="login.title"
        >
          {APP_NAME}
        </h1>
        <p
          className="mt-3 text-sm leading-relaxed text-muted-foreground"
          data-ocid="login.subtitle"
        >
          {APP_SUBTITLE}
        </p>

        <ul
          data-ocid="login.highlights"
          className="mt-6 w-full space-y-2 rounded-xl border border-border bg-card/60 p-4 text-left text-sm text-muted-foreground"
        >
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Sign in to store Memory, plans, and workflows under your II
              principal.
            </span>
          </li>
          <li className="flex gap-2">
            <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Trust the IC MCP URL once, connect it in Grok (recommended) or
              Claude.
            </span>
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              After login: Setup → Memory → Chat → Copy for MCP into your AI
              agent.
            </span>
          </li>
        </ul>

        <div className="mt-8 w-full">
          <Button
            type="button"
            size="lg"
            data-ocid="login.signin_button"
            onClick={() => void login()}
            disabled={isLoggingIn || isInitializing}
            className="w-full"
          >
            {isLoggingIn || isInitializing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>
                  {isInitializing ? "Restoring session…" : "Connecting…"}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" aria-hidden />
                <span>Sign in with Internet Identity</span>
              </>
            )}
          </Button>

          {isLoginError && (
            <p
              role="alert"
              data-ocid="login.error"
              className="mt-4 flex items-center justify-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4" aria-hidden />
              Sign-in failed or was cancelled. Close any blocked pop-ups and try
              again.
            </p>
          )}
        </div>

        <p className="mt-8 max-w-sm text-xs leading-relaxed text-muted-foreground/80">
          A passkey popup from{" "}
          <span className="font-mono text-muted-foreground">id.ai</span> should
          open. If nothing happens, allow pop-ups for this site and retry.
        </p>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
          secured by the internet computer
        </p>
      </div>
    </main>
  );
}
