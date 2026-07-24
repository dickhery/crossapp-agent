import { useCallback, useState } from "react";

import {
  DEFAULT_CONNECTOR_DISPLAY_NAME,
  getConnectorDisplayName,
  setConnectorDisplayName,
} from "@/lib/mcp";

/**
 * Browser-local MCP connector display name (e.g. "Agent Identity" in Grok).
 * Stored in localStorage — no canister calls / zero cycles.
 */
export function useConnectorDisplayName() {
  const [name, setNameState] = useState(() => getConnectorDisplayName());

  const save = useCallback((next: string) => {
    const saved = setConnectorDisplayName(next);
    setNameState(saved);
    return saved;
  }, []);

  const reset = useCallback(() => {
    const saved = setConnectorDisplayName("");
    setNameState(saved);
    return saved;
  }, []);

  return {
    connectorName: name,
    defaultName: DEFAULT_CONNECTOR_DISPLAY_NAME,
    saveConnectorName: save,
    resetConnectorName: reset,
  };
}
