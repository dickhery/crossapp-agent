import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMemo } from "react";

export type AuthState = {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  isLoginError: boolean;
  login: () => void;
  logout: () => void;
  principal: Principal | null;
  principalText: string | null;
  // Short, display-friendly principal prefix, e.g. "r7x4...-a3"
  principalShort: string | null;
};

// Thin wrapper around the platform II hook that exposes a stable auth surface
// to the rest of the app.
export function useAuth(): AuthState {
  const {
    identity,
    login,
    clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
  } = useInternetIdentity();

  const principal = useMemo(() => {
    if (!identity) return null;
    try {
      return identity.getPrincipal();
    } catch {
      return null;
    }
  }, [identity]);

  const principalText = useMemo(
    () => (principal ? principal.toString() : null),
    [principal],
  );

  const principalShort = useMemo(() => {
    if (!principalText) return null;
    if (principalText.length <= 12) return principalText;
    return `${principalText.slice(0, 5)}…${principalText.slice(-4)}`;
  }, [principalText]);

  return {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    login,
    logout: clear,
    principal,
    principalText,
    principalShort,
  };
}
