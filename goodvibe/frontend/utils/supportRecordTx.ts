import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, STABLE_COIN_TYPE } from '@/config/sui';
import * as project from '@/lib/generated/goodvibe/project';
import * as supportRecord from '@/lib/generated/goodvibe/support_record';

export function buildCreateSupportRecordTx(senderAddress: string): Transaction {
  const tx = new Transaction();

  tx.add((tx) => {
    const [record] = supportRecord.createSupportRecord({ package: PACKAGE_ID })(tx);
    tx.transferObjects([record], tx.pure.address(senderAddress));
  });

  return tx;
}

export function buildStartSupportTx(
  projectId: string,
  supportRecordId: string,
  amount: bigint
): Transaction {
  const tx = new Transaction();

  tx.add(
    project.supportProject({
      package: PACKAGE_ID,
      arguments: {
        project: projectId,
        supportRecord: supportRecordId,
        amount,
      },
      typeArguments: [STABLE_COIN_TYPE],
    })
  );

  return tx;
}

export function buildIncreaseSupportTx(
  projectId: string,
  supportRecordId: string,
  additionalAmount: bigint
): Transaction {
  const tx = new Transaction();

  tx.add(
    project.increaseSupport({
      package: PACKAGE_ID,
      arguments: {
        project: projectId,
        supportRecord: supportRecordId,
        additionalAmount,
      },
      typeArguments: [STABLE_COIN_TYPE],
    })
  );

  return tx;
}

export function buildDecreaseSupportTx(
  projectId: string,
  supportRecordId: string,
  decreaseAmount: bigint
): Transaction {
  const tx = new Transaction();

  tx.add(
    project.decreaseSupport({
      package: PACKAGE_ID,
      arguments: {
        project: projectId,
        supportRecord: supportRecordId,
        decreaseAmount,
      },
      typeArguments: [STABLE_COIN_TYPE],
    })
  );

  return tx;
}

export function buildEndSupportTx(
  projectId: string,
  supportRecordId: string
): Transaction {
  const tx = new Transaction();

  tx.add(
    project.endSupport({
      package: PACKAGE_ID,
      arguments: {
        project: projectId,
        supportRecord: supportRecordId,
      },
      typeArguments: [STABLE_COIN_TYPE],
    })
  );

  return tx;
}
