/// Project module - Manages crowdfunding projects with yield donation model
/// Users hold btcUSDC and donate yield to projects they support
module goodvibe::project;

use sui::coin::Coin;
use sui::balance::{Self, Balance};
use sui::event;
use sui::dynamic_field as df;
use goodvibe::platform::{Self, DonationPlatform, PlatformAdminCap};
use goodvibe::support_record::{Self, SupportRecord};

// ==================== Structs ====================

/// Project metadata
public struct ProjectMetadata has store {
    title: vector<u8>,
    description: vector<u8>,
    category: vector<u8>,
    cover_image_url: vector<u8>,
}

/// Project financial data
public struct ProjectFinancial<phantom T> has store {
    balance: Balance<T>,              // Actual donations received (yield from supporters)
    total_received: u64,               // Total yield donations received
    total_support_amount: u64,         // Recorded total support amount (for statistics)
}

/// Project statistics
public struct ProjectStats has store {
    supporter_count: u64,
    is_active: bool,
    created_at: u64,
}

/// Project - a crowdfunding initiative
public struct Project<phantom T> has key {
    id: UID,
    creator: address,
    metadata: ProjectMetadata,
    financial: ProjectFinancial<T>,
    stats: ProjectStats,
}

/// Project capability - proves ownership
public struct ProjectCap has key, store {
    id: UID,
    project_id: ID,
}

/// Creator capability - allows holder to create projects without admin
/// Issued by platform admin to approved addresses
public struct ProjectCreatorCap has key, store {
    id: UID,
    max_projects: u64,       // 0 = unlimited
    projects_created: u64,
}

/// Project update - stored as dynamic field
public struct ProjectUpdate has store, drop {
    title: vector<u8>,
    content: vector<u8>,
    timestamp: u64,
    author: address,
}

// ==================== Events ====================

public struct ProjectCreatedEvent has copy, drop {
    project_id: ID,
    creator: address,
    title: vector<u8>,
    category: vector<u8>,
    timestamp: u64,
}

public struct SupportStartedEvent has copy, drop {
    project_id: ID,
    supporter: address,
    amount: u64,
    timestamp: u64,
}

public struct SupportIncreasedEvent has copy, drop {
    project_id: ID,
    supporter: address,
    additional_amount: u64,
    new_total: u64,
    timestamp: u64,
}

public struct SupportDecreasedEvent has copy, drop {
    project_id: ID,
    supporter: address,
    decreased_amount: u64,
    new_total: u64,
    timestamp: u64,
}

public struct SupportEndedEvent has copy, drop {
    project_id: ID,
    supporter: address,
    timestamp: u64,
}

public struct YieldDonatedEvent has copy, drop {
    project_id: ID,
    donor: address,
    amount: u64,
    timestamp: u64,
}

public struct DonationsWithdrawnEvent has copy, drop {
    project_id: ID,
    creator: address,
    amount: u64,
    timestamp: u64,
}

public struct UpdatePostedEvent has copy, drop {
    project_id: ID,
    update_id: vector<u8>,
    title: vector<u8>,
    author: address,
    timestamp: u64,
}

public struct CreatorCapGrantedEvent has copy, drop {
    cap_id: ID,
    recipient: address,
    max_projects: u64,
    timestamp: u64,
}

public struct CreatorCapRevokedEvent has copy, drop {
    cap_id: ID,
    timestamp: u64,
}

// ==================== Core Functions ====================

