export interface Vault {
  id: string;
  name: string;
  balance: bigint;
  donations: Record<string, number>; // ProjectID -> Percentage
  owner: string;
}
