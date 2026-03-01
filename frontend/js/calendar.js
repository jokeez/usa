// Календарь обучения

let roadmapData = null;
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let currentFilters = {
    phase: 'all',
    status: 'all',
    type: 'all',
    search: ''
};

// Текущий вид календаря
let currentView = 'month'; // month, week, day
let currentWeek = 0; // Неделя в году
let currentDay = new Date(); // Текущий день для вида "день"

// Настройки календаря
let calendarSettings = {
    startDate: null,
    firstDayOfWeek: 1, // 0 = воскресенье, 1 = понедельник
    weekDays: 7,
    density: 'normal',
    hideWeekends: false
};

// Загрузка настроек
function loadCalendarSettings() {
    const saved = localStorage.getItem('calendar_settings');
    if (saved) {
        calendarSettings = { ...calendarSettings, ...JSON.parse(saved) };
    }
    applyCalendarSettings();
}

// Сохранение настроек
function saveCalendarSettings() {
    localStorage.setItem('calendar_settings', JSON.stringify(calendarSettings));
    applyCalendarSettings();
}

// Применение настроек
function applyCalendarSettings() {
    // Обновление UI
    const startDateInput = document.getElementById('startDate');
    const firstDayOfWeekSelect = document.getElementById('firstDayOfWeek');
    const weekDaysSelect = document.getElementById('weekDays');
    const densitySelect = document.getElementById('density');
    const hideWeekendsCheckbox = document.getElementById('hideWeekends');
    
    if (startDateInput) {
        const startDate = getStartDate();
        startDateInput.value = startDate.toISOString().split('T')[0];
    }
    if (firstDayOfWeekSelect) firstDayOfWeekSelect.value = calendarSettings.firstDayOfWeek;
    if (weekDaysSelect) weekDaysSelect.value = calendarSettings.weekDays;
    if (densitySelect) densitySelect.value = calendarSettings.density;
    if (hideWeekendsCheckbox) hideWeekendsCheckbox.checked = calendarSettings.hideWeekends;
    
    // Применение плотности
    const container = document.getElementById('calendarContainer');
    if (container) {
        container.className = `calendar-container density-${calendarSettings.density}`;
    }
    
    renderCalendar();
}

// Показать настройки
function showCalendarSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        applyCalendarSettings();
    }
}

// Закрыть настройки
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Обновление функций настроек
function updateStartDate() {
    const input = document.getElementById('startDate');
    if (input && input.value) {
        calendarSettings.startDate = input.value;
        localStorage.setItem('learning_start_date', input.value);
        saveCalendarSettings();
    }
}

function updateFirstDayOfWeek() {
    const select = document.getElementById('firstDayOfWeek');
    if (select) {
        calendarSettings.firstDayOfWeek = parseInt(select.value);
        saveCalendarSettings();
    }
}

function updateWeekDays() {
    const select = document.getElementById('weekDays');
    if (select) {
        calendarSettings.weekDays = parseInt(select.value);
        saveCalendarSettings();
    }
}

function updateDensity() {
    const select = document.getElementById('density');
    if (select) {
        calendarSettings.density = select.value;
        saveCalendarSettings();
    }
}

function updateHideWeekends() {
    const checkbox = document.getElementById('hideWeekends');
    if (checkbox) {
        calendarSettings.hideWeekends = checkbox.checked;
        saveCalendarSettings();
    }
}

function resetCalendarSettings() {
    calendarSettings = {
        startDate: null,
        firstDayOfWeek: 1,
        weekDays: 7,
        density: 'normal',
        hideWeekends: false
    };
    localStorage.removeItem('calendar_settings');
    localStorage.removeItem('learning_start_date');
    applyCalendarSettings();
}

// Загрузка roadmap
async function loadRoadmapForCalendar() {
    try {
        const pathname = window.location.pathname || '';
        const basePath = pathname.includes('/pages/') ? '../data/roadmap.json' : 'data/roadmap.json';
        const absoluteFromPage = new URL(basePath, window.location.href).href;
        const origin = window.location.origin || '';
        const paths = [
            absoluteFromPage,
            pathname.includes('/usa/') ? origin + '/usa/frontend/data/roadmap.json' : null,
            pathname.includes('/usa/') ? '/usa/frontend/data/roadmap.json' : null,
            basePath,
            '/data/roadmap.json',
            'data/roadmap.json',
            './data/roadmap.json',
            '../data/roadmap.json',
            origin + '/data/roadmap.json'
        ].filter(Boolean);
        let response = null;
        for (const path of paths) {
            try {
                response = await fetch(path);
                if (response && response.ok) break;
            } catch (e) { continue; }
        }
        if (!response || !response.ok) {
            throw new Error('Файл roadmap.json не найден');
        }
        let text = await response.text();
        text = text.replace(/^\uFEFF/, '');
        roadmapData = JSON.parse(text);
        populatePhaseFilter();
        renderCalendar();
        updateStatistics();
    } catch (error) {
        console.error('Ошибка загрузки плана:', error);
    }
}

// Заполнение фильтра фаз
function populatePhaseFilter() {
    if (!roadmapData) return;
    
    const phaseFilter = document.getElementById('phaseFilter');
    if (!phaseFilter) return;
    
    // Очищаем опции кроме "Все фазы"
    phaseFilter.innerHTML = '<option value="all">Все фазы</option>';
    
    roadmapData.phases.forEach(phase => {
        const option = document.createElement('option');
        option.value = phase.id;
        option.textContent = phase.name;
        phaseFilter.appendChild(option);
    });
}

