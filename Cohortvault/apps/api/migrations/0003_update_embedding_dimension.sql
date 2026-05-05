-- Drop the old ivfflat index first (required before altering column type)
drop index if exists idx_document_chunks_embedding;

-- Existing rows may still carry vector(32) payloads. Replace the column with a
-- fresh vector(1536) field populated with zero vectors so the migration is safe
-- on databases that already contain seeded data.
alter table document_chunks add column if not exists embedding_v2 vector(1536);

update document_chunks
set embedding_v2 = (
  '[' || array_to_string(array_fill(0::double precision, array[1536]), ',') || ']'
)::vector
where embedding_v2 is null;

alter table document_chunks drop column if exists embedding;
alter table document_chunks rename column embedding_v2 to embedding;

-- Recreate the index for the new dimension
create index if not exists idx_document_chunks_embedding
  on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
