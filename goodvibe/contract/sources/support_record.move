/// Support Record module - Manages user's support records for projects
/// Users hold btcUSDC in their wallet and record which projects they support
module goodvibe::support_record;

use sui::dynamic_field as df;

// ==================== Structs ====================

/// User's support record (owned object)
/// Records which projects the user is supporting
public struct SupportRecord has key, store {
    id: UID,
    owner: address,
}

/// Support info for a single project
public struct ProjectSupport has store, drop {
    project_id: ID,
    amount: u64,           // Amount of btcUSDC allocated to support this project
    started_at: u64,       // When support started
    last_updated: u64,     // Last update timestamp
}

// ==================== User Functions ====================

/// Create a new support record
/// Users call this once to create their record
public fun create_support_record(ctx: &mut TxContext): SupportRecord {
    SupportRecord {
        id: object::new(ctx),
        owner: ctx.sender(),
    }
}

// ==================== Package Functions (called by project module) ====================

/// Start or increase support for a project
/// If already supporting, increases the amount
public(package) fun start_support(
    record: &mut SupportRecord,
    project_id: ID,
    amount: u64,
    ctx: &TxContext,
) {
    let timestamp = ctx.epoch_timestamp_ms();
    
    if (df::exists_(&record.id, project_id)) {
        // Already supporting, increase amount
        let support = df::borrow_mut<ID, ProjectSupport>(&mut record.id, project_id);
        support.amount = support.amount + amount;
        support.last_updated = timestamp;
    } else {
        // New support
        let support = ProjectSupport {
            project_id,
            amount,
            started_at: timestamp,
            last_updated: timestamp,
        };
        df::add(&mut record.id, project_id, support);
    }
}

/// Increase support amount for a project
public(package) fun increase_support(
    record: &mut SupportRecord,
    project_id: ID,
    additional_amount: u64,
    ctx: &TxContext,
) {
    assert!(df::exists_(&record.id, project_id), EProjectNotSupported);
    
    let support = df::borrow_mut<ID, ProjectSupport>(&mut record.id, project_id);
    support.amount = support.amount + additional_amount;
    support.last_updated = ctx.epoch_timestamp_ms();
}

/// Decrease support amount for a project
/// Used when user withdraws (burns) some btcUSDC
public(package) fun decrease_support(
    record: &mut SupportRecord,
    project_id: ID,
    decrease_amount: u64,
    ctx: &TxContext,
) {
    assert!(df::exists_(&record.id, project_id), EProjectNotSupported);
    
    let support = df::borrow_mut<ID, ProjectSupport>(&mut record.id, project_id);
    assert!(support.amount >= decrease_amount, EInsufficientSupport);
    
    support.amount = support.amount - decrease_amount;
    support.last_updated = ctx.epoch_timestamp_ms();
    
    // If amount becomes zero, remove the record
    if (support.amount == 0) {
        df::remove<ID, ProjectSupport>(&mut record.id, project_id);
    }
}

/// End support for a project (remove record)
public(package) fun end_support(
    record: &mut SupportRecord,
    project_id: ID,
) {
    if (df::exists_(&record.id, project_id)) {
        df::remove<ID, ProjectSupport>(&mut record.id, project_id);
    }
}

// ==================== Query Functions ====================

/// Check if user is supporting a project
public fun is_supporting(record: &SupportRecord, project_id: ID): bool {
    df::exists_(&record.id, project_id)
}

/// Get support amount for a project
public fun get_support_amount(record: &SupportRecord, project_id: ID): u64 {
    if (!df::exists_(&record.id, project_id)) {
        return 0
    };
    
    let support = df::borrow<ID, ProjectSupport>(&record.id, project_id);
    support.amount
}

/// Get support details (amount, started_at, last_updated)
public fun get_support_details(record: &SupportRecord, project_id: ID): (u64, u64, u64) {
    assert!(df::exists_(&record.id, project_id), EProjectNotSupported);
    
    let support = df::borrow<ID, ProjectSupport>(&record.id, project_id);
    (support.amount, support.started_at, support.last_updated)
}

/// Get record owner
public fun owner(record: &SupportRecord): address {
    record.owner
}

// ==================== Error Codes ====================

const EProjectNotSupported: u64 = 0;
const EInsufficientSupport: u64 = 1;

