-- Esegui questo script nell'editor SQL di Supabase
-- Aggiunge le colonne mancanti alla tabella Anagrafica per un CRM completo

ALTER TABLE public."Anagrafica"
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS persona_riferimento TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS condizioni_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;
