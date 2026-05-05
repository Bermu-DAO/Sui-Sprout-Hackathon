import { deriveBrandIdentifiersFromSymbol } from "@/lib/coin-publisher/brandIdentifiers";

export interface CreateBrandFormData {
  name: string;
  symbol: string;
  description: string;
  iconUrl: string;
  maxSupply: string;
}

export type CreateBrandFormErrors = Partial<
  Record<keyof CreateBrandFormData, string>
>;

export function isValidTokenNameTrimmed(trimmed: string): boolean {
  return /[\p{L}\p{N}]/u.test(trimmed);
}

export function getCreateBrandFormErrors(
  data: CreateBrandFormData
): CreateBrandFormErrors {
  const next: CreateBrandFormErrors = {};
  const nameTrim = data.name.trim();
  if (!nameTrim) next.name = "Name is required";
  else if (!isValidTokenNameTrimmed(nameTrim)) {
    next.name = "Name must include at least one letter or number";
  }
  if (!data.symbol.trim()) next.symbol = "Symbol is required";
  else {
    const derived = deriveBrandIdentifiersFromSymbol(data.symbol);
    if (!derived.ok) {
      next.symbol = derived.error;
    }
  }
  if (!data.description.trim()) next.description = "Description is required";
  if (!next.name && !next.symbol && !next.description) {
    const s = data.symbol.trim();
    const n = nameTrim;
    const d = data.description.trim();
    if (s && n && d && s === n && n === d) {
      next.description =
        "Name, symbol, and description cannot all be identical.";
    }
  }
  if (!data.iconUrl.trim()) next.iconUrl = "Icon URL is required";
  const maxRaw = data.maxSupply?.trim() ?? "";
  if (!maxRaw) {
    next.maxSupply = "Max supply is required";
  } else if (!/^\d+(\.\d+)?$/.test(maxRaw)) {
    next.maxSupply = "Enter a valid positive number";
  } else if (Number(maxRaw) <= 0) {
    next.maxSupply = "Max supply must be greater than 0";
  }
  return next;
}

export function isCreateBrandFormValid(data: CreateBrandFormData): boolean {
  return Object.keys(getCreateBrandFormErrors(data)).length === 0;
}
