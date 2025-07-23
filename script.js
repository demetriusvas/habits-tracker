// Habits Tracker - JavaScript Functionality

class HabitsTracker {
    constructor() {
        this.habits = this.loadHabits();
        this.currentView = 'week';
        this.currentDate = new Date();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderCurrentDate();
        this.renderDashboard();
        this.renderProgress();
        this.renderHabitsList();
        this.updateQuickStats();
        this.loadTheme();
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
            this.addHabit();
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

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // Data Management
    loadHabits() {
        const stored = localStorage.getItem('habits-tracker-data');
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    }

    saveHabits() {
        localStorage.setItem('habits-tracker-data', JSON.stringify(this.habits));
    }

    addHabit() {
        const name = document.getElementById('habitName').value.trim();
        const icon = document.getElementById('selectedIcon').value;
        const frequency = document.getElementById('habitFrequency').value;
        const time = document.getElementById('habitTime').value;
        const goal = parseInt(document.getElementById('habitGoal').value);
        const unit = document.getElementById('habitUnit').value;

        if (!name) {
            alert('Por favor, insira um nome para o hábito.');
            return;
        }

        const habit = {
            id: Date.now().toString(),
            name,
            icon,
            frequency,
            time,
            goal,
            unit,
            createdAt: new Date().toISOString(),
            completions: {}
        };

        this.habits.push(habit);
        this.saveHabits();
        this.closeModal('addHabitModal');
        this.renderDashboard();
        this.renderProgress();
        this.renderHabitsList();
        this.updateQuickStats();
        this.resetForm();
    }

    deleteHabit(habitId) {
        if (confirm('Tem certeza que deseja excluir este hábito? Esta ação não pode ser desfeita.')) {
            this.habits = this.habits.filter(habit => habit.id !== habitId);
            this.saveHabits();
            this.renderDashboard();
            this.renderProgress();
            this.renderHabitsList();
            this.updateQuickStats();
        }
    }

    toggleHabitCompletion(habitId, date = null) {
        const dateKey = date || this.formatDate(new Date());
        const habit = this.habits.find(h => h.id === habitId);
        
        if (!habit) return;

        if (!habit.completions[dateKey]) {
            habit.completions[dateKey] = 0;
        }

        // Toggle between 0 and goal
        if (habit.completions[dateKey] >= habit.goal) {
            habit.completions[dateKey] = 0;
        } else {
            habit.completions[dateKey] = habit.goal;
        }

        this.saveHabits();
        this.renderDashboard();
        this.renderProgress();
        this.updateQuickStats();
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
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plus-circle"></i>
                    <h3>Nenhum hábito cadastrado</h3>
                    <p>Comece adicionando seu primeiro hábito para acompanhar seu progresso diário.</p>
                </div>
            `;
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
                                <i class="${habit.icon}"></i>
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
                                onclick="habitsTracker.toggleHabitCompletion('${habit.id}')">
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
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>Nenhum progresso para mostrar</h3>
                    <p>Adicione hábitos para visualizar seu progresso ao longo do tempo.</p>
                </div>
            `;
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
                     onclick="habitsTracker.toggleHabitCompletion('${habit.id}', '${dateKey}')"
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
                        <i class="${habit.icon}"></i>
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
                         onclick="habitsTracker.toggleHabitCompletion('${habit.id}', '${dateKey}')"></div>`;
        }).join('');

        return `
            <div class="habit-progress">
                <div class="progress-header-habit">
                    <div class="habit-icon">
                        <i class="${habit.icon}"></i>
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
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list"></i>
                    <h3>Nenhum hábito cadastrado</h3>
                    <p>Comece criando seus primeiros hábitos para organizar sua rotina.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.habits.map(habit => {
            const streak = this.calculateStreak(habit);
            const consistency = this.calculateConsistency(habit);
            
            return `
                <div class="habit-item">
                    <div class="habit-item-info">
                        <div class="habit-icon">
                            <i class="${habit.icon}"></i>
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
                        <button class="btn-icon" onclick="habitsTracker.deleteHabit('${habit.id}')" title="Excluir hábito">
                            <i class="fas fa-trash"></i>
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
        this.openModal('addHabitModal');
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    selectIcon(iconElement) {
        document.querySelectorAll('.icon-option').forEach(option => {
            option.classList.remove('active');
        });
        iconElement.classList.add('active');
        document.getElementById('selectedIcon').value = iconElement.dataset.icon;
    }

    resetForm() {
        document.getElementById('habitForm').reset();
        document.querySelectorAll('.icon-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector('.icon-option').classList.add('active');
        document.getElementById('selectedIcon').value = 'fas fa-water';
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
    resetAllData() {
        if (confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem('habits-tracker-data');
            this.habits = [];
            this.renderDashboard();
            this.renderProgress();
            this.renderHabitsList();
            this.updateQuickStats();
            this.closeModal('settingsModal');
        }
    }

    // Statistics Implementation
    renderStatistics() {
        this.renderOverallChart();
        this.renderWeeklyChart();
        this.renderTopHabits();
        this.renderCurrentStreaks();
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
                        <i class="${habit.icon}"></i>
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
                        <i class="${habit.icon}"></i>
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
    habitsTracker = new HabitsTracker();
});