/// Create a new project
/// Only platform admin can create projects
#[allow(lint(self_transfer))]
public fun create_project<T>(
    _admin_cap: &PlatformAdminCap,
    platform: &mut DonationPlatform,
    title: vector<u8>,
    description: vector<u8>,
    category: vector<u8>,
    cover_image_url: vector<u8>,
    ctx: &mut TxContext
) {
    let project_uid = object::new(ctx);
    let project_id = object::uid_to_inner(&project_uid);
    let sender = ctx.sender();
    let timestamp = ctx.epoch_timestamp_ms();
    
    let project = Project<T> {
        id: project_uid,
        creator: sender,
        metadata: ProjectMetadata {
            title,
            description,
            category,
            cover_image_url,
        },
        financial: ProjectFinancial {
            balance: balance::zero(),
            total_received: 0,
            total_support_amount: 0,
        },
        stats: ProjectStats {
            supporter_count: 0,
            is_active: true,
            created_at: timestamp,
        },
    };
    
    let cap = ProjectCap {
        id: object::new(ctx),
        project_id,
    };
    
    platform::increment_project_count(platform);
    
    event::emit(ProjectCreatedEvent {
        project_id,
        creator: sender,
        title: project.metadata.title,
        category: project.metadata.category,
        timestamp,
    });
    
    transfer::share_object(project);
    transfer::transfer(cap, sender);
}

// ==================== Creator Cap Functions ====================

/// Admin grants a ProjectCreatorCap to an approved address
#[allow(lint(self_transfer))]
public fun grant_creator_cap(
    _admin_cap: &PlatformAdminCap,
    max_projects: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    let cap_uid = object::new(ctx);
    let cap_id = object::uid_to_inner(&cap_uid);

    let cap = ProjectCreatorCap {
        id: cap_uid,
        max_projects,
        projects_created: 0,
    };

    event::emit(CreatorCapGrantedEvent {
        cap_id,
        recipient,
        max_projects,
        timestamp: ctx.epoch_timestamp_ms(),
    });

    transfer::transfer(cap, recipient);
}

/// Admin revokes (burns) a ProjectCreatorCap
public fun revoke_creator_cap(
    _admin_cap: &PlatformAdminCap,
    cap: ProjectCreatorCap,
    ctx: &TxContext,
) {
    let cap_id = object::id(&cap);
    event::emit(CreatorCapRevokedEvent {
        cap_id,
        timestamp: ctx.epoch_timestamp_ms(),
    });
    let ProjectCreatorCap { id, max_projects: _, projects_created: _ } = cap;
    id.delete();
}

/// Holder of ProjectCreatorCap can create a project
#[allow(lint(self_transfer))]
public fun create_project_as_creator<T>(
    creator_cap: &mut ProjectCreatorCap,
    platform: &mut DonationPlatform,
    title: vector<u8>,
    description: vector<u8>,
    category: vector<u8>,
    cover_image_url: vector<u8>,
    ctx: &mut TxContext
) {
    // Enforce project limit (0 = unlimited)
    if (creator_cap.max_projects > 0) {
        assert!(
            creator_cap.projects_created < creator_cap.max_projects,
            ECreatorCapLimitReached
        );
    };
    creator_cap.projects_created = creator_cap.projects_created + 1;

    let project_uid = object::new(ctx);
    let project_id = object::uid_to_inner(&project_uid);
    let sender = ctx.sender();
    let timestamp = ctx.epoch_timestamp_ms();

    let project = Project<T> {
        id: project_uid,
        creator: sender,
        metadata: ProjectMetadata {
            title,
            description,
            category,
            cover_image_url,
        },
        financial: ProjectFinancial {
            balance: balance::zero(),
            total_received: 0,
            total_support_amount: 0,
        },
        stats: ProjectStats {
            supporter_count: 0,
            is_active: true,
            created_at: timestamp,
        },
    };

    let cap = ProjectCap {
        id: object::new(ctx),
        project_id,
    };

    platform::increment_project_count(platform);

    event::emit(ProjectCreatedEvent {
        project_id,
        creator: sender,
        title: project.metadata.title,
        category: project.metadata.category,
        timestamp,
    });

    transfer::share_object(project);
    transfer::transfer(cap, sender);
}

/// Query: get creator cap info (max_projects, projects_created)
public fun get_creator_cap_info(cap: &ProjectCreatorCap): (u64, u64) {
    (cap.max_projects, cap.projects_created)
}

// ==================== Support Functions ====================