// Переключение вида
function switchView(view) {
    currentView = view;
    
    // Обновление кнопок
    ['month', 'week', 'day'].forEach(v => {
        const btn = document.getElementById(`view${v.charAt(0).toUpperCase() + v.slice(1)}Btn`);
        if (btn) {
            if (v === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    
    // Обновление текста кнопок навигации
    const prevBtnText = document.getElementById('prevBtnText');
    const nextBtnText = document.getElementById('nextBtnText');
    
    if (view === 'month') {
        if (prevBtnText) prevBtnText.textContent = 'Предыдущий месяц';
        if (nextBtnText) nextBtnText.textContent = 'Следующий месяц';
    } else if (view === 'week') {
        if (prevBtnText) prevBtnText.textContent = 'Предыдущая неделя';
        if (nextBtnText) nextBtnText.textContent = 'Следующая неделя';
    } else {
        if (prevBtnText) prevBtnText.textContent = 'Предыдущий день';
        if (nextBtnText) nextBtnText.textContent = 'Следующий день';
    }
    
    renderCalendar();
}

// Предыдущий период
function previousPeriod() {
    if (currentView === 'month') {
        previousMonth();
    } else if (currentView === 'week') {
        previousWeek();
    } else {
        previousDay();
    }
}

// Следующий период
function nextPeriod() {
    if (currentView === 'month') {
        nextMonth();
    } else if (currentView === 'week') {
        nextWeek();
    } else {
        nextDay();
    }
}

// Рендеринг календаря
function renderCalendar() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    if (currentView === 'week') {
        renderWeekView();
        return;
    } else if (currentView === 'day') {
        renderDayView();
        return;
    }
    
    // Вид месяца (существующий код)
    renderMonthView();
}

// Рендеринг вида месяца
function renderMonthView() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    const monthYear = document.getElementById('currentMonthYear');
    
    if (monthYear) {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                           'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }

    // Вычисление дат для плана обучения
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = startDate.getDay();
    const daysInMonth = endDate.getDate();
    const today = new Date();

    // Создание карты дней обучения
    const learningDaysMap = createLearningDaysMap();

    let html = '<div class="calendar-grid">';
    
    // Дни недели
    const weekDaysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const weekDaysStart = calendarSettings.firstDayOfWeek;
    const weekDays = [];
    
    // Создаем массив дней недели с учетом первого дня
    for (let i = 0; i < 7; i++) {
        const index = (weekDaysStart + i) % 7;
        weekDays.push(weekDaysNames[index === 0 ? 6 : index - 1]);
    }
    
    weekDays.forEach(day => {
        html += `<div class="calendar-day-header" style="font-weight: 600; text-align: center; padding: 0.5rem;">${day}</div>`;
    });

    // Пустые ячейки до первого дня месяца
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const offset = calendarSettings.firstDayOfWeek === 0 ? 
        (adjustedFirstDay === 6 ? 0 : adjustedFirstDay + 1) : 
        (adjustedFirstDay - calendarSettings.firstDayOfWeek + 1 + 7) % 7;
    
    for (let i = 0; i < offset; i++) {
        html += '<div class="calendar-day"></div>';
    }

    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        const isToday = date.toDateString() === today.toDateString();
        const dayInfo = learningDaysMap[dateStr];
        
        // Применяем фильтры
        if (dayInfo && !passesFilters(dayInfo, dateStr)) {
            html += `<div class="calendar-day filtered-out"></div>`;
            continue;
        }
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (dayInfo) {
            if (dayInfo.completed) classes += ' completed';
            else if (dayInfo.inProgress) classes += ' in-progress';
            else classes += ' planned';
            
        // Проверка на пропущенный день
        if (!dayInfo.completed && date < today && dayInfo.day) {
            classes += ' missed';
        }
        
        // Проверка целей и дедлайнов
        const goals = getGoalsForDate(dateStr);
        if (goals.length > 0) {
            classes += ' has-goal';
            const hasDeadline = goals.some(g => g.deadline && new Date(g.deadline) <= date);
            if (hasDeadline) {
                classes += ' has-deadline';
            }
        }
        
        // Проверка достижений
        const achievements = getAchievementsForDate(dateStr);
        if (achievements.length > 0) {
            classes += ' has-achievement';
        }
        }

        // Вычисляем прогресс для дня
        let progressPercent = 0;
        let taskCount = 0;
        let completedTasks = 0;
        let typeIcon = '';
        let streakIndicator = '';
        
        if (dayInfo && dayInfo.day) {
            const tasks = dayInfo.day.tasks || [];
            taskCount = tasks.length;
            completedTasks = tasks.filter(t => ProgressTracker.isTaskCompleted(t.id)).length;
            progressPercent = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;
            
            // Иконка типа
            if (dayInfo.type === 'theory') typeIcon = '<i class="fas fa-book"></i>';
            else if (dayInfo.type === 'practice') typeIcon = '<i class="fas fa-code"></i>';
            else if (dayInfo.type === 'project') typeIcon = '<i class="fas fa-project-diagram"></i>';
            
            // Индикатор стрика
            if (typeof Gamification !== 'undefined') {
                const gamificationData = Gamification.getData();
                if (gamificationData.streak > 0) {
                    const date = new Date(dateStr);
                    const today = new Date();
                    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
                    if (daysDiff >= 0 && daysDiff < gamificationData.streak) {
                        streakIndicator = `<div class="streak-indicator" title="Стрик: ${gamificationData.streak} дней">🔥</div>`;
                    }
                }
            }
        }
        
        html += `
            <div class="${classes}" onclick="showDayDetails('${dateStr}')">
                <div class="day-number">${day}</div>
                ${streakIndicator}
                ${dayInfo ? `
                    <div class="day-content">
                        ${typeIcon ? `<div class="day-type-icon">${typeIcon}</div>` : ''}
                        <div class="day-title">${dayInfo.title}</div>
                        ${taskCount > 0 ? `
                            <div class="day-progress-indicator">
                                <div class="progress-circle" data-progress="${progressPercent}">
                                    <svg class="progress-ring" width="30" height="30">
                                        <circle class="progress-ring-circle" cx="15" cy="15" r="12" />
                                    </svg>
                                    <span class="progress-text">${progressPercent}%</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                ${getGoalsForDate(dateStr).length > 0 ? `
                    <div class="goal-marker" title="Цель на этот день">
                        <i class="fas fa-bullseye"></i>
                    </div>
                ` : ''}
                ${getAchievementsForDate(dateStr).length > 0 ? `
                    <div class="achievement-marker" title="Достижение разблокировано">
                        <i class="fas fa-trophy"></i>
                    </div>
                ` : ''}
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
    
    // Инициализация прогресс-колец
    initializeProgressRings();
}

// Инициализация прогресс-колец
function initializeProgressRings() {
    const progressCircles = document.querySelectorAll('.progress-circle[data-progress]');
    progressCircles.forEach(circle => {
        const progress = parseInt(circle.getAttribute('data-progress'));
        const ring = circle.querySelector('.progress-ring-circle');
        if (ring) {
            const circumference = 2 * Math.PI * 12;
            const offset = circumference - (progress / 100) * circumference;
            ring.style.strokeDasharray = `${circumference} ${circumference}`;
            ring.style.strokeDashoffset = offset;
            ring.style.stroke = getProgressColor(progress);
            ring.style.transition = 'stroke-dashoffset 0.5s ease, stroke 0.3s ease';
        }
    });
}

// Получить цвет прогресса
function getProgressColor(progress) {
    if (progress === 100) return 'var(--success-color)';
    if (progress >= 50) return 'var(--primary-color)';
    if (progress > 0) return 'var(--warning-color)';
    return 'rgba(51, 65, 85, 0.6)';
}

// Получить цели для даты
function getGoalsForDate(dateStr) {
    if (typeof GoalsSystem === 'undefined') return [];
    
    const goals = GoalsSystem.getGoals();
    const date = new Date(dateStr);
    
    return goals.filter(goal => {
        if (!goal.deadline) return false;
        const deadline = new Date(goal.deadline);
        return deadline.toDateString() === date.toDateString();
    });
}

// Показать цели в модальном окне
function showGoalsInModal(modalBody, dateStr) {
    const goals = getGoalsForDate(dateStr);
    if (goals.length === 0) return;
    
    const goalsHtml = `
        <div class="day-section">
            <h4><i class="fas fa-bullseye"></i> Цели и дедлайны:</h4>
            <div class="goals-list">
                ${goals.map(goal => {
                    const deadline = new Date(goal.deadline);
                    const today = new Date();
                    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                    const isOverdue = deadline < today;
                    const progress = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
                    
                    return `
                        <div class="goal-item ${isOverdue ? 'overdue' : ''}">
                            <div class="goal-header">
                                <strong>${goal.title}</strong>
                                ${isOverdue ? '<span class="badge-danger">Просрочено</span>' : 
                                  daysLeft <= 3 ? `<span class="badge-warning">Осталось ${daysLeft} дн.</span>` : 
                                  `<span class="badge-info">Осталось ${daysLeft} дн.</span>`}
                            </div>
                            ${goal.description ? `<p class="goal-description">${goal.description}</p>` : ''}
                            <div class="goal-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                                <span>${goal.current}/${goal.target}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Вставляем цели перед навигацией
    const navigation = modalBody.querySelector('.day-navigation');
    if (navigation) {
        navigation.insertAdjacentHTML('beforebegin', goalsHtml);
    } else {
        modalBody.insertAdjacentHTML('beforeend', goalsHtml);
    }
}

// Создание карты дней обучения
function createLearningDaysMap() {
    if (!roadmapData) return {};
    
    const map = {};
    let currentDay = 0;
    const startDate = getStartDate();
    
    roadmapData.phases.forEach(phase => {
        phase.months.forEach(month => {
            month.weeks.forEach(week => {
                week.days.forEach(day => {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + currentDay);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    // Проверка выполнения
                    const completed = ProgressTracker.isTaskCompleted(day.id);
                    const tasks = day.tasks || [];
                    const completedTasks = tasks.filter(t => ProgressTracker.isTaskCompleted(t.id)).length;
                    const inProgress = completedTasks > 0 && completedTasks < tasks.length;
                    
                    map[dateStr] = {
                        title: day.title,
                        completed: completed,
                        inProgress: inProgress,
                        day: day,
                        phase: phase.id,
                        phaseName: phase.name,
                        type: day.type || 'theory'
                    };
                    
                    currentDay++;
                });
            });
        });
    });
    
    return map;
}

// Получить дату начала обучения
function getStartDate() {
    if (calendarSettings.startDate) {
        return new Date(calendarSettings.startDate);
    }
    const saved = localStorage.getItem('learning_start_date');
    return saved ? new Date(saved) : new Date();
}

// Проверка прохождения фильтров
function passesFilters(dayInfo, dateStr) {
    // Фильтр по фазе
    if (currentFilters.phase !== 'all' && dayInfo.phase !== currentFilters.phase) {
        return false;
    }
    
    // Фильтр по статусу
    if (currentFilters.status !== 'all') {
        const today = new Date();
        const date = new Date(dateStr);
        const isMissed = !dayInfo.completed && date < today && dayInfo.day;
        
        if (currentFilters.status === 'completed' && !dayInfo.completed) return false;
        if (currentFilters.status === 'in-progress' && !dayInfo.inProgress) return false;
        if (currentFilters.status === 'planned' && (dayInfo.completed || dayInfo.inProgress)) return false;
        if (currentFilters.status === 'missed' && !isMissed) return false;
    }
    
    // Фильтр по типу
    if (currentFilters.type !== 'all' && dayInfo.type !== currentFilters.type) {
        return false;
    }
    
    // Поиск по названию
    if (currentFilters.search && dayInfo.title) {
        const searchLower = currentFilters.search.toLowerCase();
        if (!dayInfo.title.toLowerCase().includes(searchLower)) {
            return false;
        }
    }
    
    return true;
}

// Применить фильтры
function applyFilters() {
    const phaseFilter = document.getElementById('phaseFilter');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchInput');
    
    currentFilters.phase = phaseFilter ? phaseFilter.value : 'all';
    currentFilters.status = statusFilter ? statusFilter.value : 'all';
    currentFilters.type = typeFilter ? typeFilter.value : 'all';
    currentFilters.search = searchInput ? searchInput.value.trim() : '';
    
    renderCalendar();
}

// Сбросить фильтры
function resetFilters() {
    const phaseFilter = document.getElementById('phaseFilter');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (phaseFilter) phaseFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';
    if (searchInput) searchInput.value = '';
    
    currentFilters = {
        phase: 'all',
        status: 'all',
        type: 'all',
        search: ''
    };
    
    renderCalendar();
}

// Перейти к сегодняшнему дню
function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    renderCalendar();
    
    // Показываем детали сегодняшнего дня
    const todayStr = today.toISOString().split('T')[0];
    setTimeout(() => {
        showDayDetails(todayStr);
    }, 100);
}

// Показать выбор даты
function showDatePicker() {
    const dateStr = prompt('Введите дату (ГГГГ-ММ-ДД):', new Date().toISOString().split('T')[0]);
    if (!dateStr) return;
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            alert('Неверный формат даты!');
            return;
        }
        
        currentMonth = date.getMonth();
        currentYear = date.getFullYear();
        renderCalendar();
        
        setTimeout(() => {
            showDayDetails(dateStr);
        }, 100);
    } catch (e) {
        alert('Ошибка при обработке даты!');
    }
}

// Показать детали дня
function showDayDetails(dateStr) {
    if (!roadmapData) return;
    
    const learningDaysMap = createLearningDaysMap();
    const dayInfo = learningDaysMap[dateStr];
    
    if (!dayInfo || !dayInfo.day) {
        // Если день не найден в плане, показываем пустое модальное окно
        showDayModal(null, dateStr);
        return;
    }
    
    showDayModal(dayInfo.day, dateStr, dayInfo);
}

// Показать модальное окно дня
function showDayModal(day, dateStr, dayInfo = null) {
    const modal = document.getElementById('dayModal');
    const modalTitle = document.getElementById('modalDayTitle');
    const modalBody = document.getElementById('modalDayBody');
    const completeBtn = document.getElementById('modalCompleteBtn');
    const openRoadmapBtn = document.getElementById('modalOpenRoadmapBtn');
    
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    if (!day) {
        modalTitle.textContent = `День: ${formatDate(dateStr)}`;
        modalBody.innerHTML = '<p>На этот день не запланировано занятий.</p>';
        completeBtn.style.display = 'none';
        openRoadmapBtn.style.display = 'none';
        return;
    }
    
    const date = new Date(dateStr);
    const formattedDate = formatDate(dateStr);
    modalTitle.textContent = `${day.title || 'День обучения'} - ${formattedDate}`;
    
    // Проверка выполнения
    const completed = dayInfo ? dayInfo.completed : false;
    const tasks = day.tasks || [];
    const completedTasks = tasks.filter(t => ProgressTracker.isTaskCompleted(t.id)).length;
    const totalTasks = tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Тип дня
    const typeIcon = day.type === 'theory' ? 'fa-book' : day.type === 'practice' ? 'fa-code' : 'fa-project-diagram';
    const typeText = day.type === 'theory' ? 'Теория' : day.type === 'practice' ? 'Практика' : 'Проект';
    
    let html = `
        <div class="calendar-day-detail">
            <div class="day-detail-header">
                <div class="day-type-badge ${day.type}">
                    <i class="fas ${typeIcon}"></i>
                    <span>${typeText}</span>
                </div>
                <div class="day-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span>${completedTasks}/${totalTasks} заданий</span>
                </div>
            </div>
            
            ${day.description ? `<div class="day-description"><p>${day.description}</p></div>` : ''}
            
            ${day.whatToUnderstand ? `
                <div class="day-section">
                    <h4><i class="fas fa-lightbulb"></i> Что понять:</h4>
                    <p>${day.whatToUnderstand}</p>
                </div>
            ` : ''}
            
            ${day.whatToDo ? `
                <div class="day-section">
                    <h4><i class="fas fa-tasks"></i> Что сделать:</h4>
                    <p>${day.whatToDo}</p>
                </div>
            ` : ''}
            
            ${day.youtubeVideo ? `
                <div class="day-section">
                    <h4><i class="fab fa-youtube"></i> Видео:</h4>
                    <div class="youtube-video">
                        <p>${day.youtubeVideo}</p>
                        <button class="btn btn-secondary btn-sm" onclick="searchYouTube('${day.youtubeVideo}')">
                            <i class="fab fa-youtube"></i> Найти на YouTube
                        </button>
                    </div>
                </div>
            ` : ''}
            
            ${tasks.length > 0 ? `
                <div class="day-section">
                    <h4><i class="fas fa-list-check"></i> Задания:</h4>
                    <div class="tasks-list">
                        ${tasks.map(task => {
                            const isCompleted = ProgressTracker.isTaskCompleted(task.id);
                            return `
                                <div class="task-item ${isCompleted ? 'completed' : ''}">
                                    <label class="task-checkbox">
                                        <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                                               onchange="toggleTask('${task.id}', this.checked)">
                                        <span>${task.text}</span>
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="day-navigation">
                ${getPreviousDay(dateStr) ? `
                    <button class="btn btn-secondary btn-sm" onclick="navigateToDay('${getPreviousDay(dateStr)}')">
                        <i class="fas fa-chevron-left"></i> Предыдущий день
                    </button>
                ` : ''}
                ${getNextDay(dateStr) ? `
                    <button class="btn btn-secondary btn-sm" onclick="navigateToDay('${getNextDay(dateStr)}')">
                        Следующий день <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
    
    // Добавляем цели в модальное окно
    showGoalsInModal(modalBody, dateStr);
    
    // Добавляем достижения в модальное окно
    showAchievementsInModal(modalBody, dateStr);
    
    // Настройка кнопок
    if (completed) {
        completeBtn.innerHTML = '<i class="fas fa-undo"></i> Отметить невыполненным';
        completeBtn.classList.remove('btn-primary');
        completeBtn.classList.add('btn-warning');
    } else {
        completeBtn.innerHTML = '<i class="fas fa-check"></i> Отметить выполненным';
        completeBtn.classList.remove('btn-warning');
        completeBtn.classList.add('btn-primary');
    }
    
    // Сохраняем текущий день для использования в других функциях
    window.currentModalDay = day;
    window.currentModalDate = dateStr;
}

// Закрыть модальное окно
function closeDayModal() {
    const modal = document.getElementById('dayModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Форматирование даты
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('ru-RU', options);
}

// Переключение задачи
function toggleTask(taskId, completed) {
    if (completed) {
        ProgressTracker.completeTask(taskId);
    } else {
        ProgressTracker.uncompleteTask(taskId);
    }
    // Обновляем модальное окно
    if (window.currentModalDate) {
        showDayDetails(window.currentModalDate);
    }
    // Обновляем календарь
    renderCalendar();
}

// Отметить день как выполненный/невыполненный
function completeDayFromModal() {
    if (!window.currentModalDay || !window.currentModalDate) return;
    
    const dayInfo = createLearningDaysMap()[window.currentModalDate];
    const isCompleted = dayInfo && dayInfo.completed;
    
    if (isCompleted) {
        // Отметить как невыполненный
        if (window.currentModalDay.tasks) {
            window.currentModalDay.tasks.forEach(task => {
                if (ProgressTracker.isTaskCompleted(task.id)) {
                    ProgressTracker.uncompleteTask(task.id);
                }
            });
        }
    } else {
        // Отметить все задачи как выполненные
        if (window.currentModalDay.tasks) {
            window.currentModalDay.tasks.forEach(task => {
                if (!ProgressTracker.isTaskCompleted(task.id)) {
                    ProgressTracker.completeTask(task.id);
                }
            });
        }
    }
    
    renderCalendar();
    showDayDetails(window.currentModalDate);
}

// Открыть в плане обучения
function openInRoadmap() {
    if (window.currentModalDay && window.currentModalDay.id) {
        window.location.href = `roadmap.html#${window.currentModalDay.id}`;
    }
}

// Поделиться днем
function shareDay() {
    if (!window.currentModalDay || !window.currentModalDate) return;
    
    const text = `Изучаю: ${window.currentModalDay.title} - ${formatDate(window.currentModalDate)}`;
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: 'CyberSecurity Learning',
            text: text,
            url: url
        });
    } else {
        // Fallback - копирование в буфер обмена
        navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
            alert('Ссылка скопирована в буфер обмена!');
        });
    }
}

// Поиск на YouTube
function searchYouTube(query) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
}

// Навигация к другому дню
function navigateToDay(dateStr) {
    closeDayModal();
    // Переключаемся на месяц, если нужно
    const date = new Date(dateStr);
    if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
        currentMonth = date.getMonth();
        currentYear = date.getFullYear();
        renderCalendar();
    }
    setTimeout(() => {
        showDayDetails(dateStr);
    }, 100);
}

// Получить предыдущий день
function getPreviousDay(dateStr) {
    const learningDaysMap = createLearningDaysMap();
    const dates = Object.keys(learningDaysMap).sort();
    const currentIndex = dates.indexOf(dateStr);
    return currentIndex > 0 ? dates[currentIndex - 1] : null;
}

// Получить следующий день
function getNextDay(dateStr) {
    const learningDaysMap = createLearningDaysMap();
    const dates = Object.keys(learningDaysMap).sort();
    const currentIndex = dates.indexOf(dateStr);
    return currentIndex < dates.length - 1 ? dates[currentIndex + 1] : null;
}

// Закрытие модального окна при клике вне его
document.addEventListener('click', (e) => {
    const modal = document.getElementById('dayModal');
    if (modal && e.target === modal) {
        closeDayModal();
    }
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDayModal();
    }
});

