// Supabase Configuration
const SUPABASE_URL = 'https://junitbdhmsiaiqsnshkv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bml0YmRobXNpYWlxc25zaGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjY4OTQsImV4cCI6MjA5MzA0Mjg5NH0.6nE9omQ3WfroQfRXXxt8-tqVq7mJb7nYHvn4FDrw_CA';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
    reports: [],
    cells: [],
    tokens: [],
    tithes: [],
    offerings: [],
    specialOfferings: [],
    campaigns: [],
    financialTransactions: []
};

// Teste de conexão com Supabase
async function testSupabaseConnection() {
    console.log('🔍 Testando conexão com Supabase...');
    try {
        // Teste básico de conectividade
        const { data, error } = await supabaseClient.from('reports').select('count').limit(1);
        if (error) {
            console.error('❌ Erro de conexão:', error);
            alert('Erro de conexão com Supabase: ' + error.message + '\n\nVerifique se as políticas RLS foram aplicadas!');
            return false;
        }
        
        console.log('✅ Conexão com Supabase OK');
        
        // Teste se há dados
        const tables = ['reports', 'cells', 'tokens', 'tithes', 'offerings', 'special_offerings', 'campaigns', 'financial_transactions'];
        for (const table of tables) {
            const { data: tableData, error: tableError } = await supabaseClient.from(table).select('*').limit(1);
            if (tableError) {
                console.error(`❌ Erro na tabela ${table}:`, tableError);
            } else {
                console.log(`📊 ${table}: ${tableData?.length || 0} registros`);
            }
        }
        
        return true;
    } catch (err) {
        console.error('❌ Erro geral no teste:', err);
        alert('Erro geral: ' + err.message);
        return false;
    }
}

// Função para forçar login (debug)
async function forceLogin() {
    console.log('🚪 Forçando login...');
    const role = prompt('Digite o tipo de usuário (pastor/leader/treasurer):', 'pastor');
    const cell = prompt('Digite o nome da célula (ou deixe vazio para pastor):', role === 'pastor' ? 'Administração' : '');

    if (role) {
        console.log('✅ Forçando login como:', role, cell);
        sessionStorage.setItem('cbna_user_role', role);
        sessionStorage.setItem('cbna_user_cell', cell || 'Administração');
        await handleLogin(role, cell || 'Administração');
    }
}

// Função para alternar entre as abas do painel financeiro
function switchFinancialTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.financial-tab').forEach(tab => tab.classList.remove('active'));
    
    // Hide all sections
    document.getElementById('financial-summary-section').classList.add('hidden');
    document.getElementById('financial-manual-section').classList.add('hidden');
    document.getElementById('financial-reports-section').classList.add('hidden');
    
    // Show selected tab and section
    document.getElementById(`finance-tab-${tabName}`).classList.add('active');
    document.getElementById(`financial-${tabName}-section`).classList.remove('hidden');
    
    currentFinancialTab = tabName;
}

// Função para alternar a visibilidade do filtro financeiro
function toggleFinancialFilter() {
    const filterContent = document.getElementById('financial-filter-content');
    const toggleBtn = document.getElementById('filter-toggle-btn');
    
    if (filterContent.style.display === 'none' || filterContent.style.display === '') {
        filterContent.style.display = 'grid';
        toggleBtn.innerHTML = '<i data-lucide="x"></i><span>Ocultar Filtros</span>';
    } else {
        filterContent.style.display = 'none';
        toggleBtn.innerHTML = '<i data-lucide="filter"></i><span>Filtros</span>';
    }
    
    // Re-render Lucide icons
    lucide.createIcons();
}

// Função para gerar relatórios
async function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const format = document.getElementById('report-format').value;
    const includeCharts = document.getElementById('include-charts').checked;

    if (!startDate || !endDate) {
        alert('Por favor, selecione o período do relatório.');
        return;
    }

    console.log('Gerando relatório:', { reportType, startDate, endDate, format, includeCharts });

    try {
        let reportData = {};
        let reportTitle = '';

        // Filtrar dados pelo período
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Incluir o dia todo

        switch (reportType) {
            case 'financial-summary':
                reportTitle = 'Resumo Financeiro';
                reportData = await generateFinancialSummaryReport(start, end);
                break;
            case 'tithes-report':
                reportTitle = 'Relatório de Dízimos';
                reportData = await generateTithesReport(start, end);
                break;
            case 'offerings-report':
                reportTitle = 'Relatório de Ofertas';
                reportData = await generateOfferingsReport(start, end);
                break;
            case 'special-offerings-report':
                reportTitle = 'Relatório de Ofertas Especiais';
                reportData = await generateSpecialOfferingsReport(start, end);
                break;
            case 'complete-financial':
                reportTitle = 'Relatório Financeiro Completo';
                reportData = await generateCompleteFinancialReport(start, end);
                break;
        }

        if (format === 'pdf') {
            await generatePDFReport(reportTitle, reportData, start, end, includeCharts);
        } else {
            generateCSVReport(reportTitle, reportData, start, end);
        }

        // Adicionar aos relatórios recentes
        addToRecentReports(reportTitle, start, end, format);

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        alert('Erro ao gerar relatório: ' + error.message);
    }
}

// Funções auxiliares para gerar diferentes tipos de relatório
async function generateFinancialSummaryReport(startDate, endDate) {
    const filteredTithes = state.tithes.filter(t => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate;
    });
    const filteredOfferings = state.offerings.filter(o => {
        const date = new Date(o.date);
        return date >= startDate && date <= endDate;
    });
    const filteredSpecialOfferings = state.specialOfferings.filter(s => {
        const date = new Date(s.date);
        return date >= startDate && date <= endDate;
    });
    const filteredTransactions = state.financialTransactions.filter(t => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate;
    });

    const totalTithes = filteredTithes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalOfferings = filteredOfferings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
    const totalSpecialOfferings = filteredSpecialOfferings.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    const totalIncomes = filteredTransactions.filter(t => t.type === 'manual_income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'manual_expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    return {
        summary: {
            totalTithes,
            totalOfferings,
            totalSpecialOfferings,
            totalIncomes,
            totalExpenses,
            totalRevenue: totalTithes + totalOfferings + totalSpecialOfferings + totalIncomes,
            netBalance: totalTithes + totalOfferings + totalSpecialOfferings + totalIncomes - totalExpenses,
            tithesCount: filteredTithes.length,
            offeringsCount: filteredOfferings.length,
            specialOfferingsCount: filteredSpecialOfferings.length,
            transactionsCount: filteredTransactions.length
        }
    };
}

async function generateTithesReport(startDate, endDate) {
    const filteredTithes = state.tithes.filter(t => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate;
    });

    return {
        tithes: filteredTithes,
        summary: {
            total: filteredTithes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
            count: filteredTithes.length,
            average: filteredTithes.length > 0 ? filteredTithes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) / filteredTithes.length : 0
        }
    };
}

async function generateOfferingsReport(startDate, endDate) {
    const filteredOfferings = state.offerings.filter(o => {
        const date = new Date(o.date);
        return date >= startDate && date <= endDate;
    });

    return {
        offerings: filteredOfferings,
        summary: {
            total: filteredOfferings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0),
            count: filteredOfferings.length,
            average: filteredOfferings.length > 0 ? filteredOfferings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0) / filteredOfferings.length : 0
        }
    };
}

async function generateSpecialOfferingsReport(startDate, endDate) {
    const filteredSpecialOfferings = state.specialOfferings.filter(s => {
        const date = new Date(s.date);
        return date >= startDate && date <= endDate;
    });

    return {
        specialOfferings: filteredSpecialOfferings,
        summary: {
            total: filteredSpecialOfferings.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0),
            count: filteredSpecialOfferings.length,
            average: filteredSpecialOfferings.length > 0 ? filteredSpecialOfferings.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0) / filteredSpecialOfferings.length : 0
        }
    };
}

async function generateCompleteFinancialReport(startDate, endDate) {
    const [summary, tithes, offerings, specialOfferings] = await Promise.all([
        generateFinancialSummaryReport(startDate, endDate),
        generateTithesReport(startDate, endDate),
        generateOfferingsReport(startDate, endDate),
        generateSpecialOfferingsReport(startDate, endDate)
    ]);

    return {
        summary: summary.summary,
        tithes: tithes,
        offerings: offerings,
        specialOfferings: specialOfferings
    };
}

