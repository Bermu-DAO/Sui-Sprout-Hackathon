alter table run_receipts add column if not exists receipt_payload jsonb;
alter table run_receipts add column if not exists signature text;
alter table run_receipts add column if not exists signature_algorithm text;
alter table run_receipts add column if not exists source_scope jsonb;
