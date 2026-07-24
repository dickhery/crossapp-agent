import { Actor, type ActorSubclass, type HttpAgent } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";

// Minimal ICRC-1 surface for read-only balance checks (no write paths).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idlFactory = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    icrc1_name: IDL.Func([], [IDL.Text], ["query"]),
    icrc1_symbol: IDL.Func([], [IDL.Text], ["query"]),
    icrc1_decimals: IDL.Func([], [IDL.Nat8], ["query"]),
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
  });
};

type Icrc1Service = {
  icrc1_name: () => Promise<string>;
  icrc1_symbol: () => Promise<string>;
  icrc1_decimals: () => Promise<number>;
  icrc1_balance_of: (account: {
    owner: Principal;
    subaccount: [] | [Uint8Array];
  }) => Promise<bigint>;
};

export type TokenBalance = {
  canisterId: string;
  name: string;
  symbol: string;
  decimals: number;
  raw: bigint;
  formatted: string;
  owner: string;
};

function formatUnits(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

export function createIcrc1Actor(
  agent: HttpAgent,
  canisterId: string,
): ActorSubclass<Icrc1Service> {
  return Actor.createActor(idlFactory, { agent, canisterId });
}

/** Query an ICRC-1 ledger for `owner`'s default-subaccount balance. */
export async function fetchIcrc1Balance(
  agent: HttpAgent,
  canisterId: string,
  owner: Principal,
): Promise<TokenBalance> {
  const actor = createIcrc1Actor(agent, canisterId);
  const [name, symbol, decimals, raw] = await Promise.all([
    actor.icrc1_name().catch(() => "Token"),
    actor.icrc1_symbol().catch(() => "TOKEN"),
    actor.icrc1_decimals().catch(() => 8),
    actor.icrc1_balance_of({ owner, subaccount: [] }),
  ]);
  const dec = Number(decimals);
  return {
    canisterId,
    name,
    symbol,
    decimals: dec,
    raw,
    formatted: formatUnits(raw, dec),
    owner: owner.toText(),
  };
}
