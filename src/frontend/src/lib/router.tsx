import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { Layout } from "@/components/Layout";
import { ChatPage } from "@/pages/ChatPage";
import DashboardPage from "@/pages/DashboardPage";
import { MemoryPage } from "@/pages/MemoryPage";
import { WorkflowEditPage } from "@/pages/WorkflowEditPage";
import { WorkflowsPage } from "@/pages/WorkflowsPage";

// Auth context for the router — unauthenticated users are bounced to the
// login screen rather than the protected layout.
type AppRouterContext = {
  auth: ReturnType<typeof useInternetIdentity>;
};

const rootRoute = createRootRouteWithContext<AppRouterContext>()({
  beforeLoad: ({ context, location }) => {
    const { isAuthenticated, isInitializing } = context.auth;
    if (isInitializing) return;
    if (!isAuthenticated && location.pathname !== "/login") {
      throw redirect({ to: "/login" });
    }
    if (isAuthenticated && location.pathname === "/login") {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
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

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    chatRoute,
    workflowsRoute,
    workflowEditRoute,
    memoryRoute,
    historyRoute,
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

// Inject the live auth context into the router once the provider mounts.
export function useSyncRouterAuth() {
  const auth = useInternetIdentity();
  // TanStack Router reads context on each render — updating it here keeps the
  // beforeLoad guard in sync with the live II state.
  router.update({ context: { auth } });
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