// Экспорт функций
function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Закрытие меню экспорта при клике вне его
document.addEventListener('click', (e) => {
    const menu = document.getElementById('exportMenu');
    const button = e.target.closest('.export-dropdown button');
    if (menu && !menu.contains(e.target) && !button) {
        menu.style.display = 'none';
    }
});

// Экспорт в iCal
function exportToICal() {
    if (!roadmapData) {
        alert('План обучения не загружен!');
        return;
    }
    
    const learningDaysMap = createLearningDaysMap();
    const startDate = getStartDate();
    
    let icsContent = 'BEGIN:VCALENDAR\n';
    icsContent += 'VERSION:2.0\n';
    icsContent += 'PRODID:-//CyberSecurity Learning//Calendar//EN\n';
    icsContent += 'CALSCALE:GREGORIAN\n';
    icsContent += 'METHOD:PUBLISH\n';
    
    Object.keys(learningDaysMap).forEach(dateStr => {
        const dayInfo = learningDaysMap[dateStr];
        if (!dayInfo || !dayInfo.day) return;
        
        const date = new Date(dateStr);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        
        const formatDate = (d) => {
            return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        icsContent += 'BEGIN:VEVENT\n';
        icsContent += `UID:${dayInfo.day.id}@cybersecurity-learning\n`;
        icsContent += `DTSTART:${formatDate(date)}\n`;
        icsContent += `DTEND:${formatDate(endDate)}\n`;
        icsContent += `SUMMARY:${dayInfo.day.title || 'День обучения'}\n`;
        icsContent += `DESCRIPTION:${(dayInfo.day.description || '').replace(/\n/g, '\\n')}\n`;
        icsContent += `STATUS:${dayInfo.completed ? 'CONFIRMED' : 'TENTATIVE'}\n`;
        icsContent += 'END:VEVENT\n';
    });
    
    icsContent += 'END:VCALENDAR\n';
    
    // Скачивание файла
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cybersecurity-calendar-${new Date().toISOString().split('T')[0]}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('exportMenu').style.display = 'none';
}

// Экспорт в PDF
function exportToPDF() {
    if (typeof window.jspdf === 'undefined') {
        alert('Библиотека jsPDF не загружена!');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Заголовок
    doc.setFontSize(18);
    doc.text('Календарь обучения', 105, 20, { align: 'center' });
    
    // Месяц и год
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    doc.setFontSize(14);
    doc.text(`${monthNames[currentMonth]} ${currentYear}`, 105, 30, { align: 'center' });
    
    // Статистика
    const stats = calculateQuickStats();
    doc.setFontSize(10);
    doc.text(`Выполнено дней: ${stats.completedDays}`, 20, 45);
    doc.text(`Выполнено заданий: ${stats.completedTasks}`, 20, 50);
    doc.text(`Прогресс: ${stats.progress}%`, 20, 55);
    
    // Календарь
    let y = 65;
    const learningDaysMap = createLearningDaysMap();
    const today = new Date();
    
    for (let day = 1; day <= new Date(currentYear, currentMonth + 1, 0).getDate(); day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayInfo = learningDaysMap[dateStr];
        
        if (dayInfo && dayInfo.day) {
            const status = dayInfo.completed ? '✓' : dayInfo.inProgress ? '◐' : '○';
            doc.text(`${day}. ${dayInfo.day.title} ${status}`, 20, y);
            y += 5;
            
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
        }
    }
    
    // Сохранение
    doc.save(`cybersecurity-calendar-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.pdf`);
    document.getElementById('exportMenu').style.display = 'none';
}

// Экспорт в CSV
function exportToCSV() {
    if (!roadmapData) {
        alert('План обучения не загружен!');
        return;
    }
    
    const learningDaysMap = createLearningDaysMap();
    let csvContent = 'Дата,Название,Тип,Статус,Заданий,Выполнено\n';
    
    Object.keys(learningDaysMap).sort().forEach(dateStr => {
        const dayInfo = learningDaysMap[dateStr];
        if (!dayInfo || !dayInfo.day) return;
        
        const tasks = dayInfo.day.tasks || [];
        const completedTasks = tasks.filter(t => ProgressTracker.isTaskCompleted(t.id)).length;
        const status = dayInfo.completed ? 'Выполнено' : dayInfo.inProgress ? 'В процессе' : 'Запланировано';
        
        csvContent += `"${dateStr}","${dayInfo.day.title || ''}","${dayInfo.type || 'theory'}","${status}",${tasks.length},${completedTasks}\n`;
    });
    
    // Скачивание
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cybersecurity-progress-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('exportMenu').style.display = 'none';
}

// Экспорт в JSON
function exportToJSON() {
    if (!roadmapData) {
        alert('План обучения не загружен!');
        return;
    }
    
    const learningDaysMap = createLearningDaysMap();
    const progress = ProgressTracker.getProgress();
    const gamificationData = typeof Gamification !== 'undefined' ? Gamification.getData() : null;
    
    const exportData = {
        exportDate: new Date().toISOString(),
        calendar: {
            currentMonth: currentMonth + 1,
            currentYear: currentYear
        },
        progress: {
            completedTasks: Object.keys(progress.completedTasks || {}).length,
            completedDays: Object.keys(progress.completedDays || {}).length
        },
        gamification: gamificationData,
        days: Object.keys(learningDaysMap).sort().map(dateStr => {
            const dayInfo = learningDaysMap[dateStr];
            if (!dayInfo || !dayInfo.day) return null;
            
            const tasks = dayInfo.day.tasks || [];
            const completedTasks = tasks.filter(t => ProgressTracker.isTaskCompleted(t.id)).length;
            
            return {
                date: dateStr,
                title: dayInfo.day.title,
                type: dayInfo.type,
                status: dayInfo.completed ? 'completed' : dayInfo.inProgress ? 'in-progress' : 'planned',
                tasks: {
                    total: tasks.length,
                    completed: completedTasks
                },
                description: dayInfo.day.description
            };
        }).filter(d => d !== null)
    };
    
    // Скачивание
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cybersecurity-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    document.getElementById('exportMenu').style.display = 'none';
}

// Получить достижения для даты
function getAchievementsForDate(dateStr) {
    if (typeof AchievementsSystem === 'undefined') return [];
    
    const unlocked = AchievementsSystem.getUnlocked();
    const achievements = AchievementsSystem.getAllAchievements();
    
    // Получаем достижения, разблокированные в этот день
    const progress = ProgressTracker.getProgress();
    const date = new Date(dateStr);
    
    return achievements.filter(achievement => {
        if (!unlocked.includes(achievement.id)) return false;
        
        // Проверяем, когда было разблокировано достижение
        const achievementData = progress.achievements || {};
        const unlockDate = achievementData[achievement.id];
        
        if (!unlockDate) return false;
        
        const unlock = new Date(unlockDate);
        return unlock.toDateString() === date.toDateString();
    });
}

// Показать достижения в модальном окне
function showAchievementsInModal(modalBody, dateStr) {
    const achievements = getAchievementsForDate(dateStr);
    if (achievements.length === 0) return;
    
    const achievementsHtml = `
        <div class="day-section">
            <h4><i class="fas fa-trophy"></i> Достижения разблокированы:</h4>
            <div class="achievements-list">
                ${achievements.map(achievement => {
                    return `
                        <div class="achievement-item">
                            <div class="achievement-icon-large">${achievement.icon || '🏆'}</div>
                            <div class="achievement-content">
                                <strong>${achievement.name}</strong>
                                <p>${achievement.description}</p>
                                <span class="achievement-points">+${achievement.points || 0} очков</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    // Вставляем достижения перед навигацией
    const navigation = modalBody.querySelector('.day-navigation');
    if (navigation) {
        navigation.insertAdjacentHTML('beforebegin', achievementsHtml);
    } else {
        modalBody.insertAdjacentHTML('beforeend', achievementsHtml);
    }
}

// Быстрая статистика для PDF
function calculateQuickStats() {
    const learningDaysMap = createLearningDaysMap();
    let completedDays = 0;
    let completedTasks = 0;
    let totalDays = 0;
    
    Object.keys(learningDaysMap).forEach(dateStr => {
        const dayInfo = learningDaysMap[dateStr];
        if (!dayInfo || !dayInfo.day) return;
        
        totalDays++;
        if (dayInfo.completed) completedDays++;
        
        const tasks = dayInfo.day.tasks || [];
        tasks.forEach(task => {
            if (ProgressTracker.isTaskCompleted(task.id)) {
                completedTasks++;
            }
        });
    });
    
    const progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
    
    return {
        completedDays,
        completedTasks,
        progress
    };
}

// Предыдущий месяц
function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

// Следующий месяц
function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// Рендеринг вида недели
function renderWeekView() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    const monthYear = document.getElementById('currentMonthYear');
    const learningDaysMap = createLearningDaysMap();
    const today = new Date();
    
    // Вычисляем начало недели
    const weekStart = new Date(currentYear, currentMonth, 1);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (calendarSettings.firstDayOfWeek === 0 ? 0 : 1));
    if (weekStart.getDay() === 0 && calendarSettings.firstDayOfWeek === 1) {
        weekStart.setDate(weekStart.getDate() - 7);
    }
    
    weekStart.setDate(weekStart.getDate() + currentWeek * 7);
    
    if (monthYear) {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                           'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthYear.textContent = `Неделя ${weekStart.getDate()}-${weekStart.getDate() + 6} ${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    
    let html = '<div class="week-view">';
    html += '<div class="week-timeline">';
    html += '<div class="time-header"></div>';
    
    // Заголовки дней
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayInfo = learningDaysMap[dateStr];
        const isToday = date.toDateString() === today.toDateString();
        
        html += `<div class="week-day-header ${isToday ? 'today' : ''}">`;
        html += `<div class="week-day-name">${['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()]}</div>`;
        html += `<div class="week-day-number">${date.getDate()}</div>`;
        if (dayInfo) {
            html += `<div class="week-day-title">${dayInfo.title}</div>`;
        }
        html += `</div>`;
    }
    html += '</div>';
    
    // Временные слоты
    html += '<div class="week-slots">';
    for (let hour = 6; hour < 24; hour++) {
        html += `<div class="time-slot-row">`;
        html += `<div class="time-label">${String(hour).padStart(2, '0')}:00</div>`;
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            date.setHours(hour, 0, 0, 0);
            const dateStr = date.toISOString().split('T')[0];
            const dayInfo = learningDaysMap[dateStr];
            
            html += `<div class="time-slot ${dayInfo ? 'has-content' : ''}" onclick="showDayDetails('${dateStr}')"></div>`;
        }
        html += `</div>`;
    }
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
}