// Função para gerar PDF
async function generatePDFReport(title, data, startDate, endDate, includeCharts) {
    // Para simplificar, vamos criar um PDF básico usando uma biblioteca externa
    // Em um ambiente real, você usaria jsPDF ou similar
    console.log('Gerando PDF:', { title, data, startDate, endDate });

    // Criar conteúdo HTML para o relatório
    let htmlContent = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; border-bottom: 2px solid #3a86ff; padding-bottom: 10px; }
                h2 { color: #666; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .total { font-weight: bold; font-size: 1.2em; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p><strong>Período:</strong> ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}</p>
            <p><strong>Data de geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    `;

    if (data.summary) {
        htmlContent += `
            <div class="summary">
                <h2>Resumo Financeiro</h2>
                <p><strong>Total de Dízimos:</strong> R$ ${data.summary.totalTithes?.toFixed(2) || '0.00'}</p>
                <p><strong>Total de Ofertas:</strong> R$ ${data.summary.totalOfferings?.toFixed(2) || '0.00'}</p>
                <p><strong>Total de Ofertas Especiais:</strong> R$ ${data.summary.totalSpecialOfferings?.toFixed(2) || '0.00'}</p>
                <p><strong>Entradas Manuais:</strong> R$ ${data.summary.totalIncomes?.toFixed(2) || '0.00'}</p>
                <p><strong>Saídas Manuais:</strong> R$ ${data.summary.totalExpenses?.toFixed(2) || '0.00'}</p>
                <p class="total"><strong>Saldo Líquido:</strong> R$ ${data.summary.netBalance?.toFixed(2) || '0.00'}</p>
            </div>
        `;
    }

    // Adicionar tabelas de dados detalhados
    if (data.tithes?.tithes) {
        htmlContent += `
            <h2>Dízimos Detalhados</h2>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Célula</th>
                        <th>Membro</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.tithes.tithes.forEach(tithe => {
            htmlContent += `
                <tr>
                    <td>${new Date(tithe.date).toLocaleDateString('pt-BR')}</td>
                    <td>R$ ${parseFloat(tithe.amount || 0).toFixed(2)}</td>
                    <td>${tithe.cell_name || '-'}</td>
                    <td>${tithe.member_name || '-'}</td>
                </tr>
            `;
        });
        htmlContent += '</tbody></table>';
    }

    htmlContent += '</body></html>';

    // Criar blob e download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Relatório HTML gerado com sucesso! (Para PDF completo, seria necessário integrar com jsPDF ou serviço externo)');
}

// Função para gerar CSV
function generateCSVReport(title, data, startDate, endDate) {
    let csvContent = `data:text/csv;charset=utf-8,`;

    // Cabeçalho
    csvContent += `"${title}"\n`;
    csvContent += `"Período: ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}"\n`;
    csvContent += `"Data de geração: ${new Date().toLocaleString('pt-BR')}"\n\n`;

    if (data.summary) {
        csvContent += `"RESUMO FINANCEIRO"\n`;
        csvContent += `"Total de Dízimos","R$ ${data.summary.totalTithes?.toFixed(2) || '0.00'}"\n`;
        csvContent += `"Total de Ofertas","R$ ${data.summary.totalOfferings?.toFixed(2) || '0.00'}"\n`;
        csvContent += `"Total de Ofertas Especiais","R$ ${data.summary.totalSpecialOfferings?.toFixed(2) || '0.00'}"\n`;
        csvContent += `"Entradas Manuais","R$ ${data.summary.totalIncomes?.toFixed(2) || '0.00'}"\n`;
        csvContent += `"Saídas Manuais","R$ ${data.summary.totalExpenses?.toFixed(2) || '0.00'}"\n`;
        csvContent += `"Saldo Líquido","R$ ${data.summary.netBalance?.toFixed(2) || '0.00'}"\n\n`;
    }

    if (data.tithes?.tithes) {
        csvContent += `"DÍZIMOS DETALHADOS"\n`;
        csvContent += `"Data","Valor","Célula","Membro"\n`;
        data.tithes.tithes.forEach(tithe => {
            csvContent += `"${new Date(tithe.date).toLocaleDateString('pt-BR')}","R$ ${parseFloat(tithe.amount || 0).toFixed(2)}","${tithe.cell_name || '-'}","${tithe.member_name || '-'}"\n`;
        });
        csvContent += '\n';
    }

    // Criar download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Relatório CSV gerado com sucesso!');
}

