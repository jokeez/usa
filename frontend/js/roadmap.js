// Загрузка и отображение плана обучения

let roadmapData = null;

// Загрузка roadmap.json
async function loadRoadmap() {
    try {
        // Базовый путь сайта (для GitHub Pages: /usa/ или /)
        const pathname = window.location.pathname || '';
        const basePath = pathname.includes('/pages/') ? '../data/roadmap.json' : 'data/roadmap.json';
        const absoluteFromPage = new URL(basePath, window.location.href).href;
        const origin = window.location.origin || '';

        // Пути для разных окружений: локально, GitHub Pages (/usa/), корень
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
        let lastError = null;

        for (const path of paths) {
            try {
                response = await fetch(path);
                if (response && response.ok) {
                    break;
                }
            } catch (e) {
                lastError = e;
                continue;
            }
        }

        if (!response || !response.ok) {
            throw new Error('Файл roadmap.json не найден (статус ' + (response ? response.status : 'нет ответа') + ')');
        }

        let text = await response.text();
        text = text.replace(/^\uFEFF/, ''); // убрать BOM, если есть (часто при отдаче с GitHub Pages)
        try {
            roadmapData = JSON.parse(text);
        } catch (parseErr) {
            console.error('Ошибка парсинга JSON:', parseErr);
            throw new Error('Файл roadmap.json повреждён или неверный формат JSON.');
        }
        if (!roadmapData || !roadmapData.phases) {
            throw new Error('В roadmap.json нет поля phases.');
        }
        renderRoadmap();
    } catch (error) {
        console.error('Ошибка загрузки плана:', error);
        console.error('Текущий путь:', window.location.pathname);
        const container = document.getElementById('roadmapContainer');
        if (container) {
            const isFileProtocol = window.location.protocol === 'file:';
            container.innerHTML =
                '<p style="color: red; padding: 2rem; text-align: center;">Ошибка загрузки плана обучения. ' + (error.message || '') +
                '<br><small>Путь страницы: ' + window.location.pathname + '</small>' +
                (isFileProtocol ? '<br><br>Откройте сайт через сервер: <code>http://localhost:3000</code> (после <code>npm run dev</code>).</p>' : '</p>');
        }
    }
}