/// Start supporting a project (record only, no funds transfer)
/// User mints btcUSDC and keeps it in their wallet
public fun support_project<T>(
    project: &mut Project<T>,
    support_record: &mut SupportRecord,
    amount: u64,
    ctx: &TxContext,
) {
    let project_id = object::id(project);
    let supporter = ctx.sender();
    
    // Check if this is a new supporter
    let is_new_supporter = !support_record::is_supporting(support_record, project_id);
    
    // Record support in SupportRecord
    support_record::start_support(support_record, project_id, amount, ctx);
    
    // Update project statistics
    project.financial.total_support_amount = 
        project.financial.total_support_amount + amount;
    
    if (is_new_supporter) {
        project.stats.supporter_count = project.stats.supporter_count + 1;
    };
    
    event::emit(SupportStartedEvent {
        project_id,
        supporter,
        amount,
        timestamp: ctx.epoch_timestamp_ms(),
    });
}

/// Increase support amount
public fun increase_support<T>(
    project: &mut Project<T>,
    support_record: &mut SupportRecord,
    additional_amount: u64,
    ctx: &TxContext,
) {
    let project_id = object::id(project);
    let supporter = ctx.sender();
    
    // Update support record
    support_record::increase_support(support_record, project_id, additional_amount, ctx);
    
    // Update project statistics
    project.financial.total_support_amount = 
        project.financial.total_support_amount + additional_amount;
    
    let new_total = support_record::get_support_amount(support_record, project_id);
    
    event::emit(SupportIncreasedEvent {
        project_id,
        supporter,
        additional_amount,
        new_total,
        timestamp: ctx.epoch_timestamp_ms(),
    });
}

/// Decrease support amount (when user burns some btcUSDC)
public fun decrease_support<T>(
    project: &mut Project<T>,
    support_record: &mut SupportRecord,
    decrease_amount: u64,
    ctx: &TxContext,
) {
    let project_id = object::id(project);
    let supporter = ctx.sender();
    
    // Update support record
    support_record::decrease_support(support_record, project_id, decrease_amount, ctx);
    
    // Update project statistics
    project.financial.total_support_amount = 
        project.financial.total_support_amount - decrease_amount;
    
    let new_total = support_record::get_support_amount(support_record, project_id);
    
    event::emit(SupportDecreasedEvent {
        project_id,
        supporter,
        decreased_amount: decrease_amount,
        new_total,
        timestamp: ctx.epoch_timestamp_ms(),
    });
}

/// End support for a project
public fun end_support<T>(
    project: &mut Project<T>,
    support_record: &mut SupportRecord,
    ctx: &TxContext,
) {
    let project_id = object::id(project);
    let supporter = ctx.sender();
    
    // Get support amount before removing
    let amount = support_record::get_support_amount(support_record, project_id);
    
    // Remove support record
    support_record::end_support(support_record, project_id);
    
    // Update project statistics
    project.financial.total_support_amount = 
        project.financial.total_support_amount - amount;
    project.stats.supporter_count = project.stats.supporter_count - 1;
    
    event::emit(SupportEndedEvent {
        project_id,
        supporter,
        timestamp: ctx.epoch_timestamp_ms(),
    });
}

// ==================== Yield Donation Functions ====================

/// Donate yield to a project
/// Called after user claims yield from Stable Layer
public fun donate_yield<T>(
    project: &mut Project<T>,
    yield_coin: Coin<T>,
    ctx: &TxContext,
) {
    let amount = yield_coin.value();
    let donor = ctx.sender();
    
    // Add yield to project balance
    project.financial.balance.join(yield_coin.into_balance());
    project.financial.total_received = project.financial.total_received + amount;
    
    event::emit(YieldDonatedEvent {
        project_id: object::id(project),
        donor,
        amount,
        timestamp: ctx.epoch_timestamp_ms(),
    });
}

// ==================== Project Creator Functions ====================

