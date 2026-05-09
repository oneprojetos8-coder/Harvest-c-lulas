-- Script para popular o banco de dados com dados de exemplo
-- Execute este script no Supabase SQL Editor após criar as tabelas

-- Limpar dados existentes (opcional - descomente se quiser limpar tudo)
-- DELETE FROM financial_transactions;
-- DELETE FROM special_offerings;
-- DELETE FROM offerings;
-- DELETE FROM tithes;
-- DELETE FROM campaigns;
-- DELETE FROM reports;
-- DELETE FROM cells;
-- DELETE FROM tokens;

-- Inserir células
INSERT INTO cells (name, leaders, location) VALUES
('Célula Videira', 'João Silva, Maria Santos', 'Rua das Videiras, 123'),
('Célula Oliveiras', 'Pedro Oliveira, Ana Costa', 'Av. das Oliveiras, 456');

-- Inserir tokens
INSERT INTO tokens (code, cell_name, role) VALUES
('VIDEIRA2026', 'Célula Videira', 'leader'),
('OLIVEIRAS2026', 'Célula Oliveiras', 'leader'),
('TESOUREIRO2026', NULL, 'treasurer');

-- Inserir relatórios de células
INSERT INTO reports (date, cell_name, leaders, location, start_time, end_time, members, visitors, occurred, notes, timestamp) VALUES
('2026-05-01', 'Célula Videira', 'João Silva', 'Rua das Videiras, 123', '19:00', '21:00', 12, 3, 'sim', 'Reunião muito produtiva', 1714521600000),
('2026-05-01', 'Célula Oliveiras', 'Pedro Oliveira', 'Av. das Oliveiras, 456', '19:30', '21:30', 8, 2, 'sim', 'Boa participação', 1714521600000),
('2026-05-08', 'Célula Videira', 'João Silva', 'Rua das Videiras, 123', '19:00', '21:00', 14, 4, 'sim', 'Novo membro presente', 1715126400000),
('2026-05-08', 'Célula Oliveiras', 'Pedro Oliveira', 'Av. das Oliveiras, 456', '19:30', '21:30', 10, 1, 'sim', 'Discussão sobre evangelismo', 1715126400000),
('2026-05-15', 'Célula Videira', 'João Silva', 'Rua das Videiras, 123', '19:00', '21:00', 13, 2, 'sim', 'Estudo bíblico intenso', 1715731200000),
('2026-05-15', 'Célula Oliveiras', 'Pedro Oliveira', 'Av. das Oliveiras, 456', '19:30', '21:30', 9, 3, 'sim', 'Visitantes interessados', 1715731200000),
('2026-05-22', 'Célula Videira', 'João Silva', 'Rua das Videiras, 123', '19:00', '21:00', 15, 1, 'sim', 'Celebração de aniversários', 1716336000000),
('2026-05-22', 'Célula Oliveiras', 'Pedro Oliveira', 'Av. das Oliveiras, 456', '19:30', '21:30', 11, 2, 'sim', 'Planejamento mensal', 1716336000000);

-- Inserir dízimos
INSERT INTO tithes (member_name, amount, date, cell_name) VALUES
('João Silva', 100.00, '2026-05-01', 'Célula Videira'),
('Maria Santos', 80.00, '2026-05-01', 'Célula Oliveiras'),
('Pedro Oliveira', 120.00, '2026-05-08', 'Célula Videira'),
('Ana Costa', 90.00, '2026-05-08', 'Célula Oliveiras'),
('Carlos Mendes', 150.00, '2026-05-15', 'Célula Videira'),
('Lucia Ferreira', 110.00, '2026-05-15', 'Célula Oliveiras'),
('Roberto Lima', 85.00, '2026-05-22', 'Célula Videira'),
('Fernanda Souza', 95.00, '2026-05-22', 'Célula Oliveiras');

-- Inserir ofertas
INSERT INTO offerings (member_name, amount, date, cell_name, type) VALUES
('Pedro Oliveira', 50.00, '2026-05-01', 'Célula Videira', 'regular'),
('Ana Costa', 30.00, '2026-05-01', 'Célula Oliveiras', 'regular'),
('João Silva', 75.00, '2026-05-08', 'Célula Videira', 'regular'),
('Maria Santos', 45.00, '2026-05-08', 'Célula Oliveiras', 'regular'),
('Carlos Mendes', 100.00, '2026-05-15', 'Célula Videira', 'regular'),
('Lucia Ferreira', 60.00, '2026-05-15', 'Célula Oliveiras', 'regular'),
('Roberto Lima', 40.00, '2026-05-22', 'Célula Videira', 'regular'),
('Fernanda Souza', 55.00, '2026-05-22', 'Célula Oliveiras', 'regular');

-- Inserir ofertas especiais
INSERT INTO special_offerings (member_name, amount, date, cell_name, campaign_name) VALUES
('Carlos Mendes', 200.00, '2026-05-10', 'Célula Videira', 'Campanha de Missões'),
('João Silva', 150.00, '2026-05-10', 'Célula Videira', 'Campanha de Missões'),
('Maria Santos', 180.00, '2026-05-10', 'Célula Oliveiras', 'Campanha de Missões'),
('Pedro Oliveira', 120.00, '2026-05-17', 'Célula Videira', 'Campanha de Missões'),
('Ana Costa', 90.00, '2026-05-17', 'Célula Oliveiras', 'Campanha de Missões');

-- Inserir campanhas
INSERT INTO campaigns (name, description, start_date, end_date, goal_amount, current_amount, status) VALUES
('Campanha de Missões', 'Campanha para apoiar missões internacionais', '2026-05-01', '2026-05-31', 5000.00, 740.00, 'active');

-- Inserir transações financeiras manuais
INSERT INTO financial_transactions (type, amount, date, description) VALUES
('manual_income', 500.00, '2026-05-01', 'Caixa||Entrada de caixa semanal'),
('manual_expense', 150.00, '2026-05-05', 'Despesa Operacional||Compra de materiais'),
('manual_income', 300.00, '2026-05-08', 'Dízimo Extra||Dízimo especial'),
('manual_expense', 200.00, '2026-05-12', 'Campanha||Investimento em campanha'),
('manual_income', 400.00, '2026-05-15', 'Caixa||Entrada de caixa semanal'),
('manual_expense', 80.00, '2026-05-18', 'Despesa Operacional||Manutenção'),
('manual_income', 250.00, '2026-05-22', 'Dízimo Extra||Dízimo especial');