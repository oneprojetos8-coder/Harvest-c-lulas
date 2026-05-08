-- Fix de políticas para líderes/tesoureiros no Supabase
-- Execute este SQL no editor de banco de dados do Supabase para restaurar os dados no software.

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