/// Withdraw accumulated donations
/// Only project creator (with ProjectCap) can call this
public fun withdraw_donations<T>(
    project_cap: &ProjectCap,
    project: &mut Project<T>,
    amount: u64,
    ctx: &mut TxContext
): Coin<T> {
    assert!(project_cap.project_id == object::id(project), EInvalidProjectCap);
    assert!(project.financial.balance.value() >= amount, EInsufficientBalance);
    
    let withdrawn = sui::coin::from_balance(project.financial.balance.split(amount), ctx);
    
    event::emit(DonationsWithdrawnEvent {
        project_id: object::id(project),
        creator: ctx.sender(),
        amount,
        timestamp: ctx.epoch_timestamp_ms(),
    });
    
    withdrawn
}

/// Update project metadata (owner only)
public fun update_project_metadata<T>(
    project_cap: &ProjectCap,
    project: &mut Project<T>,
    title: vector<u8>,
    description: vector<u8>,
    category: vector<u8>,
    cover_image_url: vector<u8>,
) {
    assert!(project_cap.project_id == object::id(project), EInvalidProjectCap);
    project.metadata.title = title;
    project.metadata.description = description;
    project.metadata.category = category;
    project.metadata.cover_image_url = cover_image_url;
}

/// Post a progress update
/// Only visible to supporters (checked in frontend)
public fun post_update<T>(
    project_cap: &ProjectCap,
    project: &mut Project<T>,
    update_id: vector<u8>,
    title: vector<u8>,
    content: vector<u8>,
    ctx: &mut TxContext
) {
    assert!(project_cap.project_id == object::id(project), EInvalidProjectCap);
    
    let timestamp = ctx.epoch_timestamp_ms();
    let author = ctx.sender();
    let title_copy = title;
    
    let update = ProjectUpdate {
        title,
        content,
        timestamp,
        author,
    };
    
    df::add(&mut project.id, update_id, update);
    
    event::emit(UpdatePostedEvent {
        project_id: object::id(project),
        update_id,
        title: title_copy,
        author,
        timestamp,
    });
}

// ==================== Query Functions ====================

/// Get project basic info
public fun get_info<T>(project: &Project<T>): (
    address,
    &vector<u8>,
    &vector<u8>,
    &vector<u8>,
    &vector<u8>,
    bool,
    u64,
) {
    (
        project.creator,
        &project.metadata.title,
        &project.metadata.description,
        &project.metadata.category,
        &project.metadata.cover_image_url,
        project.stats.is_active,
        project.stats.created_at
    )
}

/// Get project financial info
/// Returns: (balance, total_received, total_support_amount, supporter_count)
public fun get_financial_info<T>(project: &Project<T>): (u64, u64, u64, u64) {
    (
        project.financial.balance.value(),
        project.financial.total_received,
        project.financial.total_support_amount,
        project.stats.supporter_count
    )
}

/// Get a specific update
public fun get_update<T>(project: &Project<T>, update_id: vector<u8>): &ProjectUpdate {
    df::borrow(&project.id, update_id)
}

/// Check if update exists
public fun has_update<T>(project: &Project<T>, update_id: vector<u8>): bool {
    df::exists_(&project.id, update_id)
}

/// Get update details
public fun get_update_details(update: &ProjectUpdate): (&vector<u8>, &vector<u8>, u64, address) {
    (&update.title, &update.content, update.timestamp, update.author)
}

// ==================== Error Codes ====================

const EInvalidProjectCap: u64 = 0;
const EInsufficientBalance: u64 = 1;
const ECreatorCapLimitReached: u64 = 2;

// ==================== Tests ====================

#[test_only]
public fun create_project_for_testing<T>(
    admin_cap: &PlatformAdminCap,
    platform: &mut DonationPlatform,
    ctx: &mut TxContext
) {
    create_project<T>(
        admin_cap,
        platform,
        b"Test Project",
        b"Test Description",
        b"Test Category",
        b"https://test.com/image.jpg",
        ctx
    );
}