// Рендеринг вида дня
function renderDayView() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    const monthYear = document.getElementById('currentMonthYear');
    const learningDaysMap = createLearningDaysMap();
    const dateStr = currentDay.toISOString().split('T')[0];
    const dayInfo = learningDaysMap[dateStr];
    
    if (monthYear) {
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                           'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthYear.textContent = `${formatDate(dateStr)}`;
    }
    
    let html = '<div class="day-view">';
    html += '<div class="day-timeline">';
    
    if (dayInfo && dayInfo.day) {
        const tasks = dayInfo.day.tasks || [];
        html += `<div class="day-header">`;
        html += `<h3>${dayInfo.day.title}</h3>`;
        html += `<p>${dayInfo.day.description || ''}</p>`;
        html += `</div>`;
        
        // Временная шкала с задачами
        for (let hour = 6; hour < 24; hour++) {
            html += `<div class="timeline-hour">`;
            html += `<div class="hour-label">${String(hour).padStart(2, '0')}:00</div>`;
            html += `<div class="hour-content">`;
            
            // Задачи для этого часа (можно улучшить логику распределения)
            const hourTasks = tasks.filter((t, idx) => (idx % 18 + 6) === hour);
            hourTasks.forEach(task => {
                const isCompleted = ProgressTracker.isTaskCompleted(task.id);
                html += `<div class="timeline-task ${isCompleted ? 'completed' : ''}" onclick="toggleTask('${task.id}', ${!isCompleted})">`;
                html += `<div class="task-time">${String(hour).padStart(2, '0')}:00</div>`;
                html += `<div class="task-text">${task.text}</div>`;
                html += `</div>`;
            });
            
            html += `</div>`;
            html += `</div>`;
        }
    } else {
        html += '<div class="day-empty">На этот день не запланировано занятий.</div>';
    }
    
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
}

