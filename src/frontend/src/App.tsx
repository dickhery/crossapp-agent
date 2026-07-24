import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/use-auth";
import { router, useSyncRouterAuth } from "@/lib/router";

// Inner component that lives inside the II provider so it can read live auth
// state and push it into the router context on every render.
function AuthedRouter() {
  useSyncRouterAuth();
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthedRouter />
      <Toaster position="bottom-right" richColors closeButton />
    </ThemeProvider>
  );
}

// Re-export for any consumer that wants the auth hook directly.
export { useAuth };