// Функция для полного экранирования HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Рендеринг плана
function renderRoadmap() {
    try {
        if (!roadmapData) {
            console.error('roadmapData is null');
            return;
        }

        const container = document.getElementById('roadmapContainer');
        if (!container) {
            console.error('roadmapContainer element not found');
            return;
        }
        
        let html = '';
        let dayCount = 0;

        roadmapData.phases.forEach((phase, phaseIndex) => {
            console.log(`Рендеринг фазы ${phaseIndex + 1}: ${phase.name}`);
            
            html += `
            <div class="phase-section" data-phase="${phase.id}">
                <div class="phase-header">
                    <h2>${phase.name}</h2>
                    <p>Длительность: ${phase.duration} дней</p>
                </div>
        `;

            phase.months.forEach((month, monthIndex) => {
                console.log(`  Рендеринг месяца ${monthIndex + 1}: ${month.name}`);
            html += `
                <div class="month-section">
                    <div class="month-header">
                        <h3>${month.name}</h3>
                    </div>
            `;

                month.weeks.forEach((week, weekIndex) => {
                    console.log(`    Рендеринг недели ${weekIndex + 1}: ${week.name}, дней: ${week.days ? week.days.length : 0}`);
                    
                    html += `
                    <div class="week-section">
                        <div class="week-header">
                            <h4>${week.name}</h4>
                        </div>
                `;

                    if (week.days) {
                        week.days.forEach((day, dayIndex) => {
                            try {
                                dayCount++;
                                
                                // Логируем каждый день вокруг проблемной зоны и каждый 10-й день для отслеживания прогресса
                                if (dayCount % 10 === 0 || dayCount >= 80 || dayCount === 88 || dayCount === 89 || dayCount === 90) {
                                    console.log(`      День ${dayCount}: ${day.id || dayIndex}, range: ${day.dayRange}, title: ${day.title ? day.title.substring(0, 30) : 'NO TITLE'}`);
                                }
                                
                                const dayId = day.id;
                                if (!dayId) {
                                    console.error(`      ОШИБКА: День ${dayCount} не имеет id!`, day);
                                    throw new Error(`Day ${dayCount} missing id`);
                                }
                                
                                const isCompleted = ProgressTracker.isTaskCompleted(dayId);
                                
                                // Экранируем HTML для безопасности (полное экранирование)
                                const safeTitle = escapeHtml(day.title || '');
                                const safeDescription = escapeHtml(day.description || '');
                                const safeYoutubeVideo = escapeHtml(day.youtubeVideo || '');
                                const safeWhatToUnderstand = escapeHtml(day.whatToUnderstand || '');
                                const safeWhatToDo = escapeHtml(day.whatToDo || '');
                                // Для атрибутов onclick нужно дополнительное экранирование
                                const safeYoutubeVideoForAttr = (day.youtubeVideo || '').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
                                const safeDayIdForAttr = dayId.replace(/'/g, "\\'").replace(/"/g, '\\"');
                                
                                html += `
                        <div class="day-item" data-day="${dayId}">
                            <div class="day-header">
                                <span class="day-title">День ${day.dayRange}: ${safeTitle}</span>
                                <span class="day-type ${day.type}">${day.type === 'theory' ? 'Теория' : 'Практика'}</span>
                            </div>
                            <div class="day-content">
                                <p><strong>Описание:</strong> ${safeDescription}</p>
                                ${day.youtubeVideo ? `
                                    <div class="youtube-video">
                                        <i class="fab fa-youtube"></i>
                                        <strong>Видео:</strong> ${safeYoutubeVideo}
                                        <div style="margin-top: 1rem;">
                                            <button class="btn btn-secondary" onclick="searchYouTubeVideo('${safeYoutubeVideoForAttr}', '${safeDayIdForAttr}')">
                                                <i class="fab fa-youtube"></i> Найти видео на YouTube
                                            </button>
                                            <div id="youtube-embed-${dayId}" style="margin-top: 1rem;"></div>
                                        </div>
                                    </div>
                                ` : ''}
                                ${day.whatToUnderstand ? `<p><strong>Что понять:</strong> ${safeWhatToUnderstand}</p>` : ''}
                                ${day.whatToDo ? `<p><strong>Что сделать:</strong> ${safeWhatToDo}</p>` : ''}
                            </div>
                            ${day.tasks && day.tasks.length > 0 ? `
                                <div class="tasks-list">
                                    ${day.tasks.map(task => {
                                        const taskCompleted = ProgressTracker.isTaskCompleted(task.id);
                                        const safeTaskText = escapeHtml(task.text || '');
                                        const safeTaskId = task.id.replace(/'/g, "\\'").replace(/"/g, '\\"');
                                        return `
                                            <div class="task-item ${taskCompleted ? 'completed' : ''}">
                                                <input type="checkbox" 
                                                       id="${task.id}" 
                                                       ${taskCompleted ? 'checked' : ''}
                                                       onchange="toggleTask('${safeTaskId}')">
                                                <label for="${task.id}">${safeTaskText}</label>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                            } catch (dayError) {
                                console.error(`Ошибка рендеринга дня ${dayCount} (${day.id || dayIndex}):`, dayError);
                                html += `<div class="day-item error"><p>Ошибка отображения дня ${day.id || dayIndex}</p></div>`;
                            }
                        });
                    } else {
                        console.warn(`      Неделя ${weekIndex + 1} не имеет дней!`);
                    }

                    html += `</div>`; // week-section
                });

                // Финальный проект месяца
                if (month.finalProject) {
                    const safeProjectTitle = escapeHtml(month.finalProject.title || '');
                    const safeProjectDescription = escapeHtml(month.finalProject.description || '');
                    const safeProjectYoutubeVideo = escapeHtml(month.finalProject.youtubeVideo || '');
                    
                    html += `
                    <div class="day-item final-project">
                        <div class="day-header">
                            <span class="day-title">Финальный проект: ${safeProjectTitle}</span>
                            <span class="day-type practice">Проект</span>
                        </div>
                        <div class="day-content">
                            <p><strong>Описание:</strong> ${safeProjectDescription}</p>
                            ${month.finalProject.youtubeVideo ? `
                                <div class="youtube-video">
                                    <i class="fab fa-youtube"></i>
                                    <strong>Видео:</strong> ${safeProjectYoutubeVideo}
                                </div>
                            ` : ''}
                            ${month.finalProject.tasks && month.finalProject.tasks.length > 0 ? `
                                <div class="tasks-list">
                                    ${month.finalProject.tasks.map(task => {
                                        const taskCompleted = ProgressTracker.isTaskCompleted(task.id);
                                        const safeTaskText = escapeHtml(task.text || '');
                                        const safeTaskId = task.id.replace(/'/g, "\\'").replace(/"/g, '\\"');
                                        return `
                                            <div class="task-item ${taskCompleted ? 'completed' : ''}">
                                                <input type="checkbox" 
                                                       id="${task.id}" 
                                                       ${taskCompleted ? 'checked' : ''}
                                                       onchange="toggleTask('${safeTaskId}')">
                                                <label for="${task.id}">${safeTaskText}</label>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                }

                html += `</div>`; // month-section
            });

            html += `</div>`; // phase-section
        });

        console.log('Генерация HTML завершена. Дней обработано:', dayCount);
        console.log('Размер сгенерированного HTML:', html.length, 'символов');
        
        // Проверяем HTML на ошибки перед вставкой
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const parseErrors = doc.querySelectorAll('parsererror');
        if (parseErrors.length > 0) {
            console.error('ОШИБКА ПАРСИНГА HTML:', parseErrors[0].textContent);
            // Показываем место ошибки
            const errorText = parseErrors[0].textContent;
            const errorIndex = html.indexOf('parsererror');
            console.error('Ошибка примерно на позиции:', errorIndex);
            console.error('HTML вокруг ошибки:', html.substring(Math.max(0, errorIndex - 500), Math.min(html.length, errorIndex + 500)));
        }
        
        container.innerHTML = html;
        
        const renderedItems = container.querySelectorAll('.day-item').length;
        console.log('Roadmap rendered successfully. Total days rendered:', dayCount, 'Expected:', roadmapData.totalDays);
        console.log('Фактически элементов в DOM:', renderedItems);
        
        if (renderedItems < dayCount) {
            console.error(`ПРОБЛЕМА: Обработано ${dayCount} дней, но в DOM только ${renderedItems} элементов!`);
            console.error('HTML сгенерирован некорректно. Проверьте синтаксис HTML после элемента', renderedItems);
        }
        console.log('Фактически элементов в DOM:', container.querySelectorAll('.day-item').length);
        
        // Сохраняем общее количество заданий для статистики
        let totalTasksCount = 0;
        roadmapData.phases.forEach(phase => {
            phase.months.forEach(month => {
                month.weeks.forEach(week => {
                    week.days.forEach(day => {
                        if (day.tasks) totalTasksCount += day.tasks.length;
                    });
                });
                if (month.finalProject && month.finalProject.tasks) {
                    totalTasksCount += month.finalProject.tasks.length;
                }
            });
        });
        localStorage.setItem('total_tasks_count', totalTasksCount.toString());
    } catch (error) {
        console.error('Ошибка рендеринга плана обучения:', error);
        console.error('Stack trace:', error.stack);
        const container = document.getElementById('roadmapContainer');
        if (container) {
            container.innerHTML = '<p style="color: red; padding: 2rem; text-align: center;">Ошибка отображения плана обучения. Проверьте консоль браузера для деталей.</p>';
        }
    }
}

// Поиск и встраивание YouTube видео
function searchYouTubeVideo(query, dayId) {
    // Проверка достижения "первый просмотр"
    if (typeof AchievementsSystem !== 'undefined') {
        const firstVideoKey = 'first_video_watched';
        if (!localStorage.getItem(firstVideoKey)) {
            AchievementsSystem.checkAchievement('first_video');
            localStorage.setItem(firstVideoKey, 'true');
        }
    }
    
    // Создаем поисковую ссылку на YouTube
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const embedContainer = document.getElementById(`youtube-embed-${dayId}`);
    
    if (!embedContainer) return;
    
    // Можно использовать YouTube Data API для поиска, но для простоты используем поисковую ссылку
    embedContainer.innerHTML = `
        <p style="margin-bottom: 0.5rem;">Нажмите на ссылку для поиска видео:</p>
        <a href="${searchUrl}" target="_blank" class="btn btn-primary">
            <i class="fab fa-youtube"></i> Открыть поиск на YouTube
        </a>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
            Примечание: Для встраивания видео нужен ID видео с YouTube. 
            После поиска скопируйте ID из URL (например, dQw4w9WgXcQ) и вставьте ниже:
        </p>
        <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
            <input type="text" id="video-id-${dayId}" placeholder="ID видео (например: dQw4w9WgXcQ)" 
                   style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--border-radius);">
            <button class="btn btn-primary" onclick="embedYouTubeVideo('${dayId}')">
                Встроить видео
            </button>
        </div>
    `;
}

// Встраивание YouTube видео по ID
function embedYouTubeVideo(dayId) {
    const videoIdInput = document.getElementById(`video-id-${dayId}`);
    if (!videoIdInput) {
        alert('Поле ввода не найдено');
        return;
    }
    
    const videoId = videoIdInput.value.trim();
    if (!videoId) {
        alert('Введите ID видео');
        return;
    }
    
    const embedContainer = document.getElementById(`youtube-embed-${dayId}`);
    if (!embedContainer) {
        alert('Контейнер для видео не найден');
        return;
    }
    
    embedContainer.innerHTML = `
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
            <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                    src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
            </iframe>
        </div>
    `;
}

// Переключение статуса задания
function toggleTask(taskId) {
    const checkbox = document.getElementById(taskId);
    if (!checkbox) return;
    
    if (checkbox.checked) {
        ProgressTracker.completeTask(taskId);
    } else {
        ProgressTracker.uncompleteTask(taskId);
    }
    
    // Обновление визуального состояния
    const taskItem = checkbox.closest('.task-item');
    if (taskItem) {
        if (checkbox.checked) {
            taskItem.classList.add('completed');
        } else {
            taskItem.classList.remove('completed');
        }
    }
}

// Фильтрация по фазе
document.addEventListener('DOMContentLoaded', () => {
    const phaseFilter = document.getElementById('phaseFilter');
    if (phaseFilter) {
        phaseFilter.addEventListener('change', (e) => {
            const selectedPhase = e.target.value;
            const phaseSections = document.querySelectorAll('.phase-section');
            
            const onlyEnglish = selectedPhase === 'english';
            phaseSections.forEach(section => {
                if (onlyEnglish || selectedPhase === 'all' || section.dataset.phase === selectedPhase) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
            const container = document.getElementById('roadmapContainer');
            if (container) {
                const allDays = container.querySelectorAll('.day-item');
                if (onlyEnglish) {
                    const engKeys = /английск|english/i;
                    allDays.forEach(el => {
                        el.style.display = el.textContent.match(engKeys) ? 'block' : 'none';
                    });
                    // Скрыть пустые недели, месяцы и фазы
                    container.querySelectorAll('.week-section').forEach(week => {
                        const days = week.querySelectorAll('.day-item');
                        const hasVisible = Array.from(days).some(d => d.style.display !== 'none');
                        week.style.display = hasVisible ? '' : 'none';
                    });
                    container.querySelectorAll('.month-section').forEach(month => {
                        const weeks = month.querySelectorAll('.week-section');
                        const finals = month.querySelectorAll('.day-item.final-project');
                        const hasVisibleWeek = Array.from(weeks).some(w => w.style.display !== 'none');
                        const visibleFinal = Array.from(finals).some(d => d.style.display !== 'none');
                        month.style.display = (hasVisibleWeek || visibleFinal) ? '' : 'none';
                    });
                    container.querySelectorAll('.phase-section').forEach(phase => {
                        const months = phase.querySelectorAll('.month-section');
                        const hasVisibleMonth = Array.from(months).some(m => m.style.display !== 'none');
                        phase.style.display = hasVisibleMonth ? '' : 'none';
                    });
                } else {
                    allDays.forEach(el => { el.style.display = ''; });
                    container.querySelectorAll('.week-section, .month-section, .phase-section').forEach(el => { el.style.display = ''; });
                }
            }
        });
    }

    // Поиск
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', Utils.debounce((e) => {
            const query = e.target.value.toLowerCase();
            const dayItems = document.querySelectorAll('.day-item');
            
            dayItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }, 300));
    }

    loadRoadmap();
});

