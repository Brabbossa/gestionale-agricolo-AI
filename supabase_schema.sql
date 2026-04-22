-- Schema SQL di inizializzazione per il Gestionale Agricolo AI
-- Da eseguire nell'editor SQL di Supabase.

-- Estensione per UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabella Anagrafica
CREATE TABLE public."Anagrafica" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo TEXT NOT NULL CHECK (tipo IN ('Cliente', 'Fornitore')),
    ragione_sociale TEXT NOT NULL,
    partita_iva TEXT NOT NULL,
    codice_fiscale TEXT,
    indirizzo_sede TEXT,
    codice_sdi_pec TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Plant (Piante / Prodotti)
CREATE TABLE public."Plant" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Ordini_Vendita
CREATE TABLE public."Ordini_Vendita" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES public."Anagrafica"(id) ON DELETE SET NULL,
    stato TEXT DEFAULT 'In Lavorazione',
    numero_ddt TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Voci_Ordine
CREATE TABLE public."Voci_Ordine" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ordine_id UUID REFERENCES public."Ordini_Vendita"(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES public."Plant"(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    prezzo_unitario NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Lotti_Produzione
CREATE TABLE public."Lotti_Produzione" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT,
    data_semina DATE,
    stato TEXT DEFAULT 'Attivo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Movement (Movimenti Magazzino)
CREATE TABLE public."Movement" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plant_id UUID REFERENCES public."Plant"(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    tipo TEXT, -- es. 'Carico', 'Scarico'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Prodotti_Fitosanitari
CREATE TABLE public."Prodotti_Fitosanitari" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    principio_attivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Trattamenti
CREATE TABLE public."Trattamenti" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prodotto_id UUID REFERENCES public."Prodotti_Fitosanitari"(id) ON DELETE SET NULL,
    data DATE NOT NULL,
    dosi TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Task
CREATE TABLE public."Task" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titolo TEXT NOT NULL,
    descrizione TEXT,
    status TEXT DEFAULT 'Da fare',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Order (Ordini Generici / Acquisto)
CREATE TABLE public."Order" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fornitore_id UUID REFERENCES public."Anagrafica"(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'In sospeso',
    totale NUMERIC(10, 2),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella locations
CREATE TABLE public."locations" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_zona TEXT NOT NULL,
    tipo TEXT DEFAULT 'Generica',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella inventory_lotti
CREATE TABLE public."inventory_lotti" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES public."locations"(id) ON DELETE SET NULL,
    nome_pianta TEXT NOT NULL,
    quantita INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Chat_History
CREATE TABLE public."Chat_History" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_message TEXT NOT NULL,
    ai_response TEXT,
    azione TEXT,
    success BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabella Carrelli_CC
CREATE TABLE public."Carrelli_CC" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codice_carrello TEXT NOT NULL,
    cliente_id UUID REFERENCES public."Anagrafica"(id) ON DELETE SET NULL,
    data_uscita TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_rientro TIMESTAMP WITH TIME ZONE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Impostazione permessi RLS (Row Level Security) fittizi
-- Permetti l'accesso anonimo completo in sviluppo
ALTER TABLE public."Anagrafica" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Plant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Ordini_Vendita" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Voci_Ordine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lotti_Produzione" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Movement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Prodotti_Fitosanitari" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Trattamenti" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."inventory_lotti" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Chat_History" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Carrelli_CC" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow ALL for Anagrafica" ON public."Anagrafica" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Plant" ON public."Plant" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Ordini_Vendita" ON public."Ordini_Vendita" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Voci_Ordine" ON public."Voci_Ordine" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Lotti_Produzione" ON public."Lotti_Produzione" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Movement" ON public."Movement" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Prodotti_Fitosanitari" ON public."Prodotti_Fitosanitari" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Trattamenti" ON public."Trattamenti" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Task" ON public."Task" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Order" ON public."Order" FOR ALL USING (true);
CREATE POLICY "Allow ALL for locations" ON public."locations" FOR ALL USING (true);
CREATE POLICY "Allow ALL for inventory_lotti" ON public."inventory_lotti" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Chat_History" ON public."Chat_History" FOR ALL USING (true);
CREATE POLICY "Allow ALL for Carrelli_CC" ON public."Carrelli_CC" FOR ALL USING (true);
