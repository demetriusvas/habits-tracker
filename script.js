// Habits Tracker - JavaScript Functionality

class HabitsTracker {
    constructor() {
        // A instância 'db' é criada no index.html e está disponível globalmente
        if (typeof db === 'undefined') {
            alert('Firebase não foi inicializado. Verifique seu script de configuração no index.html.');
            return;
        }
        this.db = db;
        this.habitsCollection = null;
        this.habits = [];
        this.currentView = 'week';
        this.currentDate = new Date();
        this.editingHabitId = null;
        this.appWrapper = document.getElementById('appWrapper');
        this.authContainer = document.getElementById('authContainer');
        this.unsubscribeHabits = null; // Para desligar o listener do Firestore
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupAuthListeners();
        this.renderCurrentDate();
        this.loadTheme();
    }

    renderAll() {
        this.renderDashboard();
        this.renderProgress();
        this.renderHabitsList();
        this.updateQuickStats();
        this.loadTheme();
    }

    // Listener em tempo real para atualizações do Firestore
    listenForHabitChanges() {
        // Se já existe um listener, desliga ele antes de criar um novo
        if (this.unsubscribeHabits) {
            this.unsubscribeHabits();
        }

        // Só cria um listener se tivermos uma coleção (usuário logado)
        if (!this.habitsCollection) return;

        this.unsubscribeHabits = this.habitsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            this.habits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('Hábitos carregados/atualizados do Firestore:', this.habits);
            // Re-renderiza tudo sempre que os dados mudam
            this.renderAll();
        });
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.nav-tab').dataset.tab);
            });
        });

        // Add habit buttons
        document.getElementById('addHabitBtn').addEventListener('click', () => {
            this.openAddHabitModal();
        });
        document.getElementById('addHabitBtn2').addEventListener('click', () => {
            this.openAddHabitModal();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal('addHabitModal');
        });
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal('addHabitModal');
        });

        // Auth screen listeners
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            this.login(email, password, loginBtn);
        });

        const googleSignInBtn = document.getElementById('googleSignInBtn');
        googleSignInBtn.addEventListener('click', () => this.googleSignIn(googleSignInBtn));

        document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.sendPasswordReset();
        });

        document.getElementById('openSignupModalLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openAuthModal();
        });

        // Auth modal listeners
        const signupBtn = document.getElementById('signupBtn');
        signupBtn.addEventListener('click', () => {
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            this.signup(email, password, signupBtn);
        });
        document.getElementById('closeAuthModal').addEventListener('click', () => this.closeModal('authModal'));

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openModal('settingsModal');
        });
        document.getElementById('closeSettingsModal').addEventListener('click', () => {
            this.closeModal('settingsModal');
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            this.setTheme(e.target.checked ? 'dark' : 'light');
        });

        // Form submission
        document.getElementById('habitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitHabitForm();
        });

        // Icon selector
        document.querySelectorAll('.icon-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectIcon(e.target.closest('.icon-option'));
            });
        });

        // View toggle
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Reset data
        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetAllData();
        });

        // Logout button
        document.getElementById('logoutButton').addEventListener('click', () => {
            this.logout();
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Event Delegation for dynamic content
        ['todayHabits', 'habitsProgress', 'habitsList'].forEach(containerId => {
            document.getElementById(containerId).addEventListener('click', (e) => this.handleDynamicContentClick(e));
        });

        // Limpa erros de autenticação ao digitar
        ['loginEmail', 'loginPassword'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                const errorElement = document.getElementById('loginErrorMessage');
                if (errorElement.textContent) errorElement.textContent = '';
            });
        });
    }
    
    setupAuthListeners() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                this.authContainer.style.display = 'none';
                this.appWrapper.style.display = 'flex';
                this.loadUserData(user); // Carrega dados específicos do usuário
                this.updateUIForAuth(true); // Mostra botão de logout
            } else {
                // No user is signed in
                // Garante que o listener de hábitos do usuário anterior seja removido
                if (this.unsubscribeHabits) {
                    this.unsubscribeHabits();
                    this.unsubscribeHabits = null;
                }
                this.authContainer.style.display = 'flex';
                this.appWrapper.style.display = 'none';
                this.updateUIForAuth(false); // Mostra botões de login
                // Limpa dados para evitar mostrar dados do usuário anterior
                this.habits = [];
                this.userId = null;
                this.habitsCollection = null;
                this.renderAll();
            }
        });
    }

    // UI updates based on auth state
    updateUIForAuth(isSignedIn) {
        const logoutButton = document.getElementById('logoutButton');
    
        if (logoutButton) {
            logoutButton.style.display = isSignedIn ? 'block' : 'none';
        }
    }

    // Load user data
    async loadUserData(user) {
        // Store user ID
        this.userId = user.uid;
    
        // Update habits collection to use user ID
        this.habitsCollection = this.db.collection('users').doc(user.uid).collection('habits');
        this.listenForHabitChanges(); // Re-attaches listener with new collection
    }

    // Sign-up
    async signup(email, password, buttonElement) {
        const errorElement = document.getElementById('authErrorMessage');
        errorElement.textContent = '';

        if (password.length < 6) {
            errorElement.textContent = 'A senha deve ter pelo menos 6 caracteres.';
            return;
        }
        if (!email) {
            errorElement.textContent = 'Por favor, insira um email.';
            return;
        }

        this._setButtonLoading(buttonElement, true);
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            // Se for um novo usuário, cria o documento dele no Firestore
            if (userCredential.additionalUserInfo.isNewUser) {
                await this._createUserDocument(userCredential.user);
            }
            this.closeModal('authModal');
        } catch (error) {
            errorElement.textContent = this.getFriendlyAuthErrorMessage(error);
        } finally {
            this._setButtonLoading(buttonElement, false);
        }
    }

    // Login
    async login(email, password, buttonElement) {
        const errorElement = document.getElementById('loginErrorMessage');
        errorElement.textContent = '';

        if (!email || !password) {
            errorElement.textContent = 'Por favor, preencha email e senha.';
            return;
        }

        this._setButtonLoading(buttonElement, true);
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
        } catch (error) {
            errorElement.textContent = this.getFriendlyAuthErrorMessage(error);
        } finally {
            this._setButtonLoading(buttonElement, false);
        }
    }

    // Logout
    async logout() {
        try {
            await firebase.auth().signOut();
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            alert("Não foi possível sair. Tente novamente.");
        }
    }

    // Google Sign-in
    async googleSignIn(buttonElement) {
        const provider = new firebase.auth.GoogleAuthProvider();
        const errorElement = document.getElementById('loginErrorMessage');
        errorElement.textContent = '';

        this._setButtonLoading(buttonElement, true);
        try {
            const result = await firebase.auth().signInWithPopup(provider);
            // Se for um novo usuário, cria o documento dele no Firestore
            if (result.additionalUserInfo.isNewUser) {
                await this._createUserDocument(result.user);
            }
        } catch (error) {
            const friendlyMessage = this.getFriendlyAuthErrorMessage(error);
            if (friendlyMessage) {
                errorElement.textContent = friendlyMessage;
            }
        } finally {
            this._setButtonLoading(buttonElement, false);
        }
    }

    // Cria um documento para um novo usuário no Firestore
    async _createUserDocument(user) {
        if (!user) return;
        const userRef = this.db.collection('users').doc(user.uid);
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Usuário',
            createdAt: new Date().toISOString()
        };
        try {
            await userRef.set(userData, { merge: true });
        } catch (error) {
            console.error("Erro ao criar documento do usuário:", error);
        }
    }

    // Password Reset
    async sendPasswordReset() {
        const emailInput = document.getElementById('loginEmail');
        const email = emailInput.value.trim();
        const messageElement = document.getElementById('loginErrorMessage');

        if (!email) {
            messageElement.textContent = 'Por favor, insira seu email no campo acima e clique novamente.';
            messageElement.style.color = 'var(--error)';
            emailInput.focus();
            return;
        }

        messageElement.textContent = 'Enviando email...';
        messageElement.style.color = 'var(--text-secondary)';

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            messageElement.textContent = 'Email de redefinição enviado! Verifique sua caixa de entrada.';
            messageElement.style.color = 'var(--success)';
        } catch (error) {
            messageElement.textContent = this.getFriendlyAuthErrorMessage(error);
            messageElement.style.color = 'var(--error)';
        }
    }

    // Traduz mensagens de erro do Firebase para o usuário
    getFriendlyAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'O formato do email é inválido.';
            case 'auth/user-disabled':
                return 'Este usuário foi desabilitado.';
            case 'auth/user-not-found':
                return 'Nenhuma conta encontrada com este email.';
            case 'auth/wrong-password':
                return 'Credenciais inválidas. Verifique seu email e senha.';
            case 'auth/email-already-in-use':
                return 'Este email já está em uso por outra conta.';
            case 'auth/weak-password':
                return 'A senha é muito fraca (mínimo 6 caracteres).';
            case 'auth/popup-closed-by-user':
                return null; // Não mostrar erro se o usuário fechar o popup
            default:
                console.error("Erro de autenticação não tratado:", error);
                return 'Ocorreu um erro inesperado. Tente novamente.';
        }
    }

    // Helper to manage button loading state
    _setButtonLoading(button, isLoading) {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalHtml = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            button.disabled = false;
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
            }
        }
    }

    openAuthModal() {
        this.resetAuthModal();
        // Show the modal
        this.openModal('authModal');
    }

    resetAuthModal() {
        const form = document.getElementById('signupForm');
        if (form) form.reset();

        const errorMsg = document.getElementById('authErrorMessage');
        if (errorMsg) errorMsg.textContent = '';
    }

    // Data Management (agora com Firestore)
    // Os métodos agora são 'async' para aguardar a resposta do banco de dados

    async submitHabitForm() {
        if (this.editingHabitId) {
            await this.updateHabit(this.editingHabitId);
        } else {
            await this.createHabit();
        }
    }

    _getHabitDataFromForm() {
        const name = document.getElementById('habitName').value.trim();
        const icon = document.getElementById('selectedIcon').value;
        const frequency = document.getElementById('habitFrequency').value;
        const time = document.getElementById('habitTime').value;
        const goal = parseInt(document.getElementById('habitGoal').value);
        const unit = document.getElementById('habitUnit').value;

        if (!name) {
            alert('Por favor, insira um nome para o hábito.');
            return null;
        }

        return { name, icon, frequency, time, goal, unit };
    }

    async createHabit() {
        const habitData = this._getHabitDataFromForm();
        if (!habitData) return;

        const newHabit = {
            ...habitData,
            createdAt: new Date().toISOString(),
            completions: {}
        };

        try {
            await this.habitsCollection.add(newHabit);
            this.closeModal('addHabitModal');
            // O listener onSnapshot cuidará da re-renderização
        } catch (error) {
            console.error("Erro ao adicionar hábito: ", error);
            alert("Não foi possível adicionar o hábito. Tente novamente.");
        }
    }

    async updateHabit(habitId) {
        const habitData = this._getHabitDataFromForm();
        if (!habitData) return;

        try {
            await this.habitsCollection.doc(habitId).update(habitData);
            this.closeModal('addHabitModal');
            // O listener onSnapshot cuidará da re-renderização
        } catch (error) {
            console.error("Erro ao atualizar hábito: ", error);
            alert("Não foi possível atualizar o hábito. Tente novamente.");
        }
    }

    async deleteHabit(habitId) {
        if (confirm('Tem certeza que deseja excluir este hábito? Esta ação não pode ser desfeita.')) {
            try {
                await this.habitsCollection.doc(habitId).delete();
                // O listener onSnapshot cuidará da re-renderização
            } catch (error) {
                console.error("Erro ao excluir hábito: ", error);
                alert("Não foi possível excluir o hábito. Tente novamente.");
            }
        }
    }

    async toggleHabitCompletion(habitId, date = null) {
        const dateKey = date || this.formatDate(new Date());
        const habit = this.habits.find(h => h.id === habitId);
        
        if (!habit) return;

        const currentCompletion = habit.completions[dateKey] || 0;
        const newCompletion = currentCompletion >= habit.goal ? 0 : habit.goal;

        // Usamos a notação de ponto para atualizar um campo dentro de um objeto (map) no Firestore
        await this.habitsCollection.doc(habitId).update({
            [`completions.${dateKey}`]: newCompletion
        });
        // O listener onSnapshot cuidará da re-renderização
    }

    // Utility Functions
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateDisplay(date) {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getDateRange(days) {
        const dates = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date);
        }
        return dates;
    }

    getWeekDates() {
        const dates = [];
        const today = new Date();
        const currentDay = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - currentDay);

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date);
        }
        return dates;
    }

    calculateStreak(habit) {
        let streak = 0;
        const today = new Date();
        
        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateKey = this.formatDate(date);
            
            if (habit.completions[dateKey] >= habit.goal) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    calculateConsistency(habit, days = 30) {
        const dates = this.getDateRange(days);
        const completed = dates.filter(date => {
            const dateKey = this.formatDate(date);
            return habit.completions[dateKey] >= habit.goal;
        }).length;
        
        return Math.round((completed / days) * 100);
    }

    getTotalCheckIns(habit) {
        return Object.values(habit.completions).reduce((sum, count) => sum + count, 0);
    }

    // UI Rendering
    renderCurrentDate() {
        document.getElementById('currentDate').textContent = 
            this.formatDateDisplay(this.currentDate);
    }

    renderDashboard() {
        const container = document.getElementById('todayHabits');
        if (this.habits.length === 0) {
            this._renderEmptyState(container, 'fa-plus-circle', 'Nenhum hábito cadastrado', 'Comece adicionando seu primeiro hábito para acompanhar seu progresso diário.');
            return;
        }

        const today = this.formatDate(new Date());
        
        container.innerHTML = this.habits.map(habit => {
            const isCompleted = habit.completions[today] >= habit.goal;
            const streak = this.calculateStreak(habit);
            const consistency = this.calculateConsistency(habit);
            const checkIns = this.getTotalCheckIns(habit);

            return `
                <div class="habit-card">
                    <div class="habit-header">
                        <div class="habit-info">
                            <div class="habit-icon">
                                ${habit.icon}
                            </div>
                            <div class="habit-details">
                                <h3>${habit.name}</h3>
                                <div class="habit-meta">
                                    ${habit.goal} ${habit.unit} • ${habit.frequency === 'daily' ? 'Diário' : 'Semanal'}
                                    ${habit.time ? ` • ${habit.time}` : ''}
                                </div>
                            </div>
                        </div>
                        <button class="habit-check ${isCompleted ? 'completed' : ''}"
                                data-action="toggle-completion"
                                data-habit-id="${habit.id}">
                            ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
                        </button>
                    </div>
                    <div class="habit-stats">
                        <div class="stat">
                            <span class="stat-value">${streak}</span>
                            <span class="stat-label">Streak</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${consistency}%</span>
                            <span class="stat-label">Consistência</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${checkIns}</span>
                            <span class="stat-label">Check-ins</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderProgress() {
        const container = document.getElementById('habitsProgress');
        if (this.habits.length === 0) {
            this._renderEmptyState(container, 'fa-chart-line', 'Nenhum progresso para mostrar', 'Adicione hábitos para visualizar seu progresso ao longo do tempo.');
            return;
        }

        container.innerHTML = this.habits.map(habit => {
            if (this.currentView === 'week') {
                return this.renderWeekProgress(habit);
            } else {
                return this.renderYearProgress(habit);
            }
        }).join('');
    }

    renderWeekProgress(habit) {
        const weekDates = this.getWeekDates();
        const streak = this.calculateStreak(habit);
        const consistency = this.calculateConsistency(habit, 7);
        const checkIns = this.getTotalCheckIns(habit);

        const weekBars = weekDates.map(date => {
            const dateKey = this.formatDate(date);
            const completion = habit.completions[dateKey] || 0;
            const percentage = (completion / habit.goal) * 100;
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
            
            return `
                <div class="week-day-container"
                     data-action="toggle-completion"
                     data-habit-id="${habit.id}"
                     data-date-key="${dateKey}"
                     title="${date.toLocaleDateString('pt-BR')}: Clique para alterar.">
                    <div class="week-day">${dayName}</div>
                    <div class="week-bar">
                        <div class="week-bar-fill" style="height: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="habit-progress">
                <div class="progress-header-habit">
                    <div class="habit-icon">
                        ${habit.icon}
                    </div>
                    <div class="habit-details">
                        <h3>${habit.name}</h3>
                        <div class="habit-meta">
                            Streak: ${streak} • Consistência: ${consistency}% • Check-ins: ${checkIns}
                        </div>
                    </div>
                </div>
                <div class="progress-week">
                    ${weekBars}
                </div>
            </div>
        `;
    }

    renderYearProgress(habit) {
        const yearDates = this.getDateRange(365);
        const streak = this.calculateStreak(habit);
        const consistency = this.calculateConsistency(habit, 365);
        const checkIns = this.getTotalCheckIns(habit);

        const yearGrid = yearDates.map(date => {
            const dateKey = this.formatDate(date);
            const completion = habit.completions[dateKey] || 0;
            let className = 'progress-day';
            
            if (completion >= habit.goal) {
                className += ' completed';
            } else if (completion > 0) {
                className += ' partial';
            }

            return `<div class="${className}"
                         title="${date.toLocaleDateString('pt-BR')}: ${completion}/${habit.goal}. Clique para alterar."
                         data-action="toggle-completion" data-habit-id="${habit.id}" data-date-key="${dateKey}">
                    </div>`;
        }).join('');

        return `
            <div class="habit-progress">
                <div class="progress-header-habit">
                    <div class="habit-icon">
                        ${habit.icon}
                    </div>
                    <div class="habit-details">
                        <h3>${habit.name}</h3>
                        <div class="habit-meta">
                            Streak: ${streak} • Consistência: ${consistency}% • Check-ins: ${checkIns}
                        </div>
                    </div>
                </div>
                <div class="progress-grid">
                    ${yearGrid}
                </div>
            </div>
        `;
    }

    renderHabitsList() {
        const container = document.getElementById('habitsList');
        if (this.habits.length === 0) {
            this._renderEmptyState(container, 'fa-list', 'Nenhum hábito cadastrado', 'Comece criando seus primeiros hábitos para organizar sua rotina.');
            return;
        }

        container.innerHTML = this.habits.map(habit => {
            const streak = this.calculateStreak(habit);
            const consistency = this.calculateConsistency(habit);
            
            return `
                <div class="habit-item">
                    <div class="habit-item-info">
                        <div class="habit-icon">
                            ${habit.icon}
                        </div>
                        <div class="habit-details">
                            <h3>${habit.name}</h3>
                            <div class="habit-meta">
                                ${habit.goal} ${habit.unit} • ${habit.frequency === 'daily' ? 'Diário' : 'Semanal'}
                                • Streak: ${streak} • Consistência: ${consistency}%
                            </div>
                        </div>
                    </div>
                    <div class="habit-item-actions">
                        <button class="btn-icon" data-action="edit-habit" data-habit-id="${habit.id}" title="Editar Hábito">
                            ✏️
                        </button>
                        <button class="btn-icon" data-action="delete-habit" data-habit-id="${habit.id}" title="Excluir hábito">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateQuickStats() {
        const today = this.formatDate(new Date());
        const weekDates = this.getWeekDates();
        
        // Maior streak
        const maxStreak = this.habits.reduce((max, habit) => {
            const streak = this.calculateStreak(habit);
            return Math.max(max, streak);
        }, 0);
        
        // Conclusão de hoje
        const todayCompleted = this.habits.filter(habit => 
            habit.completions[today] >= habit.goal
        ).length;
        const todayPercentage = this.habits.length > 0 ? 
            Math.round((todayCompleted / this.habits.length) * 100) : 0;
        
        // Conclusão da semana
        let weekTotal = 0;
        let weekCompleted = 0;
        
        this.habits.forEach(habit => {
            weekDates.forEach(date => {
                const dateKey = this.formatDate(date);
                weekTotal++;
                if (habit.completions[dateKey] >= habit.goal) {
                    weekCompleted++;
                }
            });
        });
        
        const weekPercentage = weekTotal > 0 ? 
            Math.round((weekCompleted / weekTotal) * 100) : 0;

        document.getElementById('totalStreak').textContent = maxStreak;
        document.getElementById('todayCompletion').textContent = `${todayPercentage}%`;
        document.getElementById('weekCompletion').textContent = `${weekPercentage}%`;
    }

    // Helper para renderizar estados vazios
    _renderEmptyState(container, icon, title, message) {
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas ${icon}"></i>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    // Event Delegation Handler
    handleDynamicContentClick(event) {
        const target = event.target;
        const actionElement = target.closest('[data-action]');

        if (!actionElement) return;

        const action = actionElement.dataset.action;
        const habitId = actionElement.dataset.habitId;

        switch (action) {
            case 'toggle-completion':
                const dateKey = actionElement.dataset.dateKey || null;
                this.toggleHabitCompletion(habitId, dateKey);
                break;
            case 'edit-habit':
                this.openEditHabitModal(habitId);
                break;
            case 'delete-habit':
                this.deleteHabit(habitId);
                break;
        }
    }

    // UI Controls
    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Render specific content if needed
        if (tabName === 'stats') {
            this.renderStatistics();
        }
    }

    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.renderProgress();
    }

    openAddHabitModal() {
        this.resetHabitModal(); // Garante que o modal está no modo "Adicionar"
        this.openModal('addHabitModal');
    }

    openEditHabitModal(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        this.editingHabitId = habitId;

        // Change modal title and button
        document.getElementById('habitModalTitle').textContent = 'Editar Hábito';
        document.getElementById('habitSubmitBtn').textContent = 'Salvar Alterações';

        // Populate form
        document.getElementById('habitName').value = habit.name;
        document.getElementById('habitFrequency').value = habit.frequency;
        document.getElementById('habitTime').value = habit.time || '';
        document.getElementById('habitGoal').value = habit.goal;
        document.getElementById('habitUnit').value = habit.unit;
        document.getElementById('selectedIcon').value = habit.icon;

        // Select the correct icon in the UI
        this.selectIcon(document.querySelector(`.icon-option[data-icon="${habit.icon}"]`));
        this.openModal('addHabitModal');
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = 'auto';
        if (modalId === 'addHabitModal') {
            this.resetHabitModal();
        }
    }

    selectIcon(iconElement) {
        document.querySelectorAll('.icon-option').forEach(option => {
            option.classList.remove('active');
        });
        iconElement.classList.add('active');
        document.getElementById('selectedIcon').value = iconElement.dataset.icon;
    }

    resetHabitModal() {
        this.editingHabitId = null;
        document.getElementById('habitForm').reset();

        document.getElementById('habitModalTitle').textContent = 'Adicionar Novo Hábito';
        document.getElementById('habitSubmitBtn').textContent = 'Adicionar Hábito';

        document.querySelectorAll('.icon-option').forEach(option => {
            option.classList.remove('active');
        });
        const firstIcon = document.querySelector('.icon-option');
        firstIcon.classList.add('active');
        document.getElementById('selectedIcon').value = firstIcon.dataset.icon;
    }

    // Statistics Implementation
    renderStatistics() {
        this.renderOverallChart();
        this.renderWeeklyChart();
        this.renderTopHabits();
        this.renderCurrentStreaks();
    }
    // Theme Management
    loadTheme() {
        const savedTheme = localStorage.getItem('habits-tracker-theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
            document.getElementById('darkModeToggle').checked = false;
        } else {
            document.body.classList.remove('light-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
            document.getElementById('darkModeToggle').checked = true;
        }
        localStorage.setItem('habits-tracker-theme', theme);
    }

    toggleTheme() {
        const isLight = document.body.classList.contains('light-mode');
        this.setTheme(isLight ? 'dark' : 'light');
    }

    // Data Management
    async resetAllData() {
        if (confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
            try {
                // Para deletar uma coleção, precisamos deletar cada documento individualmente
                const snapshot = await this.habitsCollection.get();
                const batch = this.db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                this.closeModal('settingsModal');
                // O listener onSnapshot cuidará da re-renderização para o estado vazio
            } catch (error) {
                console.error("Erro ao resetar os dados: ", error);
                alert("Não foi possível resetar os dados. Tente novamente.");
            }
        }
    }


    renderOverallChart() {
        const ctx = document.getElementById('overallChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.overallChart) {
            this.overallChart.destroy();
        }

        const last30Days = this.getDateRange(30);
        const completionData = last30Days.map(date => {
            const dateKey = this.formatDate(date);
            const completed = this.habits.filter(habit => 
                habit.completions[dateKey] >= habit.goal
            ).length;
            const total = this.habits.length;
            return total > 0 ? (completed / total) * 100 : 0;
        });

        const labels = last30Days.map(date => 
            date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        );

        this.overallChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Conclusão Diária (%)',
                    data: completionData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-primary').trim()
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim(),
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border').trim()
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim()
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border').trim()
                        }
                    }
                }
            }
        });
    }

    renderWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.weeklyChart) {
            this.weeklyChart.destroy();
        }

        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weeklyData = Array(7).fill(0);

        // Calculate average completion for each day of the week over the last 4 weeks
        for (let week = 0; week < 4; week++) {
            for (let day = 0; day < 7; day++) {
                const date = new Date();
                date.setDate(date.getDate() - (week * 7) - (6 - day));
                const dateKey = this.formatDate(date);
                
                const completed = this.habits.filter(habit => 
                    habit.completions[dateKey] >= habit.goal
                ).length;
                const total = this.habits.length;
                
                if (total > 0) {
                    weeklyData[day] += (completed / total) * 100;
                }
            }
        }

        // Average over 4 weeks
        const averageData = weeklyData.map(value => value / 4);

        this.weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weekDays,
                datasets: [{
                    label: 'Consistência Média (%)',
                    data: averageData,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-primary').trim()
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim(),
                            callback: function(value) {
                                return value.toFixed(0) + '%';
                            }
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border').trim()
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim()
                        },
                        grid: {
                            color: getComputedStyle(document.body).getPropertyValue('--border').trim()
                        }
                    }
                }
            }
        });
    }

    renderTopHabits() {
        const container = document.getElementById('topHabits');
        if (!container) return;

       if (this.habits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <p>Nenhum hábito para mostrar</p>
                </div>
            `;
            return;
        }

        // Sort habits by consistency
        const sortedHabits = this.habits
            .map(habit => ({
                ...habit,
                consistency: this.calculateConsistency(habit, 30),
                streak: this.calculateStreak(habit)
            }))
            .sort((a, b) => b.consistency - a.consistency)
            .slice(0, 5);

        container.innerHTML = sortedHabits.map((habit, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
            
            return `
                <div class="top-habit-item">
                    <div class="rank">${medal}</div>
                    <div class="habit-icon">
                        ${habit.icon}
                    </div>
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-stats">
                            ${habit.consistency}% consistência • ${habit.streak} dias streak
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCurrentStreaks() {
        const container = document.getElementById('currentStreaks');
        if (!container) return;

        if (this.habits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fire"></i>
                    <p>Nenhum streak para mostrar</p>
                </div>
            `;
            return;
        }

        // Sort habits by current streak
        const streakHabits = this.habits
            .map(habit => ({
                ...habit,
               streak: this.calculateStreak(habit)
            }))
            .filter(habit => habit.streak > 0)
            .sort((a, b) => b.streak - a.streak);

        if (streakHabits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fire"></i>
                    <p>Nenhum streak ativo</p>
                    <small>Complete seus hábitos para iniciar streaks!</small>
                </div>
            `;
            return;
        }

        container.innerHTML = streakHabits.map(habit => {
            const streakIcon = habit.streak >= 30 ? '🔥' : 
                             habit.streak >= 7 ? '⚡' : '✨';
            
            return `
                <div class="streak-item">
                    <div class="streak-icon">${streakIcon}</div>
                    <div class="habit-icon">
                        ${habit.icon}
                    </div>
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="streak-count">${habit.streak} dias consecutivos</div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Initialize the app
let habitsTracker;

document.addEventListener('DOMContentLoaded', () => {
    // Aguarda um instante para garantir que o script do Firebase foi carregado e inicializado
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            habitsTracker = new HabitsTracker();
        }
    }, 500);
});
