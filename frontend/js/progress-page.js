// Страница прогресса с графиками

let progressChart = null;
let monthsChart = null;

// Загрузка данных и рендеринг
async function loadProgressData() {
    const stats = ProgressTracker.getStats();
    
    // Обновление статистики
    const totalCompletedEl = document.getElementById('totalCompleted');
    const progressPercentageEl = document.getElementById('progressPercentage');
    const daysStudiedEl = document.getElementById('daysStudied');
    
    if (totalCompletedEl) totalCompletedEl.textContent = stats.completedTasks;
    if (progressPercentageEl) progressPercentageEl.textContent = stats.progressPercent + '%';
    if (daysStudiedEl) daysStudiedEl.textContent = stats.completedDays;

    // Загрузка roadmap для подсчета общего количества заданий
    try {
        const basePath = window.location.pathname.includes('/pages/') ? '../data/roadmap.json' : 'data/roadmap.json';
        const absoluteFromPage = new URL(basePath, window.location.href).href;
        const paths = [
            absoluteFromPage,
            basePath,
            '/data/roadmap.json',
            'data/roadmap.json',
            './data/roadmap.json',
            '../data/roadmap.json',
            (window.location.origin || '') + '/data/roadmap.json'
        ];
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
        const roadmap = await response.json();
        
        let totalTasks = 0;
        roadmap.phases.forEach(phase => {
            phase.months.forEach(month => {
                month.weeks.forEach(week => {
                    week.days.forEach(day => {
                        if (day.tasks) totalTasks += day.tasks.length;
                    });
                });
                if (month.finalProject && month.finalProject.tasks) {
                    totalTasks += month.finalProject.tasks.length;
                }
            });
        });

        const actualProgress = totalTasks > 0 ? Math.round((stats.completedTasks / totalTasks) * 100) : 0;
        document.getElementById('progressPercentage').textContent = actualProgress + '%';

        // Рендеринг графиков
        renderPhasesChart(roadmap);
        renderMonthsChart(roadmap);
        renderCompletedTasks(roadmap);
    } catch (error) {
        console.error('Ошибка загрузки roadmap:', error);
    }
}

// График по фазам
function renderPhasesChart(roadmap) {
    const ctx = document.getElementById('phasesChart');
    if (!ctx) {
        console.warn('Canvas для графика фаз не найден');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js не загружен');
        return;
    }

    const phaseData = roadmap.phases.map(phase => {
        let completed = 0;
        let total = 0;
        
        phase.months.forEach(month => {
            month.weeks.forEach(week => {
                week.days.forEach(day => {
                    if (day.tasks) {
                        total += day.tasks.length;
                        day.tasks.forEach(task => {
                            if (ProgressTracker.isTaskCompleted(task.id)) completed++;
                        });
                    }
                });
            });
            if (month.finalProject && month.finalProject.tasks) {
                total += month.finalProject.tasks.length;
                month.finalProject.tasks.forEach(task => {
                    if (ProgressTracker.isTaskCompleted(task.id)) completed++;
                });
            }
        });

        return {
            label: phase.name,
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    });

    if (progressChart) {
        progressChart.destroy();
    }

    progressChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: phaseData.map(p => p.label),
            datasets: [{
                label: 'Выполнено (%)',
                data: phaseData.map(p => p.percentage),
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// График по месяцам
function renderMonthsChart(roadmap) {
    const ctx = document.getElementById('monthsChart');
    if (!ctx) {
        console.warn('Canvas для графика месяцев не найден');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js не загружен');
        return;
    }

    const monthData = [];
    roadmap.phases.forEach(phase => {
        phase.months.forEach(month => {
            let completed = 0;
            let total = 0;
            
            month.weeks.forEach(week => {
                week.days.forEach(day => {
                    if (day.tasks) {
                        total += day.tasks.length;
                        day.tasks.forEach(task => {
                            if (ProgressTracker.isTaskCompleted(task.id)) completed++;
                        });
                    }
                });
            });
            if (month.finalProject && month.finalProject.tasks) {
                total += month.finalProject.tasks.length;
                month.finalProject.tasks.forEach(task => {
                    if (ProgressTracker.isTaskCompleted(task.id)) completed++;
                });
            }

            monthData.push({
                label: month.name,
                completed,
                total,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0
            });
        });
    });

    if (monthsChart) {
        monthsChart.destroy();
    }

    monthsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthData.map(m => m.label),
            datasets: [{
                label: 'Прогресс (%)',
                data: monthData.map(m => m.percentage),
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Список выполненных заданий
function renderCompletedTasks(roadmap) {
    const container = document.getElementById('completedTasksList');
    if (!container) return;

    const completedTasks = [];
    
    roadmap.phases.forEach(phase => {
        phase.months.forEach(month => {
            month.weeks.forEach(week => {
                week.days.forEach(day => {
                    if (day.tasks) {
                        day.tasks.forEach(task => {
                            if (ProgressTracker.isTaskCompleted(task.id)) {
                                completedTasks.push({
                                    task: task.text,
                                    day: day.title,
                                    phase: phase.name
                                });
                            }
                        });
                    }
                });
            });
            if (month.finalProject && month.finalProject.tasks) {
                month.finalProject.tasks.forEach(task => {
                    if (ProgressTracker.isTaskCompleted(task.id)) {
                        completedTasks.push({
                            task: task.text,
                            day: month.finalProject.title,
                            phase: phase.name
                        });
                    }
                });
            }
        });
    });

    if (completedTasks.length === 0) {
        container.innerHTML = '<p>Пока нет выполненных заданий.</p>';
        return;
    }

    container.innerHTML = completedTasks.map(item => `
        <div class="task-item completed">
            <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
            <div>
                <strong>${item.task}</strong>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    ${item.day} - ${item.phase}
                </div>
            </div>
        </div>
    `).join('');
}

// Экспорт прогресса
function exportProgress() {
    ProgressTracker.exportProgress();
}

// Импорт прогресса
function importProgress() {
    document.getElementById('importFile').click();
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const success = ProgressTracker.importProgress(e.target.result);
        if (success) {
            alert('Прогресс успешно импортирован!');
            loadProgressData();
        } else {
            alert('Ошибка импорта. Проверьте формат файла.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadProgressData();
    // Heatmap будет загружен после загрузки данных
    setTimeout(() => {
        if (typeof ActivityHeatmap !== 'undefined') {
            const container = document.getElementById('activityHeatmap');
            if (container) {
                ActivityHeatmap.generateHeatmap('activityHeatmap', 53);
            }
        }
    }, 500);
});

