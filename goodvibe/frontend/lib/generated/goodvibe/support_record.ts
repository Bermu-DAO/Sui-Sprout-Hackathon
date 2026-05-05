/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Support Record module - Manages user's support records for projects Users hold
 * btcUSDC in their wallet and record which projects they support
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/goodvibe::support_record';
export const SupportRecord = new MoveStruct({ name: `${$moduleName}::SupportRecord`, fields: {
        id: bcs.Address,
        owner: bcs.Address
    } });
export const ProjectSupport = new MoveStruct({ name: `${$moduleName}::ProjectSupport`, fields: {
        project_id: bcs.Address,
        amount: bcs.u64(),
        started_at: bcs.u64(),
        last_updated: bcs.u64()
    } });
export interface CreateSupportRecordOptions {
    package?: string;
    arguments?: [
    ];
}
/** Create a new support record Users call this once to create their record */
export function createSupportRecord(options: CreateSupportRecordOptions = {}) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'support_record',
        function: 'create_support_record',
    });
}
export interface IsSupportingArguments {
    record: RawTransactionArgument<string>;
    projectId: RawTransactionArgument<string>;
}
export interface IsSupportingOptions {
    package?: string;
    arguments: IsSupportingArguments | [
        record: RawTransactionArgument<string>,
        projectId: RawTransactionArgument<string>
    ];
}
/** Check if user is supporting a project */
export function isSupporting(options: IsSupportingOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["record", "projectId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'support_record',
        function: 'is_supporting',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface GetSupportAmountArguments {
    record: RawTransactionArgument<string>;
    projectId: RawTransactionArgument<string>;
}
export interface GetSupportAmountOptions {
    package?: string;
    arguments: GetSupportAmountArguments | [
        record: RawTransactionArgument<string>,
        projectId: RawTransactionArgument<string>
    ];
}
/** Get support amount for a project */
export function getSupportAmount(options: GetSupportAmountOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["record", "projectId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'support_record',
        function: 'get_support_amount',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface GetSupportDetailsArguments {
    record: RawTransactionArgument<string>;
    projectId: RawTransactionArgument<string>;
}
export interface GetSupportDetailsOptions {
    package?: string;
    arguments: GetSupportDetailsArguments | [
        record: RawTransactionArgument<string>,
        projectId: RawTransactionArgument<string>
    ];
}
/** Get support details (amount, started_at, last_updated) */
export function getSupportDetails(options: GetSupportDetailsOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        '0x2::object::ID'
    ] satisfies (string | null)[];
    const parameterNames = ["record", "projectId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'support_record',
        function: 'get_support_details',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface OwnerArguments {
    record: RawTransactionArgument<string>;
}
export interface OwnerOptions {
    package?: string;
    arguments: OwnerArguments | [
        record: RawTransactionArgument<string>
    ];
}
/** Get record owner */
export function owner(options: OwnerOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["record"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'support_record',
        function: 'owner',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}