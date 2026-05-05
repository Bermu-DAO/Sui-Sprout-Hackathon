import { Transaction } from '@mysten/sui/transactions';
import { StableLayerClient } from 'stable-layer-sdk';
import {
  PACKAGE_ID,
  PACKAGE_ID_LATEST,
  PLATFORM_ID,
  ADMIN_CAP_ID,
  USDC_TYPE,
} from '@/config/sui';
import * as project from '@/lib/generated/goodvibe/project';

export function buildCreateProjectTx(
  title: string,
  description: string,
  category: string,
  coverImageUrl: string,
  coinType: string
): Transaction {
  const tx = new Transaction();
  const titleBytes = Array.from(new TextEncoder().encode(title));
  const descBytes = Array.from(new TextEncoder().encode(description));
  const categoryBytes = Array.from(new TextEncoder().encode(category));
  const coverBytes = Array.from(new TextEncoder().encode(coverImageUrl));

  tx.add(
    project.createProject({
      package: PACKAGE_ID,
      arguments: {
        AdminCap: ADMIN_CAP_ID,
        platform: PLATFORM_ID,
        title: titleBytes,
        description: descBytes,
        category: categoryBytes,
        coverImageUrl: coverBytes,
      },
      typeArguments: [coinType],
    })
  );
  return tx;
}

export function buildCreateProjectAsCreatorTx(
  creatorCapId: string,
  title: string,
  description: string,
  category: string,
  coverImageUrl: string,
  coinType: string
): Transaction {
  const tx = new Transaction();
  const titleBytes = Array.from(new TextEncoder().encode(title));
  const descBytes = Array.from(new TextEncoder().encode(description));
  const categoryBytes = Array.from(new TextEncoder().encode(category));
  const coverBytes = Array.from(new TextEncoder().encode(coverImageUrl));

  tx.add(
    project.createProjectAsCreator({
      package: PACKAGE_ID_LATEST,
      arguments: {
        creatorCap: creatorCapId,
        platform: PLATFORM_ID,
        title: titleBytes,
        description: descBytes,
        category: categoryBytes,
        coverImageUrl: coverBytes,
      },
      typeArguments: [coinType],
    })
  );
  return tx;
}

export async function buildStartSupportingTx(
  client: StableLayerClient,
  suiClient: any,
  sender: string,
  projectId: string,
  supportRecordId: string,
  amount: bigint,
  stableCoinType: string,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(sender);

  const { objects } = await suiClient.listCoins({ owner: sender, coinType: USDC_TYPE });
  if (objects.length === 0) throw new Error('No USDC in wallet.');

  const [primaryCoin, ...otherCoins] = objects.map((coin: { objectId: string }) => coin.objectId);
  if (otherCoins.length > 0) {
    tx.mergeCoins(tx.object(primaryCoin), otherCoins.map((id: string) => tx.object(id)));
  }

  const [usdcCoin] = tx.splitCoins(tx.object(primaryCoin), [tx.pure.u64(amount)]);

  await client.buildMintTx({ tx, stableCoinType, usdcCoin, amount, sender, autoTransfer: true });

  tx.add(
    project.supportProject({
      package: PACKAGE_ID,
      arguments: { project: projectId, supportRecord: supportRecordId, amount },
      typeArguments: [stableCoinType],
    })
  );

  return tx;
}

export async function buildIncreaseSupportTx(
  client: StableLayerClient,
  suiClient: any,
  sender: string,
  projectId: string,
  supportRecordId: string,
  additionalAmount: bigint,
  stableCoinType: string,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(sender);

  const { objects } = await suiClient.listCoins({ owner: sender, coinType: USDC_TYPE });
  if (objects.length === 0) throw new Error('No USDC in wallet.');

  const [primaryCoin, ...otherCoins] = objects.map((coin: { objectId: string }) => coin.objectId);
  if (otherCoins.length > 0) {
    tx.mergeCoins(tx.object(primaryCoin), otherCoins.map((id: string) => tx.object(id)));
  }

  const [usdcCoin] = tx.splitCoins(tx.object(primaryCoin), [tx.pure.u64(additionalAmount)]);

  await client.buildMintTx({ tx, stableCoinType, usdcCoin, amount: additionalAmount, sender, autoTransfer: true });

  tx.add(
    project.increaseSupport({
      package: PACKAGE_ID,
      arguments: { project: projectId, supportRecord: supportRecordId, additionalAmount },
      typeArguments: [stableCoinType],
    })
  );

  return tx;
}

export async function buildWithdrawSupportTx(
  client: StableLayerClient,
  sender: string,
  projectId: string,
  supportRecordId: string,
  amount: bigint,
  stableCoinType: string,
): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(sender);

  tx.add(
    project.decreaseSupport({
      package: PACKAGE_ID,
      arguments: { project: projectId, supportRecord: supportRecordId, decreaseAmount: amount },
      typeArguments: [stableCoinType],
    })
  );

  await client.buildBurnTx({ tx, stableCoinType, amount, sender, autoTransfer: true });

  return tx;
}

export function buildPostUpdateTx(
  projectCapId: string,
  projectId: string,
  updateId: string,
  title: string,
  content: string,
  stableCoinType: string,
): Transaction {
  const tx = new Transaction();

  tx.add(
    project.postUpdate({
      package: PACKAGE_ID,
      arguments: {
        projectCap: projectCapId,
        project: projectId,
        updateId: Array.from(new TextEncoder().encode(updateId)),
        title: Array.from(new TextEncoder().encode(title)),
        content: Array.from(new TextEncoder().encode(content)),
      },
      typeArguments: [stableCoinType],
    })
  );

  return tx;
}
