/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/


/**
 * Project module - Manages crowdfunding projects with yield donation model Users
 * hold btcUSDC and donate yield to projects they support
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from './deps/sui/balance';
const $moduleName = '@local-pkg/goodvibe::project';
export const ProjectMetadata = new MoveStruct({ name: `${$moduleName}::ProjectMetadata`, fields: {
        title: bcs.vector(bcs.u8()),
        description: bcs.vector(bcs.u8()),
        category: bcs.vector(bcs.u8()),
        cover_image_url: bcs.vector(bcs.u8())
    } });
export const ProjectFinancial = new MoveStruct({ name: `${$moduleName}::ProjectFinancial<phantom T>`, fields: {
        balance: balance.Balance,
        total_received: bcs.u64(),
        total_support_amount: bcs.u64()
    } });
export const ProjectStats = new MoveStruct({ name: `${$moduleName}::ProjectStats`, fields: {
        supporter_count: bcs.u64(),
        is_active: bcs.bool(),
        created_at: bcs.u64()
    } });
export const Project = new MoveStruct({ name: `${$moduleName}::Project<phantom T>`, fields: {
        id: bcs.Address,
        creator: bcs.Address,
        metadata: ProjectMetadata,
        financial: ProjectFinancial,
        stats: ProjectStats
    } });
export const ProjectCap = new MoveStruct({ name: `${$moduleName}::ProjectCap`, fields: {
        id: bcs.Address,
        project_id: bcs.Address
    } });
export const ProjectCreatorCap = new MoveStruct({ name: `${$moduleName}::ProjectCreatorCap`, fields: {
        id: bcs.Address,
        max_projects: bcs.u64(),
        projects_created: bcs.u64()
    } });
export const ProjectUpdate = new MoveStruct({ name: `${$moduleName}::ProjectUpdate`, fields: {
        title: bcs.vector(bcs.u8()),
        content: bcs.vector(bcs.u8()),
        timestamp: bcs.u64(),
        author: bcs.Address
    } });
export const ProjectCreatedEvent = new MoveStruct({ name: `${$moduleName}::ProjectCreatedEvent`, fields: {
        project_id: bcs.Address,
        creator: bcs.Address,
        title: bcs.vector(bcs.u8()),
        category: bcs.vector(bcs.u8()),
        timestamp: bcs.u64()
    } });
export const SupportStartedEvent = new MoveStruct({ name: `${$moduleName}::SupportStartedEvent`, fields: {
        project_id: bcs.Address,
        supporter: bcs.Address,
        amount: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const SupportIncreasedEvent = new MoveStruct({ name: `${$moduleName}::SupportIncreasedEvent`, fields: {
        project_id: bcs.Address,
        supporter: bcs.Address,
        additional_amount: bcs.u64(),
        new_total: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const SupportDecreasedEvent = new MoveStruct({ name: `${$moduleName}::SupportDecreasedEvent`, fields: {
        project_id: bcs.Address,
        supporter: bcs.Address,
        decreased_amount: bcs.u64(),
        new_total: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const SupportEndedEvent = new MoveStruct({ name: `${$moduleName}::SupportEndedEvent`, fields: {
        project_id: bcs.Address,
        supporter: bcs.Address,
        timestamp: bcs.u64()
    } });
export const YieldDonatedEvent = new MoveStruct({ name: `${$moduleName}::YieldDonatedEvent`, fields: {
        project_id: bcs.Address,
        donor: bcs.Address,
        amount: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const DonationsWithdrawnEvent = new MoveStruct({ name: `${$moduleName}::DonationsWithdrawnEvent`, fields: {
        project_id: bcs.Address,
        creator: bcs.Address,
        amount: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const UpdatePostedEvent = new MoveStruct({ name: `${$moduleName}::UpdatePostedEvent`, fields: {
        project_id: bcs.Address,
        update_id: bcs.vector(bcs.u8()),
        title: bcs.vector(bcs.u8()),
        author: bcs.Address,
        timestamp: bcs.u64()
    } });
export const CreatorCapGrantedEvent = new MoveStruct({ name: `${$moduleName}::CreatorCapGrantedEvent`, fields: {
        cap_id: bcs.Address,
        recipient: bcs.Address,
        max_projects: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const CreatorCapRevokedEvent = new MoveStruct({ name: `${$moduleName}::CreatorCapRevokedEvent`, fields: {
        cap_id: bcs.Address,
        timestamp: bcs.u64()
    } });
export interface CreateProjectArguments {
    AdminCap: RawTransactionArgument<string>;
    platform: RawTransactionArgument<string>;
    title: RawTransactionArgument<number[]>;
    description: RawTransactionArgument<number[]>;
    category: RawTransactionArgument<number[]>;
    coverImageUrl: RawTransactionArgument<number[]>;
}
export interface CreateProjectOptions {
    package?: string;
    arguments: CreateProjectArguments | [
        AdminCap: RawTransactionArgument<string>,
        platform: RawTransactionArgument<string>,
        title: RawTransactionArgument<number[]>,
        description: RawTransactionArgument<number[]>,
        category: RawTransactionArgument<number[]>,
        coverImageUrl: RawTransactionArgument<number[]>
    ];
    typeArguments: [
        string
    ];
}
/** Create a new project Only platform admin can create projects */
export function createProject(options: CreateProjectOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'vector<u8>',
        'vector<u8>',
        'vector<u8>',
        'vector<u8>'
    ] satisfies (string | null)[];
    const parameterNames = ["AdminCap", "platform", "title", "description", "category", "coverImageUrl"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'create_project',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface GrantCreatorCapArguments {
    AdminCap: RawTransactionArgument<string>;
    maxProjects: RawTransactionArgument<number | bigint>;
    recipient: RawTransactionArgument<string>;
}
export interface GrantCreatorCapOptions {
    package?: string;
    arguments: GrantCreatorCapArguments | [
        AdminCap: RawTransactionArgument<string>,
        maxProjects: RawTransactionArgument<number | bigint>,
        recipient: RawTransactionArgument<string>
    ];
}
/** Admin grants a ProjectCreatorCap to an approved address */
export function grantCreatorCap(options: GrantCreatorCapOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        'u64',
        'address'
    ] satisfies (string | null)[];
    const parameterNames = ["AdminCap", "maxProjects", "recipient"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'grant_creator_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface RevokeCreatorCapArguments {
    AdminCap: RawTransactionArgument<string>;
    cap: RawTransactionArgument<string>;
}
export interface RevokeCreatorCapOptions {
    package?: string;
    arguments: RevokeCreatorCapArguments | [
        AdminCap: RawTransactionArgument<string>,
        cap: RawTransactionArgument<string>
    ];
}
/** Admin revokes (burns) a ProjectCreatorCap */
export function revokeCreatorCap(options: RevokeCreatorCapOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["AdminCap", "cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'revoke_creator_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface CreateProjectAsCreatorArguments {
    creatorCap: RawTransactionArgument<string>;
    platform: RawTransactionArgument<string>;
    title: RawTransactionArgument<number[]>;
    description: RawTransactionArgument<number[]>;
    category: RawTransactionArgument<number[]>;
    coverImageUrl: RawTransactionArgument<number[]>;
}
export interface CreateProjectAsCreatorOptions {
    package?: string;
    arguments: CreateProjectAsCreatorArguments | [
        creatorCap: RawTransactionArgument<string>,
        platform: RawTransactionArgument<string>,
        title: RawTransactionArgument<number[]>,
        description: RawTransactionArgument<number[]>,
        category: RawTransactionArgument<number[]>,
        coverImageUrl: RawTransactionArgument<number[]>
    ];
    typeArguments: [
        string
    ];
}
/** Holder of ProjectCreatorCap can create a project */
export function createProjectAsCreator(options: CreateProjectAsCreatorOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'vector<u8>',
        'vector<u8>',
        'vector<u8>',
        'vector<u8>'
    ] satisfies (string | null)[];
    const parameterNames = ["creatorCap", "platform", "title", "description", "category", "coverImageUrl"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'create_project_as_creator',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface GetCreatorCapInfoArguments {
    cap: RawTransactionArgument<string>;
}
export interface GetCreatorCapInfoOptions {
    package?: string;
    arguments: GetCreatorCapInfoArguments | [
        cap: RawTransactionArgument<string>
    ];
}
/** Query: get creator cap info (max_projects, projects_created) */
export function getCreatorCapInfo(options: GetCreatorCapInfoOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["cap"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'get_creator_cap_info',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}
export interface SupportProjectArguments {
    project: RawTransactionArgument<string>;
    supportRecord: RawTransactionArgument<string>;
    amount: RawTransactionArgument<number | bigint>;
}
export interface SupportProjectOptions {
    package?: string;
    arguments: SupportProjectArguments | [
        project: RawTransactionArgument<string>,
        supportRecord: RawTransactionArgument<string>,
        amount: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Start supporting a project (record only, no funds transfer) User mints btcUSDC
 * and keeps it in their wallet
 */
export function supportProject(options: SupportProjectOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["project", "supportRecord", "amount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'support_project',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface IncreaseSupportArguments {
    project: RawTransactionArgument<string>;
    supportRecord: RawTransactionArgument<string>;
    additionalAmount: RawTransactionArgument<number | bigint>;
}
export interface IncreaseSupportOptions {
    package?: string;
    arguments: IncreaseSupportArguments | [
        project: RawTransactionArgument<string>,
        supportRecord: RawTransactionArgument<string>,
        additionalAmount: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
/** Increase support amount */
export function increaseSupport(options: IncreaseSupportOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["project", "supportRecord", "additionalAmount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'increase_support',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface DecreaseSupportArguments {
    project: RawTransactionArgument<string>;
    supportRecord: RawTransactionArgument<string>;
    decreaseAmount: RawTransactionArgument<number | bigint>;
}
export interface DecreaseSupportOptions {
    package?: string;
    arguments: DecreaseSupportArguments | [
        project: RawTransactionArgument<string>,
        supportRecord: RawTransactionArgument<string>,
        decreaseAmount: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
/** Decrease support amount (when user burns some btcUSDC) */
export function decreaseSupport(options: DecreaseSupportOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["project", "supportRecord", "decreaseAmount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'decrease_support',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface EndSupportArguments {
    project: RawTransactionArgument<string>;
    supportRecord: RawTransactionArgument<string>;
}
export interface EndSupportOptions {
    package?: string;
    arguments: EndSupportArguments | [
        project: RawTransactionArgument<string>,
        supportRecord: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** End support for a project */
export function endSupport(options: EndSupportOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["project", "supportRecord"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'end_support',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface DonateYieldArguments {
    project: RawTransactionArgument<string>;
    yieldCoin: RawTransactionArgument<string>;
}
export interface DonateYieldOptions {
    package?: string;
    arguments: DonateYieldArguments | [
        project: RawTransactionArgument<string>,
        yieldCoin: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Donate yield to a project Called after user claims yield from Stable Layer */
export function donateYield(options: DonateYieldOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    const parameterNames = ["project", "yieldCoin"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'donate_yield',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface WithdrawDonationsArguments {
    projectCap: RawTransactionArgument<string>;
    project: RawTransactionArgument<string>;
    amount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawDonationsOptions {
    package?: string;
    arguments: WithdrawDonationsArguments | [
        projectCap: RawTransactionArgument<string>,
        project: RawTransactionArgument<string>,
        amount: RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Withdraw accumulated donations Only project creator (with ProjectCap) can call
 * this
 */
export function withdrawDonations(options: WithdrawDonationsOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    const parameterNames = ["projectCap", "project", "amount"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'withdraw_donations',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface UpdateProjectMetadataArguments {
    projectCap: RawTransactionArgument<string>;
    project: RawTransactionArgument<string>;
    title: RawTransactionArgument<number[]>;
    description: RawTransactionArgument<number[]>;
    category: RawTransactionArgument<number[]>;
    coverImageUrl: RawTransactionArgument<number[]>;
}
export interface UpdateProjectMetadataOptions {
    package?: string;
    arguments: UpdateProjectMetadataArguments | [
        projectCap: RawTransactionArgument<string>,
        project: RawTransactionArgument<string>,
        title: RawTransactionArgument<number[]>,
        description: RawTransactionArgument<number[]>,
        category: RawTransactionArgument<number[]>,
        coverImageUrl: RawTransactionArgument<number[]>
    ];
    typeArguments: [
        string
    ];
}
/** Update project metadata (owner only) */
export function updateProjectMetadata(options: UpdateProjectMetadataOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'vector<u8>',
        'vector<u8>',
        'vector<u8>',
        'vector<u8>'
    ] satisfies (string | null)[];
    const parameterNames = ["projectCap", "project", "title", "description", "category", "coverImageUrl"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'update_project_metadata',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface PostUpdateArguments {
    projectCap: RawTransactionArgument<string>;
    project: RawTransactionArgument<string>;
    updateId: RawTransactionArgument<number[]>;
    title: RawTransactionArgument<number[]>;
    content: RawTransactionArgument<number[]>;
}
export interface PostUpdateOptions {
    package?: string;
    arguments: PostUpdateArguments | [
        projectCap: RawTransactionArgument<string>,
        project: RawTransactionArgument<string>,
        updateId: RawTransactionArgument<number[]>,
        title: RawTransactionArgument<number[]>,
        content: RawTransactionArgument<number[]>
    ];
    typeArguments: [
        string
    ];
}
/** Post a progress update Only visible to supporters (checked in frontend) */
export function postUpdate(options: PostUpdateOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        null,
        'vector<u8>',
        'vector<u8>',
        'vector<u8>'
    ] satisfies (string | null)[];
    const parameterNames = ["projectCap", "project", "updateId", "title", "content"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'post_update',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface GetInfoArguments {
    project: RawTransactionArgument<string>;
}
export interface GetInfoOptions {
    package?: string;
    arguments: GetInfoArguments | [
        project: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/** Get project basic info */
export function getInfo(options: GetInfoOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["project"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'get_info',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface GetFinancialInfoArguments {
    project: RawTransactionArgument<string>;
}
export interface GetFinancialInfoOptions {
    package?: string;
    arguments: GetFinancialInfoArguments | [
        project: RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
/**
 * Get project financial info Returns: (balance, total_received,
 * total_support_amount, supporter_count)
 */
export function getFinancialInfo(options: GetFinancialInfoOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["project"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'get_financial_info',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface GetUpdateArguments {
    project: RawTransactionArgument<string>;
    updateId: RawTransactionArgument<number[]>;
}
export interface GetUpdateOptions {
    package?: string;
    arguments: GetUpdateArguments | [
        project: RawTransactionArgument<string>,
        updateId: RawTransactionArgument<number[]>
    ];
    typeArguments: [
        string
    ];
}
/** Get a specific update */
export function getUpdate(options: GetUpdateOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        'vector<u8>'
    ] satisfies (string | null)[];
    const parameterNames = ["project", "updateId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'get_update',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface HasUpdateArguments {
    project: RawTransactionArgument<string>;
    updateId: RawTransactionArgument<number[]>;
}
export interface HasUpdateOptions {
    package?: string;
    arguments: HasUpdateArguments | [
        project: RawTransactionArgument<string>,
        updateId: RawTransactionArgument<number[]>
    ];
    typeArguments: [
        string
    ];
}
/** Check if update exists */
export function hasUpdate(options: HasUpdateOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null,
        'vector<u8>'
    ] satisfies (string | null)[];
    const parameterNames = ["project", "updateId"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'has_update',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
        typeArguments: options.typeArguments
    });
}
export interface GetUpdateDetailsArguments {
    update: RawTransactionArgument<string>;
}
export interface GetUpdateDetailsOptions {
    package?: string;
    arguments: GetUpdateDetailsArguments | [
        update: RawTransactionArgument<string>
    ];
}
/** Get update details */
export function getUpdateDetails(options: GetUpdateDetailsOptions) {
    const packageAddress = options.package ?? '@local-pkg/goodvibe';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    const parameterNames = ["update"];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'project',
        function: 'get_update_details',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
    });
}