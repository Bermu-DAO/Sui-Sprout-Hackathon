/// Platform module - Manages the GoodVibe donation platform
module goodvibe::platform;

use sui::event;

// ==================== Structs ====================

/// Platform admin capability - proves platform admin rights
public struct PlatformAdminCap has key, store {
    id: UID,
}

/// Main platform state - shared object that tracks platform-wide statistics
public struct DonationPlatform has key {
    id: UID,
    admin: address,
    total_projects_created: u64,
    total_vaults_created: u64,
    total_value_locked: u64,
    created_at: u64,
}

// ==================== Events ====================

/// Event emitted when platform is initialized
public struct PlatformCreated has copy, drop {
    platform_id: ID,
    admin: address,
    timestamp: u64,
}

// ==================== Init ====================

/// Initialize the platform (called once on publish)
fun init(ctx: &mut TxContext) {
    let sender = ctx.sender();
    
    let platform = DonationPlatform {
        id: object::new(ctx),
        admin: sender,
        total_projects_created: 0,
        total_vaults_created: 0,
        total_value_locked: 0,
        created_at: ctx.epoch_timestamp_ms(),
    };
    
    // Create admin capability
    let admin_cap = PlatformAdminCap {
        id: object::new(ctx),
    };
    
    event::emit(PlatformCreated {
        platform_id: object::id(&platform),
        admin: sender,
        timestamp: ctx.epoch_timestamp_ms(),
    });
    
    transfer::share_object(platform);
    transfer::transfer(admin_cap, sender);
}

// ==================== Package Functions ====================

/// Increment project count (called by project module)
public(package) fun increment_project_count(platform: &mut DonationPlatform) {
    platform.total_projects_created = platform.total_projects_created + 1;
}

/// Increment vault count (called by vault module)
public(package) fun increment_vault_count(platform: &mut DonationPlatform) {
    platform.total_vaults_created = platform.total_vaults_created + 1;
}

/// Add to total value locked (called by vault module on deposit)
public(package) fun add_to_tvl(platform: &mut DonationPlatform, amount: u64) {
    platform.total_value_locked = platform.total_value_locked + amount;
}

/// Subtract from total value locked (called by vault module on withdrawal)
public(package) fun subtract_from_tvl(platform: &mut DonationPlatform, amount: u64) {
    platform.total_value_locked = platform.total_value_locked - amount;
}

// ==================== Public Read Functions ====================

/// Get platform statistics
public fun get_stats(platform: &DonationPlatform): (u64, u64, u64, u64) {
    (
        platform.total_projects_created,
        platform.total_vaults_created,
        platform.total_value_locked,
        platform.created_at
    )
}

/// Get admin address
public fun get_admin(platform: &DonationPlatform): address {
    platform.admin
}

// ==================== Tests ====================

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
