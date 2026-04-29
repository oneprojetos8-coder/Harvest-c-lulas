// Supabase Configuration
const SUPABASE_URL = 'https://junitbdhmsiaiqsnshkv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bml0YmRobXNpYWlxc25zaGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjY4OTQsImV4cCI6MjA5MzA0Mjg5NH0.6nE9omQ3WfroQfRXXxt8-tqVq7mJb7nYHvn4FDrw_CA';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
    reports: [],
    cells: [],
    tokens: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    // Check for existing session
    const { data: { session } } = await supabaseClient.auth.getSession();

    // Independentemente de estar logado ou não, vamos carregar os dados públicos
    // Mas para os privados, precisamos do login.
    if (session) {
        const role = sessionStorage.getItem('cbna_user_role') || 'pastor';
        const cell = sessionStorage.getItem('cbna_user_cell') || 'Administração';
        await handleLogin(role, cell);
    } else {
        await checkAuth();
    }

    lucide.createIcons();

    const dateInput = document.getElementById('form-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    const form = document.getElementById('cell-report-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    const setupForm = document.getElementById('cell-setup-form');
    if (setupForm) setupForm.addEventListener('submit', handleSetupSubmit);
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
        document.getElementById('pastor-auth-toggle').style.display = 'block';
        updateAuthUI();
    } else {
        document.getElementById('pastor-login-fields').style.display = 'none';
        document.getElementById('leader-login-fields').style.display = 'block';
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
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    try {
        if (pendingRole === 'pastor') {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (isSignUpMode) {
                const confirm = document.getElementById('signup-password-confirm').value;
                if (password !== confirm) throw new Error('As senhas não coincidem!');
                if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');

                const { data, error } = await supabaseClient.auth.signUp({ email, password });

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
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                handleLogin('pastor', 'Administração');
            }
        } else {
            const tokenInput = document.getElementById('login-token').value;
            const { data: tokens, error } = await supabaseClient.from('tokens').select('*').eq('code', tokenInput);
            if (error) throw error;

            if (tokens && tokens.length > 0) {
                handleLogin('leader', tokens[0].cell_name);
            } else {
                errorEl.innerText = 'Token inválido!';
                errorEl.style.display = 'block';
            }
        }
    } catch (err) {
        errorEl.innerText = 'Erro: ' + (err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : err.message);
        errorEl.style.display = 'block';
    }
}

async function handleLogin(role, cellName) {
    sessionStorage.setItem('cbna_user_role', role);
    sessionStorage.setItem('cbna_user_cell', cellName);

    document.body.className = `role-${role}`;

    console.log('Sincronizando dados com o servidor...');
    await loadData(); // AGUARDA os dados chegarem

    await checkAuth(); // Depois verifica a autorização e muda a tela
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('sb-junitbdhmsiaiqsnshkv-auth-token'); // Limpa o token do Supabase
    window.location.reload();
}

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const role = sessionStorage.getItem('cbna_user_role');
    const cellName = sessionStorage.getItem('cbna_user_cell');

    const loginOverlay = document.getElementById('login-overlay');
    const mainSidebar = document.getElementById('main-sidebar');
    const mainContent = document.getElementById('main-content');

    if (session || role) {
        loginOverlay.style.display = 'none';
        mainSidebar.style.display = 'flex';
        mainContent.style.display = 'block';

        document.body.className = `role-${role}`;
        document.getElementById('current-user-role').innerText = role === 'pastor' ? 'Pastor' : `Líder: ${cellName}`;

        if (role === 'pastor') {
            switchView('pastor-view');
            renderAllCells();
            loadPastorNotes();
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
    const cellName = document.getElementById('token-cell-name').value;
    const customCode = document.getElementById('token-custom-code').value.trim().toUpperCase();

    if (!cellName) return alert('Digite o nome da célula ou líder');

    // Se tiver código personalizado, usa ele. Se não, gera um aleatório.
    const tokenCode = customCode || Math.random().toString(36).substring(2, 8).toUpperCase();

    // Verifica se esse token já existe no banco para evitar duplicidade
    const { data: existing } = await supabaseClient.from('tokens').select('code').eq('code', tokenCode);
    if (existing && existing.length > 0) {
        return alert('Este token já está em uso. Escolha outro código.');
    }

    const newToken = {
        code: tokenCode,
        cell_name: cellName,
        role: 'leader'
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
        const cellInfo = state.cells.find(c => c.name === t.cell_name) || { leaders: 'Aguardando Setup', status: 'Inativo' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.cell_name}</strong></td>
            <td>${cellInfo.leaders}</td>
            <td><code style="background: #eee; padding: 2px 6px; border-radius: 4px;">${t.code}</code></td>
            <td><span class="badge ${cellInfo.leaders !== 'Aguardando Setup' ? 'badge-success' : ''}" style="${cellInfo.leaders !== 'Aguardando Setup' ? 'background: #e8f5e9; color: #2e7d32;' : 'background: #f5f5f5; color: #999;'}">${cellInfo.leaders !== 'Aguardando Setup' ? 'Ativa' : 'Pendente'}</span></td>
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
    console.log('Buscando dados atualizados...');
    try {
        const [rRes, cRes, tRes] = await Promise.all([
            supabaseClient.from('reports').select('*').order('date', { ascending: false }),
            supabaseClient.from('cells').select('*'),
            supabaseClient.from('tokens').select('*')
        ]);

        if (rRes.error) throw rRes.error;
        if (cRes.error) throw cRes.error;
        if (tRes.error) throw tRes.error;

        state.reports = rRes.data || [];
        state.cells = cRes.data || [];
        state.tokens = tRes.data || [];

        console.log('Sincronização concluída! Atualizando interface...');
        
        // Inicializa e atualiza tudo agora que temos os dados reais
        initCharts(); 
        updateDashboard();
        renderHistory();
        renderAllCells();
    } catch (error) {
        console.error('Erro de sincronização:', error);
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

    // History Table
    const tbody = document.getElementById('detail-history-body');
    tbody.innerHTML = '';
    cellReports.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.date}</td>
            <td>${r.members}</td>
            <td>${r.visitors}</td>
            <td>${r.photo ? `<img src="${r.photo}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="viewPhoto('${r.photo}')">` : '-'}</td>
            <td>${r.occurred === 'sim' ? '✅' : '❌'}</td>
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