// Предыдущая неделя
function previousWeek() {
    currentWeek--;
    if (currentWeek < 0) {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        currentWeek = Math.floor(new Date(currentYear, currentMonth + 1, 0).getDate() / 7);
    }
    renderCalendar();
}

// Следующая неделя
function nextWeek() {
    currentWeek++;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    if (currentWeek * 7 > daysInMonth) {
        currentWeek = 0;
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    renderCalendar();
}

// Предыдущий день
function previousDay() {
    currentDay.setDate(currentDay.getDate() - 1);
    currentMonth = currentDay.getMonth();
    currentYear = currentDay.getFullYear();
    renderCalendar();
}

// Следующий день
function nextDay() {
    currentDay.setDate(currentDay.getDate() + 1);
    currentMonth = currentDay.getMonth();
    currentYear = currentDay.getFullYear();
    renderCalendar();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadCalendarSettings();
    loadRoadmapForCalendar();
    updateStatistics();
    initMobileGestures();
});

// Инициализация жестов для мобильных
function initMobileGestures() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 50;
        
        // Горизонтальный свайп
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // Свайп вправо - предыдущий период
                previousPeriod();
            } else {
                // Свайп влево - следующий период
                nextPeriod();
            }
        }
    }
    
    // Автоматическое применение компактного вида на мобильных
    if (window.innerWidth <= 768) {
        if (calendarSettings.density === 'normal') {
            calendarSettings.density = 'compact';
            saveCalendarSettings();
        }
    }
}