// Função para adicionar aos relatórios recentes
function addToRecentReports(title, startDate, endDate, format) {
    const recentReportsList = document.getElementById('recent-reports-list');
    const reportItem = document.createElement('div');
    reportItem.className = 'recent-report-item';
    reportItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div>
                <strong>${title}</strong><br>
                <small style="color: var(--text-muted);">
                    ${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')} • ${format.toUpperCase()}
                </small>
            </div>
            <small style="color: var(--text-muted);">${new Date().toLocaleTimeString('pt-BR')}</small>
        </div>
    `;

    // Remove a mensagem inicial se existir
    const noReportsMsg = recentReportsList.querySelector('p');
    if (noReportsMsg) {
        noReportsMsg.remove();
    }

    recentReportsList.insertBefore(reportItem, recentReportsList.firstChild);
}

// Função para fechar prévia do relatório
function closeReportPreview() {
    document.getElementById('report-preview').style.display = 'none';
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando aplicação...');

    // Check for existing session
    const { data: { session } } = await supabaseClient.auth.getSession();
    const role = sessionStorage.getItem('cbna_user_role');
    const cell = sessionStorage.getItem('cbna_user_cell');

    console.log('📋 Estado inicial:', {
        hasSession: !!session,
        role: role,
        cell: cell,
        pendingRole: pendingRole
    });

    // Independentemente de estar logado ou não, vamos carregar os dados públicos
    // Mas para os privados, precisamos do login.
    if (session) {
        console.log('✅ Sessão ativa encontrada, fazendo login automático...');
        const userRole = sessionStorage.getItem('cbna_user_role') || 'pastor';
        const userCell = sessionStorage.getItem('cbna_user_cell') || 'Administração';
        await handleLogin(userRole, userCell);
    } else if (role) {
        console.log('✅ Role encontrada no sessionStorage, fazendo login automático...');
        await handleLogin(role, cell);
    } else {
        console.log('❌ Nenhuma sessão ou role encontrada, mostrando tela de login...');
        await checkAuth();
    }

    lucide.createIcons();

    const dateInput = document.getElementById('form-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    const form = document.getElementById('cell-report-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    const setupForm = document.getElementById('cell-setup-form');
    if (setupForm) setupForm.addEventListener('submit', handleSetupSubmit);
    
    // Add event listener for token role change
    const tokenRoleSelect = document.getElementById('token-role');
    if (tokenRoleSelect) {
        tokenRoleSelect.addEventListener('change', function() {
            const cellNameGroup = document.getElementById('cell-name-group');
            const cellNameInput = document.getElementById('token-cell-name');
            if (this.value === 'treasurer') {
                cellNameGroup.querySelector('label').textContent = 'Nome do Tesoureiro';
                cellNameInput.placeholder = 'Ex: João Silva';
            } else {
                cellNameGroup.querySelector('label').textContent = 'Nome da Célula/Líder';
                cellNameInput.placeholder = 'Ex: Célula Videira';
            }
        });
    }
});

// Authentication Logic
let pendingRole = null;
let isSignUpMode = false;

function showTokenInput(role) {
    pendingRole = role;
    isSignUpMode = false;
    document.getElementById('login-options-initial').style.display = 'none';
    document.getElementById('token-login-form').style.display = 'block';

    if (role === 'pastor') {
        document.getElementById('pastor-login-fields').style.display = 'block';
        document.getElementById('leader-login-fields').style.display = 'none';
        document.getElementById('treasurer-login-fields').style.display = 'none';
        document.getElementById('pastor-auth-toggle').style.display = 'block';
        updateAuthUI();
    } else if (role === 'leader') {
        document.getElementById('pastor-login-fields').style.display = 'none';
        document.getElementById('leader-login-fields').style.display = 'block';
        document.getElementById('treasurer-login-fields').style.display = 'none';
        document.getElementById('pastor-auth-toggle').style.display = 'none';
    } else if (role === 'treasurer') {
        document.getElementById('pastor-login-fields').style.display = 'none';
        document.getElementById('leader-login-fields').style.display = 'none';
        document.getElementById('treasurer-login-fields').style.display = 'block';
        document.getElementById('pastor-auth-toggle').style.display = 'none';
    }
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    updateAuthUI();
}

function updateAuthUI() {
    const title = document.getElementById('auth-title');
    const extraFields = document.getElementById('signup-extra-fields');
    const submitBtn = document.getElementById('btn-login-confirm');
    const toggleLink = document.getElementById('auth-toggle-link');
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (isSignUpMode) {
        title.innerText = 'Criar Conta Pastoral';
        extraFields.style.display = 'block';
        submitBtn.innerText = 'Cadastrar';
        toggleLink.innerText = 'Já tem uma conta? Entrar';
    } else {
        title.innerText = 'Entrar como Pastor';
        extraFields.style.display = 'none';
        submitBtn.innerText = 'Entrar';
        toggleLink.innerText = 'Não tem uma conta? Criar conta';
    }
    lucide.createIcons();
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const btn = input.nextElementSibling;
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

function resetLogin() {
    pendingRole = null;
    document.getElementById('login-options-initial').style.display = 'flex';
    document.getElementById('token-login-form').style.display = 'none';
    document.getElementById('auth-error').style.display = 'none';
}

async function validateAccess() {
    console.log('🔑 Validando acesso para role:', pendingRole);
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    try {
        if (pendingRole === 'pastor') {
            console.log('👨‍⚖️ Login como pastor...');
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (isSignUpMode) {
                console.log('📝 Modo cadastro...');
                const confirm = document.getElementById('signup-password-confirm').value;
                if (password !== confirm) throw new Error('As senhas não coincidem!');
                if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');

                const { data, error } = await supabaseClient.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: { role: 'pastor' }
                    }
                });

                if (error) {
                    if (error.message.includes('already registered')) {
                        errorEl.innerText = 'Este e-mail já está cadastrado. Tente fazer login!';
                        errorEl.style.display = 'block';
                        setTimeout(() => {
                            isSignUpMode = false;
                            updateAuthUI();
                        }, 2000);
                        return;
                    }
                    throw error;
                }

                successEl.innerText = 'Conta criada com sucesso! Você já pode entrar.';
                successEl.style.display = 'block';
                isSignUpMode = false;
                updateAuthUI();
            } else {
                console.log('🔐 Fazendo login como pastor...');
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                console.log('✅ Login pastor bem-sucedido!');
                handleLogin('pastor', 'Administração');
            }
        } else {
            console.log('🎫 Login com token para role:', pendingRole);
            const tokenInput = document.getElementById('login-token').value || document.getElementById('treasurer-token').value;
            console.log('🔍 Procurando token:', tokenInput);

            let query = supabaseClient.from('tokens').select('*').eq('code', tokenInput);

            if (pendingRole === 'leader') {
                query = query.or('role.eq.leader,role.is.null');
            } else if (pendingRole === 'treasurer') {
                query = query.or('role.eq.treasurer,role.is.null');
            } else {
                query = query.eq('role', pendingRole);
            }

            const { data: tokens, error } = await query;
            if (error) throw error;

            console.log('📊 Tokens encontrados:', tokens);

            if (tokens && tokens.length > 0) {
                console.log('✅ Token válido encontrado:', tokens[0]);
                handleLogin(pendingRole, tokens[0].cell_name || 'Tesoureiro');
            } else {
                console.log('❌ Token inválido!');
                errorEl.innerText = 'Token inválido!';
                errorEl.style.display = 'block';
            }
        }
    } catch (err) {
        console.error('❌ Erro na validação:', err);
        errorEl.innerText = 'Erro: ' + (err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : err.message);
        errorEl.style.display = 'block';
    }
}

async function handleLogin(role, cellName) {
    console.log('🔐 Iniciando login para:', role, cellName);
    sessionStorage.setItem('cbna_user_role', role);
    sessionStorage.setItem('cbna_user_cell', cellName);

    document.body.className = `role-${role}`;

    try {
        console.log('📡 Carregando dados...');
        await loadData(); // AGUARDA os dados chegarem
        console.log('✅ Dados carregados com sucesso');
    } catch (error) {
        console.error('⚠️ Erro ao carregar dados, mas continuando com login:', error);
        // Mesmo se der erro nos dados, continua com o login
    }

    console.log('🔍 Verificando autenticação...');
    await checkAuth(); // Depois verifica a autorização e muda a tela
    console.log('✅ Login concluído!');
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('sb-junitbdhmsiaiqsnshkv-auth-token'); // Limpa o token do Supabase
    window.location.reload();
}

async function checkAuth() {
    console.log('🔐 Verificando autenticação...');
    const { data: { session } } = await supabaseClient.auth.getSession();
    const role = sessionStorage.getItem('cbna_user_role');
    const cellName = sessionStorage.getItem('cbna_user_cell');

    console.log('📋 Estado de autenticação:', {
        hasSession: !!session,
        role: role,
        cellName: cellName
    });

    const loginOverlay = document.getElementById('login-overlay');
    const mainSidebar = document.getElementById('main-sidebar');
    const mainContent = document.getElementById('main-content');

    if (session || role) {
        console.log('✅ Usuário autenticado, mostrando painel principal...');
        loginOverlay.style.display = 'none';
        mainSidebar.style.display = 'flex';
        mainContent.style.display = 'block';

        document.body.className = `role-${role}`;
        document.getElementById('current-user-role').innerText = role === 'pastor' ? 'Pastor' : role === 'treasurer' ? 'Tesoureiro' : `Líder: ${cellName}`;

        if (role === 'pastor') {
            switchView('pastor-view');
            renderAllCells();
            loadPastorNotes();
        } else if (role === 'treasurer') {
            switchView('pastor-financial');
        } else {
            // Busca a célula no estado carregado do Supabase
            const cellInfo = state.cells.find(c => c.name === cellName);

            // Se não existir informação ou se os líderes ainda forem o padrão de "Aguardando", força o setup
            const isConfigured = cellInfo && cellInfo.leaders && cellInfo.leaders !== 'Aguardando Setup';

            if (!isConfigured) {
                console.log('Novo líder detectado ou célula não configurada. Forçando Setup.');
                switchView('cell-setup');

                // Preenche o nome da célula automaticamente no campo bloqueado do setup
                const setupNameField = document.getElementById('setup-cell-name');
                if (setupNameField) setupNameField.value = cellName;

                // Esconde links do menu lateral para forçar o líder a configurar primeiro
                document.querySelectorAll('.nav-link').forEach(link => {
                    if (!link.innerText.includes('Configuração')) {
                        link.style.pointerEvents = 'none';
                        link.style.opacity = '0.5';
                    }
                });
            } else {
                // Se já estiver configurado, libera o menu e vai para o dashboard
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.style.pointerEvents = 'auto';
                    link.style.opacity = '1';
                });
                switchView('leader-view');
            }

            // Preenche os campos fixos do relatório
            const cellInput = document.getElementById('form-cell-name');
            if (cellInput) {
                cellInput.value = cellName;
                cellInput.readOnly = true;
            }
        }

        initCharts();
        updateDashboard();
        renderHistory();
        checkAlerts();
    } else {
        loginOverlay.style.display = 'flex';
        mainSidebar.style.display = 'none';
        mainContent.style.display = 'none';
    }
}

async function handleSetupSubmit(e) {
    e.preventDefault();
    const cellName = sessionStorage.getItem('cbna_user_cell');
    const cellData = {
        name: cellName,
        leaders: document.getElementById('setup-leaders').value,
        location: document.getElementById('setup-location').value,
        day: document.getElementById('setup-day').value,
        time: document.getElementById('setup-time').value,
        status: 'active'
    };

    const { error } = await supabaseClient.from('cells').upsert([cellData], { onConflict: 'name' });

    if (error) {
        alert('Erro ao salvar configuração: ' + error.message);
    } else {
        alert('Configuração salva com sucesso!');
        await loadData();
        await checkAuth(); // Destrava o menu e decide para onde ir
    }
}

async function generateToken() {
    const role = document.getElementById('token-role').value;
    const cellName = document.getElementById('token-cell-name').value;
    const customCode = document.getElementById('token-custom-code').value.trim().toUpperCase();

    if (role === 'leader' && !cellName) return alert('Digite o nome da célula');
    if (role === 'treasurer' && !cellName) return alert('Digite o nome do tesoureiro');

    // Se tiver código personalizado, usa ele. Se não, gera um aleatório.
    const tokenCode = customCode || Math.random().toString(36).substring(2, 8).toUpperCase();

    // Verifica se esse token já existe no banco para evitar duplicidade
    const { data: existing } = await supabaseClient.from('tokens').select('code').eq('code', tokenCode);
    if (existing && existing.length > 0) {
        return alert('Este token já está em uso. Escolha outro código.');
    }

    const newToken = {
        code: tokenCode,
        cell_name: role === 'leader' ? cellName : cellName || 'Tesoureiro',
        role: role
    };

    const { error } = await supabaseClient.from('tokens').insert([newToken]);

    if (error) {
        alert('Erro ao gerar token: ' + error.message);
    } else {
        alert(`Token para "${cellName}" criado com sucesso!`);
        await loadData();
        renderAllCells();
        document.getElementById('token-cell-name').value = '';
        document.getElementById('token-custom-code').value = '';
    }
}

function renderAllCells() {
    const tbody = document.getElementById('all-cells-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.tokens.forEach(t => {
        let displayName, leaders, status;
        if (t.role === 'treasurer') {
            displayName = `Tesoureiro: ${t.cell_name || 'Geral'}`;
            leaders = 'Tesoureiro';
            status = 'Ativo';
        } else {
            const cellInfo = state.cells.find(c => c.name === t.cell_name) || { leaders: 'Aguardando Setup', status: 'Inativo' };
            displayName = t.cell_name;
            leaders = cellInfo.leaders;
            status = cellInfo.leaders !== 'Aguardando Setup' ? 'Ativa' : 'Pendente';
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${displayName}</strong></td>
            <td>${leaders}</td>
            <td><code style="background: #eee; padding: 2px 6px; border-radius: 4px;">${t.code}</code></td>
            <td><span class="badge ${status === 'Ativa' || status === 'Ativo' ? 'badge-success' : ''}" style="${status === 'Ativa' || status === 'Ativo' ? 'background: #e8f5e9; color: #2e7d32;' : 'background: #f5f5f5; color: #999;'}">${status}</span></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn" style="padding: 4px 8px; font-size: 0.75rem; background: #e3f2fd; color: #1976d2;" onclick="openTokenEdit('${t.id}')">
                        <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="btn" style="padding: 4px 8px; font-size: 0.75rem; background: #fee2e2; color: #ef4444;" onclick="deleteToken('${t.id}')">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

let activeEditTokenId = null;

function openTokenEdit(tokenId) {
    const token = state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    activeEditTokenId = tokenId;
    document.getElementById('edit-token-cell-name').value = token.cell_name;
    document.getElementById('edit-token-code').value = token.code;
    document.getElementById('edit-token-modal').style.display = 'flex';
}

function closeTokenModal() {
    document.getElementById('edit-token-modal').style.display = 'none';
    activeEditTokenId = null;
}

async function saveTokenEdit() {
    const newName = document.getElementById('edit-token-cell-name').value;
    const newCode = document.getElementById('edit-token-code').value.toUpperCase();

    if (!newName || !newCode) return alert('Preencha todos os campos');

    const { error } = await supabaseClient.from('tokens')
        .update({ cell_name: newName, code: newCode })
        .eq('id', activeEditTokenId);

    if (error) {
        alert('Erro ao atualizar: ' + error.message);
    } else {
        alert('Acesso atualizado com sucesso!');
        await loadData();
        renderAllCells();
        closeTokenModal();
    }
}

async function deleteToken(tokenId) {
    if (!confirm('Tem certeza que deseja excluir este acesso? O líder não conseguirá mais entrar.')) return;

    const { error } = await supabaseClient.from('tokens').delete().eq('id', tokenId);

    if (error) {
        alert('Erro ao excluir: ' + error.message);
    } else {
        await loadData();
        renderAllCells();
    }
}

let activeNoteId = null;

async function saveActiveNote() {
    const title = document.getElementById('note-title-input').value || 'Sem Título';
    const content = document.getElementById('pastor-notes-area').value;
    const status = document.getElementById('save-status');

    const noteData = {
        title,
        content,
        updated_at: new Date().toISOString()
    };

    if (activeNoteId) {
        const { error } = await supabaseClient.from('pastor_notes').update(noteData).eq('id', activeNoteId);
        if (error) {
            console.error('Erro no update:', error);
            return alert('Erro ao salvar: ' + error.message);
        }
    } else {
        const { data, error } = await supabaseClient.from('pastor_notes').insert([noteData]).select();
        if (error) {
            console.error('Erro no insert:', error);
            return alert('Erro ao criar: ' + error.message);
        }
        if (data && data.length > 0) activeNoteId = data[0].id;
    }

    status.innerText = 'Salvo!';
    setTimeout(() => status.innerText = '', 2000);
    await loadPastorNotes();
}

async function loadPastorNotes() {
    const { data, error } = await supabaseClient.from('pastor_notes').select('*').order('updated_at', { ascending: false });
    if (error) return console.error('Erro ao carregar notas:', error);

    state.notes = data || [];
    renderNotesList();

    if (activeNoteId) {
        const active = state.notes.find(n => n.id === activeNoteId);
        if (active) displayNote(active);
    } else if (state.notes.length > 0) {
        selectNote(state.notes[0].id);
    }
}

function renderNotesList() {
    const list = document.getElementById('notes-list');
    list.innerHTML = '';

    state.notes.forEach(note => {
        const date = new Date(note.updated_at).toLocaleDateString();
        const snippet = note.content ? note.content.substring(0, 35) + '...' : 'Sem conteúdo';

        const div = document.createElement('div');
        div.className = `note-item ${activeNoteId === note.id ? 'active' : ''}`;
        div.style.padding = '1rem';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #eee';
        div.style.background = activeNoteId === note.id ? '#fff9c4' : 'transparent';
        div.onclick = () => selectNote(note.id);

        div.innerHTML = `
            <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${note.title || 'Sem Título'}</div>
            <div style="font-size: 0.75rem; color: #666; display: flex; gap: 8px;">
                <span>${date}</span>
                <span>${snippet}</span>
            </div>
        `;
        list.appendChild(div);
    });
}

function selectNote(id) {
    activeNoteId = id;
    const note = state.notes.find(n => n.id === id);
    if (note) displayNote(note);
    renderNotesList();
}

function displayNote(note) {
    document.getElementById('note-title-input').value = note.title || '';
    document.getElementById('pastor-notes-area').value = note.content || '';
    document.getElementById('note-date').innerText = `Editado em: ${new Date(note.updated_at).toLocaleString()}`;
}

function createNewNote() {
    activeNoteId = null;
    document.getElementById('note-title-input').value = '';
    document.getElementById('pastor-notes-area').value = '';
    document.getElementById('note-date').innerText = 'Nova Nota';
    renderNotesList();
}

async function deleteActiveNote() {
    if (!activeNoteId) return createNewNote();
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

    const { error } = await supabaseClient.from('pastor_notes').delete().eq('id', activeNoteId);
    if (error) return alert('Erro ao excluir: ' + error.message);

    activeNoteId = null;
    await loadPastorNotes();
    createNewNote();
}

// View Management
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    // Update Nav Active State
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(viewId)) {
            link.classList.add('active');
        }
    });

    if (viewId === 'pastor-view') {
        updateDashboard();
        setTimeout(() => { if (growthChart) growthChart.update(); }, 100);
    }
    if (viewId === 'leader-view') {
        renderHistory();
        updateLeaderDashboard();
        setTimeout(() => { if (leaderGrowthChart) leaderGrowthChart.update(); }, 100);
    }
    if (viewId === 'report-form') {
        populateCellDatalist();
        preFillReportForm();
    }
    if (viewId === 'pastor-cells') renderAllCells();
    if (viewId === 'pastor-notes') loadPastorNotes();
    if (viewId === 'pastor-financial') updateFinancialDashboard();
    if (viewId === 'cell-details') {
        // Detalhes individuais já chamam o próprio update
    }
    lucide.createIcons();
}

let leaderGrowthChart = null;

function updateLeaderDashboard() {
    const cellName = sessionStorage.getItem('cbna_user_cell');
    const cellReports = state.reports.filter(r => r.cell_name === cellName);

    // Metrics
    const totalMembers = cellReports.reduce((sum, r) => sum + (r.members || 0), 0);
    const avgMembers = cellReports.length > 0 ? (totalMembers / cellReports.length).toFixed(1) : 0;
    const totalVisitors = cellReports.reduce((sum, r) => sum + (r.visitors || 0), 0);
    const meetingsHeld = cellReports.filter(r => r.occurred !== false).length;
    const frequency = cellReports.length > 0 ? Math.round((meetingsHeld / cellReports.length) * 100) : 0;

    document.getElementById('leader-metric-members').innerText = avgMembers;
    document.getElementById('leader-metric-visitors').innerText = totalVisitors;
    document.getElementById('leader-metric-frequency').innerText = frequency + '%';

    // Chart
    const ctx = document.getElementById('leaderGrowthChart').getContext('2d');
    const chartData = cellReports.slice(0, 10).reverse();

    if (leaderGrowthChart) leaderGrowthChart.destroy();

    leaderGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(r => new Date(r.date).toLocaleDateString()),
            datasets: [{
                label: 'Membros',
                data: chartData.map(r => r.members),
                borderColor: '#3a86ff',
                backgroundColor: 'rgba(58, 134, 255, 0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Visitantes',
                data: chartData.map(r => r.visitors),
                borderColor: '#2e7d32',
                borderDash: [5, 5],
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function preFillReportForm() {
    const cellName = sessionStorage.getItem('cbna_user_cell');
    const cellInfo = state.cells.find(c => c.name === cellName);

    if (cellInfo) {
        const leadersInput = document.getElementById('form-leaders');
        const locationInput = document.getElementById('form-location');
        const startTimeInput = document.getElementById('form-start-time');

        if (leadersInput) leadersInput.value = cellInfo.leaders || '';
        if (locationInput) locationInput.value = cellInfo.location || '';
        if (startTimeInput) startTimeInput.value = cellInfo.time || '';

        console.log('Formulário pré-preenchido com dados da configuração para:', cellName);
    }
}

// Data Handling
async function loadData() {
    console.log('🔄 Buscando dados atualizados...');

    const sources = [
        { key: 'reports', table: 'reports', order: { column: 'date', ascending: false } },
        { key: 'cells', table: 'cells' },
        { key: 'tokens', table: 'tokens' },
        { key: 'tithes', table: 'tithes', order: { column: 'date', ascending: false } },
        { key: 'offerings', table: 'offerings', order: { column: 'date', ascending: false } },
        { key: 'specialOfferings', table: 'special_offerings', order: { column: 'date', ascending: false } },
        { key: 'campaigns', table: 'campaigns' },
        { key: 'financialTransactions', table: 'financial_transactions', order: { column: 'date', ascending: false } }
    ];

    const missingTables = [];
    const failedQueries = [];

    for (const source of sources) {
        try {
            let query = supabaseClient.from(source.table).select('*');
            if (source.order) {
                query = query.order(source.order.column, { ascending: source.order.ascending });
            }
            const { data, error } = await query;
            if (error) {
                console.warn(`⚠️ Falha ao carregar tabela ${source.table}:`, error.message);
                failedQueries.push({ table: source.table, message: error.message });
                if (error.message && error.message.includes('Could not find the table')) {
                    missingTables.push(source.table);
                }
                state[source.key] = [];
                continue;
            }
            state[source.key] = data || [];
        } catch (err) {
            console.error(`❌ Erro inesperado ao carregar ${source.table}:`, err);
            state[source.key] = [];
            failedQueries.push({ table: source.table, message: err.message });
        }
    }

    console.log('📊 Estado atualizado:', {
        reports: state.reports.length,
        cells: state.cells.length,
        tokens: state.tokens.length,
        tithes: state.tithes.length,
        offerings: state.offerings.length,
        specialOfferings: state.specialOfferings.length,
        campaigns: state.campaigns.length,
        transactions: state.financialTransactions.length
    });

    initCharts();
    updateDashboard();
    renderHistory();
    renderAllCells();
    updateFinancialDashboard();

    if (missingTables.length > 0) {
        const uniqueMissing = [...new Set(missingTables)].join(', ');
        alert(`Erro ao carregar dados: tabelas ausentes no Supabase: ${uniqueMissing}.\nExecute o SQL de criação de tabelas no Supabase ou verifique se está usando o projeto correto.`);
    } else if (failedQueries.length > 0) {
        console.warn('🔧 Algumas consultas falharam:', failedQueries);
        alert('Algumas tabelas não puderam ser carregadas. Veja o console do navegador para detalhes.');
    }
}

// Remover mock data para evitar conflitos de dados

function populateCellDatalist() {
    const datalist = document.getElementById('cell-list');
    if (!datalist) return;

    datalist.innerHTML = '';
    const cellNames = [...new Set(state.reports.map(r => r.cell_name))];
    cellNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const cellName = sessionStorage.getItem('cbna_user_cell');
    const cellInfo = state.cells.find(c => c.name === cellName);

    // Handle Photo Upload
    const photoFile = document.getElementById('form-photo').files[0];
    let photoData = null;
    if (photoFile) {
        photoData = await toBase64(photoFile);
    }

    const newReport = {
        date: document.getElementById('form-date').value,
        cell_name: cellName,
        leaders: cellInfo ? cellInfo.leaders : 'Líder',
        location: cellInfo ? cellInfo.location : '',
        start_time: document.getElementById('form-start-time').value,
        end_time: document.getElementById('form-end-time').value,
        members: parseInt(document.getElementById('form-members').value) || 0,
        visitors: parseInt(document.getElementById('form-visitors').value) || 0,
        occurred: document.getElementById('form-occurred').value,
        notes: document.getElementById('form-notes').value,
        photo: photoData,
        timestamp: new Date(document.getElementById('form-date').value + 'T12:00:00').getTime()
    };

    const { error } = await supabaseClient.from('reports').insert([newReport]);

    if (error) {
        alert('Erro ao enviar relatório: ' + error.message);
    } else {
        alert('Relatório enviado com sucesso!');
        e.target.reset();
        document.getElementById('form-date').valueAsDate = new Date();
        await loadData();
        switchView('leader-view');
    }
}

// Utility to convert file to Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Calculations & Dashboard
function updateDashboard() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filtra relatórios dos últimos 30 dias
    const recentReports = state.reports.filter(r => new Date(r.date) >= thirtyDaysAgo);

    // 1. Total de Visitantes no período
    const totalVisitors = recentReports.reduce((sum, r) => sum + (r.visitors || 0), 0);

    // 2. Total de Membros (Soma do último relatório de cada célula)
    const cellNames = [...new Set(state.reports.map(r => r.cell_name))];
    const currentTotalMembers = cellNames.reduce((sum, name) => {
        const lastReport = state.reports
            .filter(r => r.cell_name === name)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return sum + (lastReport ? (lastReport.members || 0) : 0);
    }, 0);

    // 3. Taxa de Conversão (Membros / Total de Pessoas)
    // Isso mostra que % das pessoas que passaram pela célula são membros efetivos
    const totalPeople = currentTotalMembers + totalVisitors;
    const conversionRate = totalPeople > 0 ? ((currentTotalMembers / totalPeople) * 100).toFixed(1) : 0;

    document.getElementById('metric-total-members').innerText = currentTotalMembers;
    document.getElementById('metric-total-visitors').innerText = totalVisitors;
    document.getElementById('metric-conversion-rate').innerText = conversionRate + '%';
    document.getElementById('metric-active-cells').innerText = cellNames.length;

    // Render Dashboard Cells Table
    const dashTbody = document.getElementById('dashboard-cells-body');
    if (dashTbody) {
        dashTbody.innerHTML = '';
        cellNames.forEach(name => {
            const cellInfo = state.cells.find(c => c.name === name) || { leaders: 'Aguardando Setup' };
            const lastReport = state.reports
                .filter(r => r.cell_name === name)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${name}</strong></td>
                <td>${cellInfo.leaders}</td>
                <td>${lastReport ? (lastReport.members || 0) : 0}</td>
                <td>${lastReport ? lastReport.date : 'Nunca'}</td>
                <td>
                    <button class="btn" style="padding: 4px 8px; background: #e3f2fd; color: #1976d2;" onclick="viewCellDetails('${name}')">
                        <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                    </button>
                </td>
            `;
            dashTbody.appendChild(tr);
        });
    }

    updateCharts();
    checkAlerts();
    updateFinancialDashboard();
}

