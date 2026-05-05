import { Transaction } from '@mysten/sui/transactions';
import { StableLayerClient } from 'stable-layer-sdk';
import { PACKAGE_ID } from '@/config/sui';
import * as project from '@/lib/generated/goodvibe/project';

export async function buildClaimYieldTx(
  client: StableLayerClient,
  sender: string,
  stableCoinType: string,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(sender);

  await client.buildClaimTx({ tx, stableCoinType, sender, autoTransfer: true });

  return tx;
}

export async function buildDonateYieldTx(
  client: StableLayerClient,
  sender: string,
  projectId: string,
  stableCoinType: string,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(sender);

  const yieldCoin = await client.buildClaimTx({ tx, stableCoinType, sender, autoTransfer: false });
  if (!yieldCoin) throw new Error('No yield available to claim');

  tx.add(
    project.donateYield({
      package: PACKAGE_ID,
      arguments: { project: projectId, yieldCoin },
      typeArguments: [stableCoinType],
    })
  );

  return tx;
}

export function buildWithdrawProjectDonationsTx(
  projectCapId: string,
  projectId: string,
  amount: bigint,
  recipientAddress: string,
  stableCoinType: string,
): Transaction {
  const tx = new Transaction();

  tx.add((tx) => {
    const [coin] = project.withdrawDonations({
      package: PACKAGE_ID,
      arguments: { projectCap: projectCapId, project: projectId, amount },
      typeArguments: [stableCoinType],
    })(tx);
    tx.transferObjects([coin], tx.pure.address(recipientAddress));
  });

  return tx;
}

export async function buildWithdrawAndBurnTx(
  client: StableLayerClient,
  projectCapId: string,
  projectId: string,
  amount: bigint,
  stableCoinType: string,
): Promise<Transaction> {
  const tx = new Transaction();

  tx.add(
    project.withdrawDonations({
      package: PACKAGE_ID,
      arguments: { projectCap: projectCapId, project: projectId, amount },
      typeArguments: [stableCoinType],
    })
  );

  await client.buildBurnTx({ tx, stableCoinType, amount, autoTransfer: true });

  return tx;
}