// Обновление статистики
function updateStatistics() {
    if (!roadmapData) return;
    
    const learningDaysMap = createLearningDaysMap();
    const progress = ProgressTracker.getProgress();
    
    // Подсчет статистики
    let completedDays = 0;
    let totalDays = 0;
    let completedTasks = 0;
    let totalTasks = 0;
    const weeklyActivity = {};
    const dayOfWeekActivity = {};
    
    Object.keys(learningDaysMap).forEach(dateStr => {
        const dayInfo = learningDaysMap[dateStr];
        const date = new Date(dateStr);
        totalDays++;
        
        if (dayInfo.completed) {
            completedDays++;
        }
        
        if (dayInfo.day && dayInfo.day.tasks) {
            const tasks = dayInfo.day.tasks;
            totalTasks += tasks.length;
            tasks.forEach(task => {
                if (ProgressTracker.isTaskCompleted(task.id)) {
                    completedTasks++;
                }
            });
        }
        
        // Активность по неделям
        const weekKey = getWeekKey(date);
        if (!weeklyActivity[weekKey]) {
            weeklyActivity[weekKey] = { completed: 0, total: 0 };
        }
        weeklyActivity[weekKey].total++;
        if (dayInfo.completed) {
            weeklyActivity[weekKey].completed++;
        }
        
        // Активность по дням недели
        const dayOfWeek = date.getDay();
        if (!dayOfWeekActivity[dayOfWeek]) {
            dayOfWeekActivity[dayOfWeek] = { completed: 0, total: 0 };
        }
        dayOfWeekActivity[dayOfWeek].total++;
        if (dayInfo.completed) {
            dayOfWeekActivity[dayOfWeek].completed++;
        }
    });
    
    // Обновление виджета
    const statCompletedDays = document.getElementById('statCompletedDays');
    const statCompletedTasks = document.getElementById('statCompletedTasks');
    const statProgress = document.getElementById('statProgress');
    const statStreak = document.getElementById('statStreak');
    
    if (statCompletedDays) statCompletedDays.textContent = completedDays;
    if (statCompletedTasks) statCompletedTasks.textContent = completedTasks;
    if (statProgress) {
        const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
        statProgress.textContent = progressPercent + '%';
    }
    
    if (statStreak && typeof Gamification !== 'undefined') {
        const gamificationData = Gamification.getData();
        statStreak.textContent = gamificationData.streak || 0;
    }
    
    // Обновление графиков
    updateWeeklyActivityChart(weeklyActivity);
    updateDayOfWeekChart(dayOfWeekActivity);
}

