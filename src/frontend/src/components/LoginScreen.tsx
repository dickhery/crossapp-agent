import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Loader2, ShieldCheck, Sparkles } from "lucide-react";

export function LoginScreen() {
  const { login, isLoggingIn, isLoginError } = useAuth();

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

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
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
          CrossApp Agent
        </h1>
        <p
          className="mt-3 text-sm leading-relaxed text-muted-foreground"
          data-ocid="login.subtitle"
        >
          Your on-chain operator for cross-dapp workflows. Sign in with Internet
          Identity to access your plans, memory, and history.
        </p>

        <div className="mt-10 w-full">
          <Button
            type="button"
            size="lg"
            data-ocid="login.signin_button"
            onClick={() => void login()}
            disabled={isLoggingIn}
            className="w-full"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Connecting…</span>
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
              Sign-in failed. Please try again.
            </p>
          )}
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
          secured by the internet computer
        </p>
      </div>
    </main>
  );
}
