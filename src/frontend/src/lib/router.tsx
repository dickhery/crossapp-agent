import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { Layout } from "@/components/Layout";
import { ChatPage } from "@/pages/ChatPage";
import DashboardPage from "@/pages/DashboardPage";
import { MemoryPage } from "@/pages/MemoryPage";
import { SetupPage } from "@/pages/SetupPage";
import { WorkflowEditPage } from "@/pages/WorkflowEditPage";
import { WorkflowsPage } from "@/pages/WorkflowsPage";

// Auth context for the router — unauthenticated users are bounced to the
// login screen rather than the protected layout.
type AppRouterContext = {
  auth: ReturnType<typeof useInternetIdentity>;
};

function AuthBootScreen() {
  return (
    <main
      data-ocid="auth.boot_screen"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6"
    >
      <Loader2
        className="h-6 w-6 animate-spin text-primary"
        aria-label="Restoring session"
      />
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Restoring your Internet Identity session…
      </p>
    </main>
  );
}

const rootRoute = createRootRouteWithContext<AppRouterContext>()({
  beforeLoad: ({ context, location }) => {
    const { isAuthenticated, isInitializing } = context.auth;
    // Stay put while the II client hydrates from IndexedDB — do not bounce
    // to /login mid-restore (that is the classic "stuck after refresh" bug).
    if (isInitializing) return;
    if (!isAuthenticated && location.pathname !== "/login") {
      throw redirect({ to: "/login" });
    }
    if (isAuthenticated && location.pathname === "/login") {
      throw redirect({ to: "/" });
    }
  },
  component: function RootComponent() {
    const auth = useInternetIdentity();
    // While auth is still restoring, render a dedicated boot screen instead of
    // the protected layout (which would fire owner-scoped queries and hang).
    if (auth.isInitializing) {
      return <AuthBootScreen />;
    }
    return <Outlet />;
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => <LoginRoute />,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: () => <DashboardPage />,
});

const chatRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/chat",
  validateSearch: (search: Record<string, unknown>) => ({
    historyId:
      typeof search.historyId === "string" ? search.historyId : undefined,
    plan: typeof search.plan === "string" ? search.plan : undefined,
  }),
  component: () => <ChatPage />,
});

const workflowsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/workflows",
  component: () => <WorkflowsPage />,
});

const workflowEditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/workflows/$id",
  component: () => <WorkflowEditPage />,
});

const memoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/memory",
  component: () => <MemoryPage />,
});

const historyRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/history",
  component: () => <HistoryPage />,
});

const setupRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/setup",
  component: () => <SetupPage />,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    chatRoute,
    workflowsRoute,
    workflowEditRoute,
    memoryRoute,
    historyRoute,
    setupRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: {
    auth: {
      identity: undefined,
      login: async () => {},
      clear: async () => {},
      isAuthenticated: false,
      isInitializing: true,
      isLoggingIn: false,
      isLoginError: false,
      isLoginIdle: false,
      isLoginSuccess: false,
      loginStatus: "initializing" as never,
    },
  },
});

// Inject the live auth context into the router once the provider mounts, and
// invalidate the route tree whenever auth settles or the signed-in bit flips.
// Without invalidate(), beforeLoad does not re-run after login — the UI looks
// "stuck" on the login screen even though II succeeded.
export function useSyncRouterAuth() {
  const auth = useInternetIdentity();
  const prev = useRef({
    isAuthenticated: auth.isAuthenticated,
    isInitializing: auth.isInitializing,
  });

  useEffect(() => {
    router.update({ context: { auth } });

    const changed =
      prev.current.isAuthenticated !== auth.isAuthenticated ||
      prev.current.isInitializing !== auth.isInitializing;

    if (changed) {
      prev.current = {
        isAuthenticated: auth.isAuthenticated,
        isInitializing: auth.isInitializing,
      };
      void router.invalidate();
    }
  }, [auth]);
}

// Lazy import to avoid a circular dependency at module load time.
import { LoginScreen } from "@/components/LoginScreen";
import { HistoryPage } from "@/pages/HistoryPage";
function LoginRoute() {
  return <LoginScreen />;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
