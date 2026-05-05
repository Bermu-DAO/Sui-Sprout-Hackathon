import { TEMPLATE_IDENTIFIERS } from "@/lib/coin-publisher/bytecode";

export type DeriveBrandIdentifiersResult =
  | { ok: true; base: string; moduleName: string; structName: string }
  | { ok: false; error: string };

/** Symbol -> fixed module/struct names. Validates the symbol is usable. */
export function deriveBrandIdentifiersFromSymbol(
  symbol: string
): DeriveBrandIdentifiersResult {
  const base = symbol.replace(/[^a-zA-Z0-9_]/g, "");
  if (!base.length) {
    return {
      ok: false,
      error: "Use letters, numbers, or underscores (emoji are removed)",
    };
  }
  if (!/^[a-zA-Z]/.test(base)) {
    return {
      ok: false,
      error: "Symbol must start with a letter (after removing emoji/special characters)",
    };
  }
  return {
    ok: true,
    base,
    moduleName: TEMPLATE_IDENTIFIERS.MODULE_NAME,
    structName: TEMPLATE_IDENTIFIERS.STRUCT_NAME,
  };
}
