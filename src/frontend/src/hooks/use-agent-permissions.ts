import { useCallback, useState } from "react";

import {
  getGrantAllPermissionsDefault,
  setGrantAllPermissionsDefault,
} from "@/lib/mcp";

/**
 * Browser-local default for pre-granting full read / write / execute
 * permissions in Copy for MCP payloads. Stored in localStorage — no
 * canister calls / zero cycles. Safe default is false (ask before writes).
 */
export function useAgentPermissions() {
  const [grantAllPermissions, setGrantAllState] = useState(() =>
    getGrantAllPermissionsDefault(),
  );

  const setGrantAllPermissions = useCallback((next: boolean) => {
    const saved = setGrantAllPermissionsDefault(next);
    setGrantAllState(saved);
    return saved;
  }, []);

  return {
    grantAllPermissions,
    setGrantAllPermissions,
  };
}
