-- Custom SQL migration file, put your code below! --
-- Active l'extension pgvector (requise pour le RAG en M3).
-- Doit s'exécuter avant toute table utilisant le type `vector`.
CREATE EXTENSION IF NOT EXISTS vector;