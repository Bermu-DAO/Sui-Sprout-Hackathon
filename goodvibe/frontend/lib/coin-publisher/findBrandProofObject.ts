import type { SuiClientTypes } from "@mysten/sui/client";

/**
 * Locates the one-time GoodVibeCoin proof object created in `init` after package publish.
 */
export function findBrandProofObjectId(
  tx: SuiClientTypes.Transaction<{ effects: true; objectTypes: true }>,
  pkgId: string,
  moduleName: string,
  structName: string,
  ownerAddress: string,
): string | null {
  const { effects, objectTypes } = tx;
  if (!effects?.changedObjects?.length || !objectTypes) return null;

  const ownerNorm = ownerAddress.toLowerCase();
  const expectedType = `${pkgId}::${moduleName}::${structName}`;

  for (const ch of effects.changedObjects) {
    if (ch.idOperation !== "Created") continue;
    const ty = objectTypes[ch.objectId];
    if (ty !== expectedType) continue;
    const out = ch.outputOwner;
    if (!out) continue;
    if (out.$kind === "AddressOwner" && out.AddressOwner.toLowerCase() === ownerNorm) {
      return ch.objectId;
    }
  }

  return null;
}