// Получить ключ недели
function getWeekKey(date) {
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    return `${year}-W${week}`;
}

// Обновление графика активности по неделям
let weeklyChart = null;
function updateWeeklyActivityChart(weeklyActivity) {
    const canvas = document.getElementById('weeklyActivityChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const weeks = Object.keys(weeklyActivity).sort();
    const completed = weeks.map(w => weeklyActivity[w].completed);
    const total = weeks.map(w => weeklyActivity[w].total);
    
    const ctx = canvas.getContext('2d');
    
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeks.map(w => w.replace('W', ' нед. ')),
            datasets: [{
                label: 'Выполнено',
                data: completed,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'var(--primary-color)',
                borderWidth: 1
            }, {
                label: 'Всего',
                data: total,
                backgroundColor: 'rgba(51, 65, 85, 0.4)',
                borderColor: 'var(--border-color)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'var(--text-color)'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'var(--text-color)'
                    },
                    grid: {
                        color: 'var(--border-color)'
                    }
                },
                x: {
                    ticks: {
                        color: 'var(--text-color)'
                    },
                    grid: {
                        color: 'var(--border-color)'
                    }
                }
            }
        }
    });
}

// Обновление графика по дням недели
let dayOfWeekChart = null;
function updateDayOfWeekChart(dayOfWeekActivity) {
    const canvas = document.getElementById('dayOfWeekChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const labels = [];
    const completed = [];
    const percentages = [];
    
    for (let i = 0; i < 7; i++) {
        labels.push(dayNames[i]);
        const data = dayOfWeekActivity[i] || { completed: 0, total: 0 };
        completed.push(data.completed);
        const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        percentages.push(percent);
    }
    
    const ctx = canvas.getContext('2d');
    
    if (dayOfWeekChart) {
        dayOfWeekChart.destroy();
    }
    
    dayOfWeekChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Процент выполнения',
                data: percentages,
                borderColor: 'var(--primary-color)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'var(--text-color)'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: 'var(--text-color)',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'var(--border-color)'
                    }
                },
                x: {
                    ticks: {
                        color: 'var(--text-color)'
                    },
                    grid: {
                        color: 'var(--border-color)'
                    }
                }
            }
        }
    });
}

