-- Dimension d'embedding alignée sur Albert « BAAI/bge-m3 » (1024 dimensions).
-- Les vecteurs 1536 existants sont incompatibles : on vide les documents
-- (ré-ingestion nécessaire — les Cadres/conversations sont conservés).
DROP INDEX IF EXISTS "chunks_embedding_idx";--> statement-breakpoint
TRUNCATE TABLE "documents" CASCADE;--> statement-breakpoint
ALTER TABLE "chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(1024);--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);