let growthChart = null;
let performanceChart = null;

function initCharts() {
    console.log('Inicializando gráficos...');
    const ctxGrowth = document.getElementById('growthChart');
    const ctxPerf = document.getElementById('performanceChart');

    if (!ctxGrowth || !ctxPerf) {
        console.warn('Elementos de gráfico não encontrados. Pulando inicialização.');
        return;
    }

    if (growthChart) growthChart.destroy();
    if (performanceChart) performanceChart.update();

    growthChart = new Chart(ctxGrowth.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Semana 4', 'Semana 3', 'Semana 2', 'Semana 1 (Atual)'],
            datasets: [{
                label: 'Presença de Membros',
                data: [0, 0, 0, 0],
                borderColor: '#001f3f',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(0, 31, 63, 0.05)',
                pointBackgroundColor: '#3a86ff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    performanceChart = new Chart(ctxPerf.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Visitantes',
                data: [],
                backgroundColor: '#3a86ff',
                borderRadius: 4
            }, {
                label: 'Membros',
                data: [],
                backgroundColor: '#001f3f',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

let detailGrowthChart = null;

async function viewCellDetails(cellName) {
    const cellReports = state.reports.filter(r => r.cell_name === cellName);
    const cellInfo = state.cells.find(c => c.name === cellName) || { leaders: '---' };

    // Switch View
    switchView('cell-details');

    // Header
    document.getElementById('detail-cell-name').innerText = cellName;
    document.getElementById('detail-cell-leaders').innerText = `Liderança: ${cellInfo.leaders}`;

    // Metrics
    const totalMembers = cellReports.reduce((sum, r) => sum + (r.members || 0), 0);
    const avgMembers = cellReports.length > 0 ? (totalMembers / cellReports.length).toFixed(1) : 0;
    const held = cellReports.filter(r => r.occurred !== 'nao').length;
    const frequency = cellReports.length > 0 ? Math.round((held / cellReports.length) * 100) : 0;

    document.getElementById('detail-metric-members').innerText = avgMembers;
    document.getElementById('detail-metric-frequency').innerText = frequency + '%';

    // Chart
    const ctx = document.getElementById('detailGrowthChart').getContext('2d');
    const chartData = cellReports.slice(0, 10).reverse();

    if (detailGrowthChart) detailGrowthChart.destroy();
    detailGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(r => new Date(r.date).toLocaleDateString()),
            datasets: [{
                label: 'Membros',
                data: chartData.map(r => r.members),
                borderColor: '#3a86ff',
                backgroundColor: 'rgba(58, 134, 255, 0.1)',
                fill: true,
                tension: 0.4
            }, {
                label: 'Visitantes',
                data: chartData.map(r => r.visitors),
                borderColor: '#2e7d32',
                borderDash: [5, 5],
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom' } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // History Table (Sorted newest first)
    const tbody = document.getElementById('detail-history-body');
    tbody.innerHTML = '';
    
    const sortedReports = [...cellReports].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedReports.forEach(r => {
        const tr = document.createElement('tr');
        const formattedDate = new Date(r.date + 'T12:00:00').toLocaleDateString();
        const photoSource = r.photo || r.photo_url;
        const photoHtml = photoSource ? `<img src="${photoSource}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="viewPhoto('${photoSource}')">` : '---';
        const occurredIcon = (r.occurred === 'sim' || r.occurred === true) ? '✅' : '❌';

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td>${r.members || 0}</td>
            <td>${r.visitors || 0}</td>
            <td>${photoHtml}</td>
            <td>${occurredIcon}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function updateCharts() {
    if (!growthChart || !performanceChart) {
        console.log('Gráficos não inicializados. Tentando inicializar...');
        initCharts();
        if (!growthChart || !performanceChart) return;
    }

    console.log('Atualizando dados dos gráficos...');
    
    // 1. Gráfico de Crescimento Semanal (Membros)
    const weeklyData = [0, 0, 0, 0];
    const now = new Date();
    // Definimos o "hoje" como o final do dia atual para que relatórios de hoje tenham diffDays = 0
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    state.reports.forEach(r => {
        if (r.occurred === 'sim' || r.occurred === true) {
            // Criamos a data do relatório garantindo o fuso correto
            const [year, month, day] = r.date.split('-').map(Number);
            const reportDate = new Date(year, month - 1, day, 12, 0, 0);
            
            const diffTime = todayEnd.getTime() - reportDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // diffDays 0-6 = Semana 1 (índice 3)
            // diffDays 7-13 = Semana 2 (índice 2)
            // ...
            const weekIndex = 3 - Math.floor(diffDays / 7);
            
            if (weekIndex >= 0 && weekIndex < 4) {
                weeklyData[weekIndex] += (parseInt(r.members) || 0);
            }
        }
    });
    
    console.log('DEBUG - Relatórios processados:', state.reports.length);
    console.log('DEBUG - Dados das semanas [S4, S3, S2, S1]:', weeklyData);
    
    growthChart.data.datasets[0].data = weeklyData;
    growthChart.update();
    
    // 2. Gráfico de Desempenho (Média de Membros e Visitantes por Célula)
    const cellStats = {};
    const cellNames = [...new Set(state.reports.map(r => r.cell_name))];
    
    cellNames.forEach(name => {
        cellStats[name] = { members: 0, visitors: 0, count: 0 };
    });
    
    state.reports.forEach(r => {
        if (r.occurred === 'sim' || r.occurred === true) {
            if (cellStats[r.cell_name]) {
                cellStats[r.cell_name].members += (Number(r.members) || 0);
                cellStats[r.cell_name].visitors += (Number(r.visitors) || 0);
                cellStats[r.cell_name].count++;
            }
        }
    });
    
    performanceChart.data.labels = Object.keys(cellStats);
    performanceChart.data.datasets[0].data = Object.values(cellStats).map(s => s.count > 0 ? (s.visitors / s.count).toFixed(1) : 0);
    performanceChart.data.datasets[1].data = Object.values(cellStats).map(s => s.count > 0 ? (s.members / s.count).toFixed(1) : 0);
    performanceChart.update('none');
}

function checkAlerts() {
    const tbody = document.getElementById('alerts-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const cellNames = [...new Set(state.reports.map(r => r.cell_name))];
    
    cellNames.forEach(cellName => {
        const cellReports = state.reports
            .filter(r => r.cell_name === cellName)
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ordem cronológica (mais antigo primeiro)
        
        if (cellReports.length === 0) return;

        const last3 = [...cellReports].reverse().slice(0, 3); // Últimos 3 (mais novo primeiro)
        const latest = last3[0];
        
        let alertMsg = '';
        let type = 'danger';
        
        // 1. Inatividade Crítica (2 semanas sem reunião realizada)
        const recentHeld = cellReports.filter(r => new Date(r.date) > twoWeeksAgo && r.occurred === 'sim');
        if (recentHeld.length === 0 && cellReports.length > 0) {
            alertMsg = 'Inatividade Crítica: 2+ semanas sem reunião';
        } 
        
        // 2. Queda Consistente (Se as últimas 3 semanas tiveram queda real)
        else if (last3.length >= 3) {
            if (last3[0].members < last3[1].members && last3[1].members < last3[2].members) {
                alertMsg = 'Atenção: Queda persistente de membros (3 semanas)';
                type = 'warning';
            }
        }

        // 3. Oportunidade / Consolidação (Média de visitantes alta mas sem aumento de membros)
        if (!alertMsg && last3.length >= 3) {
            const avgVisitors = last3.reduce((sum, r) => sum + r.visitors, 0) / last3.length;
            const netGrowth3 = last3[0].members - last3[2].members; 
            
            if (avgVisitors >= 2 && netGrowth3 <= 0) {
                alertMsg = 'Oportunidade: Muitos visitantes sem conversão. Apoie a consolidação!';
                type = 'success';
            }
        }

        // 4. Estagnação (4 semanas sem crescimento e sem visitantes)
        const last4 = [...cellReports].reverse().slice(0, 4);
        if (!alertMsg && last4.length >= 4) {
            const totalVisitors4 = last4.reduce((sum, r) => sum + r.visitors, 0);
            const growth4 = last4[0].members - last4[3].members;
            if (totalVisitors4 === 0 && growth4 <= 0) {
                alertMsg = 'Alerta de Estagnação: Sem novos visitantes há 1 mês';
                type = 'warning';
            }
        }

        if (alertMsg) {
            const tr = document.createElement('tr');
            let badgeClass = 'badge-danger';
            let badgeStyle = '';
            
            if (type === 'success') {
                badgeClass = 'badge-success';
                badgeStyle = 'background: #e8f5e9; color: #2e7d32; border: 1px solid #2e7d32';
            } else if (type === 'warning') {
                badgeClass = 'badge-warning';
                badgeStyle = 'background: #fff3e0; color: #e65100; border: 1px solid #ffcc80';
            }

            tr.innerHTML = `
                <td><strong>${cellName}</strong></td>
                <td><span class="badge ${badgeClass}" style="${badgeStyle}">${alertMsg}</span></td>
                <td>${latest ? latest.date : '---'}</td>
            `;
            tbody.appendChild(tr);
        }
    });
}

function renderHistory() {
    const role = sessionStorage.getItem('cbna_user_role');
    const cellName = sessionStorage.getItem('cbna_user_cell');
    const tbody = document.getElementById('history-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filteredReports = state.reports;
    if (role === 'leader') {
        filteredReports = state.reports.filter(r => r.cell_name === cellName);
    }

    filteredReports.slice(0, 15).forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.date}</td>
            <td><strong>${r.cell_name}</strong></td>
            <td>${r.members}</td>
            <td>${r.visitors}</td>
            <td>${r.photo ? `<img src="${r.photo}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid #ddd;" onclick="viewPhoto('${r.photo}')">` : '<span style="color: #ccc;">-</span>'}</td>
            <td>${r.occurred === 'sim' ? '✅' : '❌'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function viewPhoto(data) {
    const win = window.open("");
    win.document.write(`<img src="${data}" style="max-width: 100%; border-radius: 8px; margin: 20px auto; display: block;">`);
    win.document.title = "Foto da Célula";
}

function contactLeader(cellName) {
    alert(`Redirecionando para o WhatsApp do líder da ${cellName}...`);
}

// FINANCIAL DASHBOARD FUNCTIONS
let currentFinancialFilter = 'month';
let currentFinancialTab = 'summary';
let financialChart = null;

function setFinancialFilter(filter, button) {
    currentFinancialFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    updateFinancialDashboard();
}

function switchFinancialTab(tab) {
    const isFinance = canEditFinances();
    if (tab === 'manual' && !isFinance) {
        tab = 'summary';
    }

    currentFinancialTab = tab;
    document.getElementById('finance-tab-summary').classList.toggle('active', tab === 'summary');
    document.getElementById('finance-tab-manual').classList.toggle('active', tab === 'manual');
    document.getElementById('finance-tab-reports').classList.toggle('active', tab === 'reports');
    document.getElementById('financial-summary-section').classList.toggle('hidden', tab !== 'summary');
    document.getElementById('financial-manual-section').classList.toggle('hidden', tab !== 'manual');
    document.getElementById('financial-reports-section').classList.toggle('hidden', tab !== 'reports');
    if (tab === 'manual') {
        updateManualTransactionsTable();
    }
    if (tab === 'reports') {
        // Definir datas padrão para o mês atual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        document.getElementById('report-start-date').value = startOfMonth.toISOString().split('T')[0];
        document.getElementById('report-end-date').value = endOfMonth.toISOString().split('T')[0];
    }
}

function canEditFinances() {
    const role = sessionStorage.getItem('cbna_user_role');
    return role === 'financeiro' || role === 'treasurer';
}

function getFinancialDateRange() {
    const now = new Date();
    let startDate, endDate;

    switch (currentFinancialFilter) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case 'custom':
            const startInput = document.getElementById('financial-start-date').value;
            const endInput = document.getElementById('financial-end-date').value;
            if (startInput && endInput) {
                startDate = new Date(startInput);
                endDate = new Date(endInput + 'T23:59:59');
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            }
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { startDate, endDate };
}

function filterFinancialData(data, startDate, endDate) {
    return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
    });
}

function parseManualDescription(description) {
    if (!description) return { category: '', notes: '' };
    const [category, notes] = description.split('||');
    return { category: category || '', notes: notes || '' };
}

function formatBRL(value) {
    return `R$ ${parseFloat(value || 0).toFixed(2)}`;
}

function updateFinancialDashboard() {
    const { startDate, endDate } = getFinancialDateRange();
    const isFinance = canEditFinances();

    const filteredTithes = filterFinancialData(state.tithes, startDate, endDate);
    const filteredOfferings = filterFinancialData(state.offerings, startDate, endDate);
    const filteredSpecialOfferings = filterFinancialData(state.specialOfferings, startDate, endDate);
    const filteredTransactions = filterFinancialData(state.financialTransactions, startDate, endDate);

    const totalTithes = filteredTithes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalOfferings = filteredOfferings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
    const totalSpecialOfferings = filteredSpecialOfferings.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

    const manualIncomes = filteredTransactions.filter(t => t.type === 'manual_income');
    const manualExpenses = filteredTransactions.filter(t => t.type === 'manual_expense');
    const totalIncomes = manualIncomes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalExpenses = manualExpenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const totalAmount = totalTithes + totalOfferings + totalSpecialOfferings + totalIncomes - totalExpenses;
    const totalContributions = filteredTithes.length + filteredOfferings.length + filteredSpecialOfferings.length + manualIncomes.length;

    document.getElementById('financial-total-month').innerText = formatBRL(totalAmount);
    document.getElementById('financial-inflows').innerText = formatBRL(totalTithes + totalOfferings + totalSpecialOfferings + totalIncomes);
    document.getElementById('financial-outflows').innerText = formatBRL(totalExpenses);
    document.getElementById('financial-balance').innerText = formatBRL(totalAmount);
    document.getElementById('financial-tithes').innerText = formatBRL(totalTithes);
    document.getElementById('financial-offerings').innerText = formatBRL(totalOfferings);
    document.getElementById('financial-contributions').innerText = totalContributions;

    document.getElementById('finance-tab-manual').style.display = isFinance ? 'inline-flex' : 'none';
    document.getElementById('financial-manual-warning').classList.toggle('hidden', isFinance);
    document.getElementById('financial-manual-form').classList.toggle('hidden', !isFinance);

    if (!isFinance && currentFinancialTab === 'manual') {
        currentFinancialTab = 'summary';
        switchFinancialTab('summary');
    }

    const previousPeriod = getPreviousPeriod(startDate, endDate);
    const prevFilteredTithes = filterFinancialData(state.tithes, previousPeriod.startDate, previousPeriod.endDate);
    const prevFilteredOfferings = filterFinancialData(state.offerings, previousPeriod.startDate, previousPeriod.endDate);
    const prevFilteredSpecialOfferings = filterFinancialData(state.specialOfferings, previousPeriod.startDate, previousPeriod.endDate);
    const prevFilteredTransactions = filterFinancialData(state.financialTransactions, previousPeriod.startDate, previousPeriod.endDate);
    const prevPositiveTransactions = prevFilteredTransactions.filter(t => t.type !== 'manual_expense');
    const prevNegativeTransactions = prevFilteredTransactions.filter(t => t.type === 'manual_expense');
    const prevTotal = prevFilteredTithes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) +
        prevFilteredOfferings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0) +
        prevFilteredSpecialOfferings.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0) +
        prevPositiveTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) -
        prevNegativeTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const growth = prevTotal > 0 ? ((totalAmount - prevTotal) / prevTotal * 100) : 0;
    const growthElement = document.getElementById('financial-growth-trend');
    if (growthElement) {
        growthElement.innerHTML = `<i data-lucide="${growth >= 0 ? 'trending-up' : 'trending-down'}"></i> ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% vs período anterior`;
        growthElement.className = `card-trend ${growth >= 0 ? 'trend-up' : 'trend-down'}`;
    }

    updateFinancialSummaryTable(filteredTithes, filteredOfferings, filteredSpecialOfferings, manualIncomes, manualExpenses);
    updateFinancialChart(startDate, endDate);
    updateMainFinancialCard(totalAmount, growth);
    updateManualTransactionsTable();
    lucide.createIcons();
}

function getPreviousPeriod(startDate, endDate) {
    const diff = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - diff);

    return { startDate: prevStartDate, endDate: prevEndDate };
}

function updateFinancialSummaryTable(tithes, offerings, specialOfferings, manualIncomes = [], manualExpenses = []) {
    const tbody = document.getElementById('financial-summary-body');
    if (!tbody) return;

    const tithesCount = tithes.length;
    const tithesTotal = tithes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const tithesAvg = tithesCount > 0 ? tithesTotal / tithesCount : 0;

    const offeringsCount = offerings.length;
    const offeringsTotal = offerings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
    const offeringsAvg = offeringsCount > 0 ? offeringsTotal / offeringsCount : 0;

    const specialCount = specialOfferings.length;
    const specialTotal = specialOfferings.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    const specialAvg = specialCount > 0 ? specialTotal / specialCount : 0;

    const manualIncomesCount = manualIncomes.length;
    const manualIncomesTotal = manualIncomes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const manualIncomesAvg = manualIncomesCount > 0 ? manualIncomesTotal / manualIncomesCount : 0;

    const manualExpensesCount = manualExpenses.length;
    const manualExpensesTotal = manualExpenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const manualExpensesAvg = manualExpensesCount > 0 ? manualExpensesTotal / manualExpensesCount : 0;

    tbody.innerHTML = `
        <tr>
            <td>Dízimos</td>
            <td>${tithesCount}</td>
            <td>${formatBRL(tithesTotal)}</td>
            <td>${formatBRL(tithesAvg)}</td>
        </tr>
        <tr>
            <td>Ofertas</td>
            <td>${offeringsCount}</td>
            <td>${formatBRL(offeringsTotal)}</td>
            <td>${formatBRL(offeringsAvg)}</td>
        </tr>
        <tr>
            <td>Ofertas Especiais</td>
            <td>${specialCount}</td>
            <td>${formatBRL(specialTotal)}</td>
            <td>${formatBRL(specialAvg)}</td>
        </tr>
        <tr>
            <td>Lançamentos Manuais</td>
            <td>${manualIncomesCount + manualExpensesCount}</td>
            <td>${formatBRL(manualIncomesTotal - manualExpensesTotal)}</td>
            <td>${formatBRL((manualIncomesCount + manualExpensesCount) > 0 ? (manualIncomesTotal - manualExpensesTotal) / (manualIncomesCount + manualExpensesCount) : 0)}</td>
        </tr>
    `;
}

// Função para alternar campos baseado no tipo de transação
function toggleTransactionFields() {
    const type = document.getElementById('manual-transaction-type').value;
    const incomeFields = document.getElementById('income-fields');
    const expenseFields = document.getElementById('expense-fields');

    if (type === 'manual_income') {
        incomeFields.style.display = 'block';
        expenseFields.style.display = 'none';
        toggleIncomeSpecificFields(); // Atualizar campos específicos de entrada
    } else {
        incomeFields.style.display = 'none';
        expenseFields.style.display = 'block';
    }
}

// Função para alternar campos específicos de entrada
function toggleIncomeSpecificFields() {
    const category = document.getElementById('income-category').value;
    const titheFields = document.getElementById('tithe-fields');
    const collectionFields = document.getElementById('collection-fields');

    titheFields.style.display = category === 'tithe' ? 'block' : 'none';
    collectionFields.style.display = category === 'collection' ? 'block' : 'none';
}

async function createManualTransaction() {
    if (!canEditFinances()) {
        alert('Apenas a equipe financeira pode registrar lançamentos manuais.');
        return;
    }

    const type = document.getElementById('manual-transaction-type').value;
    const amount = parseFloat(document.getElementById('manual-transaction-amount').value || '0');
    const date = document.getElementById('manual-transaction-date').value;
    const notes = document.getElementById('manual-transaction-description').value || '';

    if (!amount || !date) {
        alert('Preencha a data e o valor.');
        return;
    }

    let category = '';
    let description = '';

    if (type === 'manual_income') {
        const incomeCategory = document.getElementById('income-category').value;

        if (incomeCategory === 'tithe') {
            const memberName = document.getElementById('tithe-member-name').value.trim();
            if (!memberName) {
                alert('Nome do dizimista é obrigatório para lançamentos de dízimo.');
                return;
            }
            category = 'Dízimo';
            description = `Dízimo de ${memberName}||${notes}`;
        } else if (incomeCategory === 'offering') {
            category = 'Oferta';
            description = `Oferta||${notes}`;
        } else if (incomeCategory === 'collection') {
            const source = document.getElementById('collection-source').value.trim();
            if (!source) {
                alert('Origem da contribuição é obrigatória para arrecadações.');
                return;
            }
            category = 'Arrecadação';
            description = `Arrecadação: ${source}||${notes}`;
        }
    } else {
        const reason = document.getElementById('expense-reason').value.trim();
        if (!reason) {
            alert('Motivo da saída é obrigatório.');
            return;
        }
        category = reason;
        description = `Saída: ${reason}||${notes}`;
    }

    const transactionData = {
        type,
        amount,
        date,
        description
    };

    try {
        const { error } = await supabaseClient.from('financial_transactions').insert([transactionData]);
        if (error) {
            throw error;
        }

        alert('Lançamento manual registrado com sucesso!');

        // Limpar todos os campos
        document.getElementById('manual-transaction-amount').value = '';
        document.getElementById('manual-transaction-date').value = '';
        document.getElementById('manual-transaction-description').value = '';
        document.getElementById('tithe-member-name').value = '';
        document.getElementById('collection-source').value = '';
        document.getElementById('expense-reason').value = '';

        await loadData();
        switchFinancialTab('manual');
    } catch (err) {
        console.error('Erro ao salvar lançamento manual:', err);
        alert('Erro ao salvar lançamento: ' + (err.message || err));
    }
}

function updateManualTransactionsTable() {
    const tbody = document.getElementById('financial-manual-body');
    if (!tbody) return;

    const transactions = state.financialTransactions
        .filter(t => ['manual_income', 'manual_expense'].includes(t.type))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    tbody.innerHTML = transactions.map(tx => {
        const dateStr = new Date(tx.date).toLocaleDateString('pt-BR');
        const { category, notes } = parseManualDescription(tx.description);
        const direction = tx.type === 'manual_expense' ? 'Saída' : 'Entrada';

        // Formatar categoria baseada no tipo
        let displayCategory = category;
        if (tx.type === 'manual_income') {
            if (category.startsWith('Dízimo de ')) {
                displayCategory = 'Dízimo';
            } else if (category === 'Oferta') {
                displayCategory = 'Oferta';
            } else if (category.startsWith('Arrecadação:')) {
                displayCategory = 'Arrecadação';
            }
        } else {
            displayCategory = category.replace('Saída: ', '');
        }

        return `
            <tr>
                <td>${dateStr}</td>
                <td>${direction}</td>
                <td>${displayCategory}</td>
                <td>${formatBRL(tx.amount)}</td>
                <td>${notes}</td>
            </tr>
        `;
    }).join('');
}

function updateFinancialChart(startDate, endDate) {
    const ctx = document.getElementById('financialChart');
    if (!ctx) return;

    const weeks = {};
    const allData = [
        ...state.tithes.map(item => ({ ...item, sign: 1, category: 'Dízimo' })),
        ...state.offerings.map(item => ({ ...item, sign: 1, category: 'Oferta' })),
        ...state.specialOfferings.map(item => ({ ...item, sign: 1, category: 'Oferta Especial' })),
        ...state.financialTransactions.map(item => ({ ...item, sign: item.type === 'manual_expense' ? -1 : 1, category: item.type }))
    ];

    allData.forEach(item => {
        const date = new Date(item.date);
        if (date >= startDate && date <= endDate) {
            const weekKey = getWeekKey(date);
            if (!weeks[weekKey]) weeks[weekKey] = 0;
            weeks[weekKey] += parseFloat(item.amount || 0) * item.sign;
        }
    });

    const entries = Object.entries(weeks).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const labels = entries.map(entry => entry[0]);
    const data = entries.map(entry => entry[1]);

    if (financialChart) financialChart.destroy();

    financialChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Fluxo Líquido',
                data,
                borderColor: '#001f3f',
                tension: 0.3,
                fill: true,
                backgroundColor: 'rgba(0, 31, 63, 0.08)',
                pointBackgroundColor: '#3a86ff'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => 'R$ ' + value.toFixed(0)
                    }
                }
            }
        }
    });
}

function getWeekKey(date) {
    const year = date.getFullYear();
    const weekNum = Math.ceil((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
    return `Semana ${weekNum}/${year}`;
}

function updateMainFinancialCard(totalAmount, growth) {
    const card = document.getElementById('metric-financial-total');
    const trend = document.getElementById('metric-financial-trend');

    if (card) card.innerText = formatBRL(totalAmount);
    if (trend) {
        trend.innerHTML = `<i data-lucide="${growth >= 0 ? 'trending-up' : 'trending-down'}"></i> ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
        trend.className = `card-trend ${growth >= 0 ? 'trend-up' : 'trend-down'}`;
    }
}

