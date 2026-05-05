/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/** Platform module - Manages the GoodVibe donation platform */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/goodvibe::platform';
export const PlatformAdminCap = new MoveStruct({ name: `${$moduleName}::PlatformAdminCap`, fields: {
        id: bcs.Address
    } });
export const DonationPlatform = new MoveStruct({ name: `${$moduleName}::DonationPlatform`, fields: {
        id: bcs.Address,
        admin: bcs.Address,
        total_projects_created: bcs.u64(),
        total_vaults_created: bcs.u64(),
        total_value_locked: bcs.u64(),
        created_at: bcs.u64()
    } });
export const PlatformCreated = new MoveStruct({ name: `${$moduleName}::PlatformCreated`, fields: {
        platform_id: bcs.Address,
        admin: bcs.Address,
        timestamp: bcs.u64()
    } });
export interface GetStatsArguments {
    platform: RawTransactionArgument<string>;
}
export interface GetStatsOptions {
    package?: string;
    arguments: GetStatsArguments | [
        platform: RawTransactionArgument<string>
    ];
}
/** Get platform statistics */
export function getStats(options: GetStatsOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["platform"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'platform',
        function: 'get_stats',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface GetAdminArguments {
    platform: RawTransactionArgument<string>;
}
export interface GetAdminOptions {
    package?: string;
    arguments: GetAdminArguments | [
        platform: RawTransactionArgument<string>
    ];
}
/** Get admin address */
export function getAdmin(options: GetAdminOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["platform"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'platform',
        function: 'get_admin',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}