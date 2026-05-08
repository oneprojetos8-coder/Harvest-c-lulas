-- Fix completo para banco de dados Supabase
-- Execute este SQL no editor de banco de dados do Supabase para restaurar os dados no software.

-- Primeiro, garantir que as tabelas existem
CREATE TABLE IF NOT EXISTS cells (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    leaders TEXT,
    location TEXT,
    status TEXT DEFAULT 'Ativo'
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    cell_name TEXT NOT NULL,
    leaders TEXT,
    location TEXT,
    start_time TIME,
    end_time TIME,
    members INTEGER DEFAULT 0,
    visitors INTEGER DEFAULT 0,
    occurred TEXT DEFAULT 'sim',
    photo_url TEXT
);

CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    cell_name TEXT,
    role TEXT DEFAULT 'leader'
);

CREATE TABLE IF NOT EXISTS tithes (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    cell_name TEXT,
    member_name TEXT
);

CREATE TABLE IF NOT EXISTS offerings (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    cell_name TEXT,
    type TEXT DEFAULT 'regular'
);

CREATE TABLE IF NOT EXISTS special_offerings (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    cell_name TEXT,
    campaign_name TEXT
);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    goal DECIMAL(10,2),
    current DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL, -- 'manual_income' ou 'manual_expense'
    description TEXT,
    category TEXT
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE tithes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Pastores veem todas as células" ON cells;
DROP POLICY IF EXISTS "Líderes veem todas as células" ON cells;
DROP POLICY IF EXISTS "Líderes atualizam sua célula" ON cells;
DROP POLICY IF EXISTS "Pastores veem todos os relatórios" ON reports;
DROP POLICY IF EXISTS "Líderes gerenciam relatórios da sua célula" ON reports;
DROP POLICY IF EXISTS "Todos podem ver e gravar dízimos" ON tithes;
DROP POLICY IF EXISTS "Todos podem ver e gravar ofertas" ON offerings;
DROP POLICY IF EXISTS "Todos podem ver e gravar ofertas especiais" ON special_offerings;
DROP POLICY IF EXISTS "Todos podem ver e gravar campanhas" ON campaigns;
DROP POLICY IF EXISTS "Todos podem ver e gravar transações financeiras" ON financial_transactions;

-- CELLS
CREATE POLICY "Pastores veem todas as células" ON cells
    FOR ALL USING (true);
CREATE POLICY "Líderes veem todas as células" ON cells
    FOR SELECT USING (true);
CREATE POLICY "Líderes atualizam sua célula" ON cells
    FOR UPDATE USING (true);

-- REPORTS
CREATE POLICY "Pastores veem todos os relatórios" ON reports
    FOR ALL USING (true);
CREATE POLICY "Líderes gerenciam relatórios da sua célula" ON reports
    FOR ALL USING (true);

-- TOKENS
CREATE POLICY "Todos podem ver tokens" ON tokens
    FOR SELECT USING (true);
CREATE POLICY "Pastores gerenciam tokens" ON tokens
    FOR ALL USING (true);

-- FINANCEIRAS
CREATE POLICY "Todos podem ver e gravar dízimos" ON tithes
    FOR ALL USING (true);
CREATE POLICY "Todos podem ver e gravar ofertas" ON offerings
    FOR ALL USING (true);
CREATE POLICY "Todos podem ver e gravar ofertas especiais" ON special_offerings
    FOR ALL USING (true);
CREATE POLICY "Todos podem ver e gravar campanhas" ON campaigns
    FOR ALL USING (true);
CREATE POLICY "Todos podem ver e gravar transações financeiras" ON financial_transactions
    FOR ALL USING (true);
