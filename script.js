// ===== КОНСТАНТЫ И ПЕРЕМЕННЫЕ =====
const BOT_TOKEN = '7847121145:AAHP4QQrG71r2K@9CFsOkkxAsCQFKEnuCHM';
const BOT_TOKEN_ENCODED = encodeURIComponent(BOT_TOKEN);
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN_ENCODED}`;

// AI бот (нейросеть)
const AI_BOT_ID = '8241939804';
const DEFAULT_GROUP_ID = '-1002364854780'; // ← ТВОЯ ОСНОВНАЯ ГРУППА

const AI_CONFIG = {
    trigger: '!бот',
    maxLength: 1000,
    cooldown: 5, // секунд между запросами
    thinkingMessages: [
        '🤔 Думаю над ответом...',
        '🧠 Обрабатываю запрос...',
        '⚡ Консультируюсь с нейросетью...',
        '💭 Анализирую вопрос...',
        '🔍 Ищу лучший ответ...'
    ],
    errorMessages: [
        '⚠️ Нейросеть временно недоступна',
        '❌ Не удалось получить ответ',
        '🌀 Попробуйте позже',
        '📡 Ошибка подключения к AI'
    ]
};

// Глобальные переменные
let chats = [];
let totalMessages = 0;
let aiResponses = 0;
let successfulSends = 0;
let failedSends = 0;
let aiRequests = 0;
let sessionStart = new Date();
let lastAITime = 0;
let isPolling = false;
let lastUpdateId = 0;
let aiLogs = [];
let isAIActive = true;
let autoScroll = true;

// ===== УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ TELEGRAM API =====
async function callTelegramAPI(method, params = {}) {
    try {
        // Используем FormData для правильной отправки данных
        const formData = new FormData();
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                formData.append(key, params[key]);
            }
        });
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка Telegram API:', error);
        return {
            ok: false,
            description: error.message || 'Сетевая ошибка'
        };
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bot Manager AI загружен');
    
    // Загружаем данные
    loadChats();
    loadStats();
    loadSettings();
    loadAILogs();
    loadAIToday();
    
    // Инициализируем UI
    updateUI();
    
    // Проверяем статус бота
    checkBotStatus();
    
    // Запускаем таймеры
    updateTimers();
    setInterval(updateTimers, 1000);
    
    // Проверяем автопрослушивание
    if (document.getElementById('autoListen')?.checked) {
        setTimeout(() => checkAndStartPolling(), 2000);
    }
    
    // Добавляем первый лог
    addAILog('[SYSTEM]', 'Система AI запущена');
    addAILog('[INFO]', `Используйте "${AI_CONFIG.trigger} [вопрос]" в чатах`);
    addAILog('[GROUP]', `Основная группа: ${DEFAULT_GROUP_ID}`);
    
    // Инициализируем обработчики
    initEventListeners();
});

// ===== ЗАГРУЗКА ДАННЫХ =====
function loadChats() {
    try {
        const saved = localStorage.getItem('bot_manager_chats');
        if (saved) {
            chats = JSON.parse(saved);
            // Проверяем, есть ли уже основная группа
            if (!chats.some(c => c.id === DEFAULT_GROUP_ID)) {
                addDefaultGroup();
            }
        } else {
            addDefaultGroup();
        }
    } catch (e) {
        console.error('Ошибка загрузки чатов:', e);
        addDefaultGroup();
    }
    updateChatsUI();
}

function addDefaultGroup() {
    const defaultChat = {
        id: DEFAULT_GROUP_ID,
        name: 'Основная группа (тестовая)',
        added: new Date().toLocaleDateString(),
        messagesSent: 0,
        aiRequests: 0,
        lastUsed: null,
        isDefault: true
    };
    
    chats = [defaultChat, ...chats.filter(c => c.id !== DEFAULT_GROUP_ID)];
    saveChats();
}

function loadStats() {
    totalMessages = parseInt(localStorage.getItem('total_messages') || '0');
    aiResponses = parseInt(localStorage.getItem('ai_responses') || '0');
    successfulSends = parseInt(localStorage.getItem('successful_sends') || '0');
    failedSends = parseInt(localStorage.getItem('failed_sends') || '0');
    aiRequests = parseInt(localStorage.getItem('ai_requests') || '0');
    updateStatsUI();
}

function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('ai_settings') || '{}');
        document.getElementById('enableAI').checked = settings.enableAI !== false;
        document.getElementById('aiNotifications').checked = settings.aiNotifications !== false;
        document.getElementById('autoListen').checked = settings.autoListen !== false;
        isAIActive = settings.enableAI !== false;
    } catch (e) {
        console.error('Ошибка загрузки настроек:', e);
        isAIActive = true;
        document.getElementById('enableAI').checked = true;
        document.getElementById('aiNotifications').checked = true;
        document.getElementById('autoListen').checked = false;
    }
    updateAIStatus();
}

function loadAILogs() {
    try {
        const saved = localStorage.getItem('ai_logs');
        aiLogs = saved ? JSON.parse(saved) : [];
    } catch (e) {
        aiLogs = [];
    }
    updateAILogsUI();
}

function loadAIToday() {
    const today = new Date().toDateString();
    const aiToday = JSON.parse(localStorage.getItem('ai_today') || '{}');
    const todayCount = aiToday[today] || 0;
    document.getElementById('aiToday').textContent = todayCount;
}

// ===== СОХРАНЕНИЕ ДАННЫХ =====
function saveChats() {
    localStorage.setItem('bot_manager_chats', JSON.stringify(chats));
    updateChatsUI();
}

function saveStats() {
    localStorage.setItem('total_messages', totalMessages.toString());
    localStorage.setItem('ai_responses', aiResponses.toString());
    localStorage.setItem('successful_sends', successfulSends.toString());
    localStorage.setItem('failed_sends', failedSends.toString());
    localStorage.setItem('ai_requests', aiRequests.toString());
    updateStatsUI();
}

function saveSettings() {
    const settings = {
        enableAI: document.getElementById('enableAI').checked,
        aiNotifications: document.getElementById('aiNotifications').checked,
        autoListen: document.getElementById('autoListen').checked
    };
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    isAIActive = settings.enableAI;
    updateAIStatus();
    showStatusMessage('Настройки сохранены', 'success');
    addAILog('[SETTINGS]', 'Настройки AI обновлены');
}

function saveAILogs() {
    // Сохраняем только последние 200 записей
    const toSave = aiLogs.slice(-200);
    localStorage.setItem('ai_logs', JSON.stringify(toSave));
}

function saveAIToday() {
    const today = new Date().toDateString();
    const aiToday = JSON.parse(localStorage.getItem('ai_today') || '{}');
    aiToday[today] = (aiToday[today] || 0) + 1;
    localStorage.setItem('ai_today', JSON.stringify(aiToday));
    document.getElementById('aiToday').textContent = aiToday[today];
}

// ===== ОБНОВЛЕНИЕ UI =====
function updateUI() {
    document.getElementById('chatsCount').textContent = chats.length;
    document.getElementById('aiRequestsCount').textContent = aiRequests;
    document.getElementById('aiResponses').textContent = aiResponses;
    updateAIStatus();
}

function updateChatsUI() {
    const selector = document.getElementById('chatSelector');
    const list = document.getElementById('chatsList');
    
    // Обновляем селектор
    selector.innerHTML = '<option value="">Выберите чат...</option>';
    chats.forEach(chat => {
        const option = document.createElement('option');
        option.value = chat.id;
        option.textContent = `${chat.name} ${chat.isDefault ? '⭐' : ''} (${chat.id})`;
        if (chat.id === DEFAULT_GROUP_ID) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
    
    // Обновляем список
    list.innerHTML = '';
    if (chats.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>Чатов пока нет</p>
                <p class="empty-state-sub">Добавьте первый чат</p>
            </div>
        `;
        return;
    }
    
    chats.forEach((chat, index) => {
        const item = document.createElement('div');
        item.className = 'chat-item';
        if (chat.isDefault) {
            item.style.borderLeft = '4px solid var(--ai-color)';
            item.style.background = 'var(--gray-50)';
        }
        item.innerHTML = `
            <div class="chat-info">
                <div class="chat-name">
                    ${chat.name} ${chat.isDefault ? '<span style="color: var(--ai-color);">⭐</span>' : ''}
                </div>
                <div class="chat-id">${chat.id}</div>
                <div class="chat-stats">
                    <span>📅 ${chat.added}</span>
                    <span>✉️ ${chat.messagesSent || 0}</span>
                    ${chat.aiRequests ? `<span>🤖 ${chat.aiRequests}</span>` : ''}
                    ${chat.isDefault ? '<span style="color: var(--ai-color);">Основная</span>' : ''}
                </div>
            </div>
            <div class="chat-actions">
                <button class="btn-icon" onclick="selectChat('${chat.id}')" title="Выбрать">
                    <i class="fas fa-check"></i>
                </button>
                ${!chat.isDefault ? `
                <button class="btn-icon" onclick="deleteChat(${index})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </div>
        `;
        list.appendChild(item);
    });
}

function updateStatsUI() {
    document.getElementById('totalMessages').textContent = totalMessages;
    document.getElementById('aiRequestsCount').textContent = aiRequests;
    document.getElementById('aiResponses').textContent = aiResponses;
    
    const totalSends = successfulSends + failedSends;
    const successRate = totalSends > 0 
        ? Math.round((successfulSends / totalSends) * 100) 
        : 100;
    document.getElementById('successRate').textContent = `${successRate}%`;
    
    // Среднее время ответа (имитация)
    const avgTime = aiResponses > 0 ? Math.floor(aiResponses * 1.5) : 0;
    document.getElementById('avgResponseTime').textContent = `${avgTime}с`;
}

function updateAIStatus() {
    const statusElement = document.getElementById('aiStatus');
    if (isAIActive) {
        statusElement.textContent = 'Активен';
        statusElement.className = 'ai-status-text';
        statusElement.style.color = 'var(--ai-color)';
    } else {
        statusElement.textContent = 'Выключен';
        statusElement.className = 'ai-status-text';
        statusElement.style.color = 'var(--gray-500)';
    }
}

function updateAILogsUI() {
    const container = document.getElementById('aiLogs');
    container.innerHTML = '';
    
    // Показываем последние 50 записей
    const recentLogs = aiLogs.slice(-50).reverse();
    
    if (recentLogs.length === 0) {
        container.innerHTML = '<div class="log-entry ai-log">Логов AI пока нет</div>';
        return;
    }
    
    recentLogs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry ai-log';
        const time = new Date(log.timestamp).toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-source">${log.source}</span>
            <span class="log-message">${log.message}</span>
        `;
        container.appendChild(logEntry);
    });
    
    // Автопрокрутка вниз
    if (autoScroll && container.scrollHeight > container.clientHeight) {
        container.scrollTop = container.scrollHeight;
    }
}

function updateTimers() {
    const now = new Date();
    const sessionDiff = Math.floor((now - sessionStart) / 1000);
    const hours = Math.floor(sessionDiff / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((sessionDiff % 3600) / 60).toString().padStart(2, '0');
    const seconds = (sessionDiff % 60).toString().padStart(2, '0');
    document.getElementById('sessionTime').textContent = `${hours}:${minutes}:${seconds}`;
}

// ===== AI ФУНКЦИИ =====
async function queryAI(question) {
    if (!isAIActive) {
        throw new Error('AI отключен');
    }
    
    // Проверяем кулдаун
    const now = Date.now();
    if (now - lastAITime < AI_CONFIG.cooldown * 1000) {
        const waitTime = Math.ceil((AI_CONFIG.cooldown * 1000 - (now - lastAITime)) / 1000);
        throw new Error(`Подождите ${waitTime} секунд`);
    }
    
    lastAITime = now;
    aiRequests++;
    saveStats();
    addAILog('[AI_REQUEST]', `Запрос: ${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`);
    
    // Имитация запроса к нейросети
    return await simulateAIResponse(question);
}

async function simulateAIResponse(question) {
    // Имитируем задержку нейросети
    const delay = 1000 + Math.random() * 2000; // 1-3 секунды
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const q = question.toLowerCase().trim();
    
    // База знаний для демо
    const knowledgeBase = {
        // Приветствия
        'привет': 'Привет! 👋 Я AI-ассистент. Чем могу помочь?',
        'hello': 'Hello! How can I assist you today?',
        'hi': 'Hi there! Nice to meet you!',
        
        // О себе
        'кто ты': 'Я AI-ассистент, интегрированный в Telegram бота. Использую нейросетевые технологии для ответов на вопросы.',
        'что ты умеешь': 'Могу отвечать на вопросы, объяснять сложные темы, генерировать текст, шутить и многое другое!',
        'как тебя зовут': 'Меня зовут NeoAI. Я часть системы NeoCascade Bot! 🤖',
        
        // Технологии
        'нейросеть': 'Нейросеть — это математическая модель, вдохновленная работой человеческого мозга. Состоит из нейронов и связей между ними.',
        'искусственный интеллект': 'ИИ — область компьютерных наук, создающая системы, способные выполнять задачи, требующие человеческого интеллекта.',
        'машинное обучение': 'ML — подраздел ИИ, где системы обучаются на данных без явного программирования.',
        
        // Программирование
        'javascript': 'JavaScript — язык программирования для веба. Поддерживает функциональное и ООП. ES6+ добавил много крутых фич!',
        'python': 'Python — высокоуровневый язык с простым синтаксисом. Идеален для начинающих, data science и AI.',
        'html': 'HTML — язык разметки для создания структуры веб-страниц. Работает в паре с CSS и JS.',
        'css': 'CSS — язык стилей для оформления HTML-документов. Поддерживает анимации, сетки, flexbox.',
        
        // Шутки
        'шутка': 'Почему программист умер в душе? На бутылке с шампунем было написано: "Нанести, смыть, повторить"! 😄',
        'расскажи шутку': 'Как говорит нейросеть? "Я думаю, значит я exist()!"',
        'шутка про программистов': 'Сколько программистов нужно, чтобы вкрутить лампочку? Ни одного, это hardware проблема!',
        
        // Блокчейн
        'блокчейн': 'Блокчейн — цепочка блоков с данными. Каждый блок содержит хэш предыдущего, что обеспечивает неизменность.',
        
        // По умолчанию
        'default': [
            'Интересный вопрос! На основе моих знаний: это сложная тема, требующая детального рассмотрения.',
            'Хороший вопрос. Мне нужно больше контекста для точного ответа.',
            'Сейчас я анализирую ваш запрос. В реальной системе здесь был бы ответ от более мощной нейросети.',
            '🤖 *Имитация AI-ответа:* Ваш вопрос требует глубокого анализа. В реальной версии здесь был бы развернутый ответ от нейросети.',
            'Моя текущая версия ограничена демо-режимом. В реальном боте я бы подключился к GPT-4 или другой мощной модели.'
        ]
    };
    
    // Ищем ответ в базе знаний
    for (const [key, value] of Object.entries(knowledgeBase)) {
        if (q.includes(key)) {
            return Array.isArray(value) ? value[0] : value;
        }
    }
    
    // Если вопрос содержит знак вопроса
    if (q.includes('?')) {
        const answers = knowledgeBase.default;
        return answers[Math.floor(Math.random() * answers.length)];
    }
    
    // Стандартный ответ
    const responses = [
        `Вы спросили: "${question}"\n\nЯ понял ваш запрос. В реальной системе я бы передал его нейросети ${AI_BOT_ID} для обработки.`,
        `Запрос: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"\n\n🤖 *Демо-режим:* В реальном боте здесь был бы ответ от AI-нейросети.`,
        `Вопрос принят! В рабочей версии бот бы:\n1. Переслал вопрос нейросети\n2. Получил ответ\n3. Отправил его в чат\n\nСейчас в демо-режиме.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

async function handleAICommand(chatId, userId, messageText) {
    if (!messageText.toLowerCase().startsWith(AI_CONFIG.trigger.toLowerCase())) {
        return false;
    }
    
    if (!isAIActive) {
        addAILog('[AI_WARN]', `AI отключен, но получена команда от ${userId}`);
        return true;
    }
    
    // Извлекаем вопрос
    const question = messageText.substring(AI_CONFIG.trigger.length).trim();
    
    if (!question) {
        await callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: `Используйте: ${AI_CONFIG.trigger} [ваш вопрос]\n\nПример: ${AI_CONFIG.trigger} Что такое нейросеть?`,
            parse_mode: 'HTML'
        });
        return true;
    }
    
    if (question.length > AI_CONFIG.maxLength) {
        await callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: `❌ Вопрос слишком длинный (${question.length} символов).\nМаксимум: ${AI_CONFIG.maxLength} символов.`,
            parse_mode: 'HTML'
        });
        return true;
    }
    
    try {
        // Отправляем сообщение "думаю..."
        const thinkingMsg = AI_CONFIG.thinkingMessages[
            Math.floor(Math.random() * AI_CONFIG.thinkingMessages.length)
        ];
        
        const sentMessage = await callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: `${thinkingMsg}\n\n*Запрос:* ${question.substring(0, 80)}${question.length > 80 ? '...' : ''}`,
            parse_mode: 'HTML'
        });
        
        // Получаем ответ от AI
        const aiResponse = await queryAI(question);
        
        // Обновляем статистику
        aiResponses++;
        saveStats();
        saveAIToday();
        
        // Обновляем статистику чата
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.aiRequests = (chat.aiRequests || 0) + 1;
            chat.lastUsed = new Date().toLocaleString();
            saveChats();
        }
        
        // Отправляем ответ в чат
        await callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: `🧠 *Вопрос:* ${question}\n\n🤖 *AI Ответ:*\n${aiResponse}\n\n_Запросил: пользователь ID ${userId}_\n_Бот AI: ${AI_BOT_ID}_`,
            parse_mode: 'HTML'
        });
        
        // Удаляем сообщение "думаю..."
        if (sentMessage && sentMessage.ok && sentMessage.result && sentMessage.result.message_id) {
            try {
                await callTelegramAPI('deleteMessage', {
                    chat_id: chatId,
                    message_id: sentMessage.result.message_id
                });
            } catch (e) {
                // Игнорируем ошибку удаления
            }
        }
        
        // Логируем успех
        addAILog('[AI_SUCCESS]', `Чат ${chatId}: "${question.substring(0, 30)}..." → Ответ отправлен`);
        
    } catch (error) {
        console.error('Ошибка AI обработки:', error);
        
        const errorMsg = AI_CONFIG.errorMessages[
            Math.floor(Math.random() * AI_CONFIG.errorMessages.length)
        ];
        
        await callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: `❌ ${errorMsg}\n\n*Ошибка:* ${error.message || 'Неизвестная ошибка'}\nПопробуйте позже или обратитесь к администратору.`,
            parse_mode: 'HTML'
        });
        
        addAILog('[AI_ERROR]', `Чат ${chatId}: Ошибка - ${error.message}`);
    }
    
    return true;
}

// ===== TELEGRAM API ВЗАИМОДЕЙСТВИЕ =====
async function checkBotStatus() {
    const statusBadge = document.getElementById('botStatus');
    
    try {
        const data = await callTelegramAPI('getMe');
        
        if (data.ok) {
            statusBadge.className = 'status-badge online';
            statusBadge.innerHTML = `
                <div class="status-dot online"></div>
                <span>Бот онлайн: ${data.result.first_name}</span>
            `;
            addAILog('[BOT]', `Подключен: ${data.result.first_name} (@${data.result.username})`);
        } else {
            throw new Error(data.description || 'Неизвестная ошибка');
        }
    } catch (error) {
        statusBadge.className = 'status-badge offline';
        statusBadge.innerHTML = `
            <div class="status-dot offline"></div>
            <span>Бот офлайн: ${error.message}</span>
        `;
        addAILog('[BOT_ERROR]', `Ошибка подключения: ${error.message}`);
    }
}

async function sendMessage() {
    const chatId = document.getElementById('chatSelector').value;
    const message = document.getElementById('messageText').value.trim();
    
    if (!chatId) {
        showStatusMessage('Выберите чат для отправки', 'error');
        return;
    }
    
    if (!message) {
        showStatusMessage('Введите текст сообщения', 'error');
        return;
    }
    
    showStatusMessage('<i class="fas fa-spinner fa-spin"></i> Отправка...', 'info');
    
    try {
        const response = await callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        
        if (response.ok) {
            // Обновляем статистику
            totalMessages++;
            successfulSends++;
            saveStats();
            
            // Обновляем чат
            const chat = chats.find(c => c.id === chatId);
            if (chat) {
                chat.messagesSent = (chat.messagesSent || 0) + 1;
                chat.lastUsed = new Date().toLocaleString();
                saveChats();
            }
            
            showStatusMessage('<i class="fas fa-check-circle"></i> Сообщение отправлено!', 'success');
            addAILog('[MESSAGE]', `Отправлено в ${chatId}: ${message.substring(0, 30)}...`);
            
            // Очищаем поле
            document.getElementById('messageText').value = '';
        } else {
            totalMessages++;
            failedSends++;
            saveStats();
            
            showStatusMessage(`<i class="fas fa-times-circle"></i> Ошибка: ${response.description}`, 'error');
            addAILog('[ERROR]', `Ошибка отправки в ${chatId}: ${response.description}`);
        }
    } catch (error) {
        totalMessages++;
        failedSends++;
        saveStats();
        
        showStatusMessage('<i class="fas fa-times-circle"></i> Ошибка сети', 'error');
        addAILog('[ERROR]', `Ошибка сети: ${error.message}`);
    }
}

// ===== AI ТЕСТОВЫЕ ФУНКЦИИ =====
async function sendAITest() {
    const question = document.getElementById('aiTestQuestion').value.trim();
    const chatId = document.getElementById('chatSelector').value;
    
    if (!chatId) {
        showStatusMessage('Сначала выберите чат', 'warning');
        return;
    }
    
    if (!question) {
        showStatusMessage('Введите вопрос для AI', 'warning');
        return;
    }
    
    // Имитируем команду !бот
    const fullCommand = `${AI_CONFIG.trigger} ${question}`;
    await handleAICommand(chatId, 'test_user', fullCommand);
    
    document.getElementById('aiTestQuestion').value = '';
}

function sendAIPreset(question) {
    document.getElementById('aiTestQuestion').value = question;
    sendAITest();
}

async function testMessage() {
    const chatId = document.getElementById('chatSelector').value;
    
    if (!chatId) {
        showStatusMessage('Выберите чат для теста', 'warning');
        return;
    }
    
    showStatusMessage('<i class="fas fa-spinner fa-spin"></i> Тестирование...', 'info');
    
    try {
        await callTelegramAPI('sendMessage', {
            chat_id: chatId,
            text: '✅ *Тестовое сообщение от Bot Manager AI*\n\nВремя: ' + new Date().toLocaleTimeString() + '\nСтатус: Бот работает нормально\nAI система: ' + (isAIActive ? 'Активна 🤖' : 'Выключена') + '\nГруппа: ' + (chatId === DEFAULT_GROUP_ID ? 'Основная ⭐' : 'Дополнительная'),
            parse_mode: 'HTML'
        });
        
        showStatusMessage('<i class="fas fa-check-circle"></i> Тест отправлен!', 'success');
        addAILog('[TEST]', `Тест отправлен в ${chatId}`);
    } catch (error) {
        showStatusMessage('<i class="fas fa-times-circle"></i> Ошибка теста', 'error');
    }
}

// ===== УПРАВЛЕНИЕ ЧАТАМИ =====
function addChat() {
    const chatId = document.getElementById('newChatId').value.trim();
    
    if (!chatId) {
        showStatusMessage('Введите ID чата', 'error');
        return;
    }
    
    if (!/^-?\d+$/.test(chatId)) {
        showStatusMessage('Неверный формат ID чата', 'error');
        return;
    }
    
    if (chatId === DEFAULT_GROUP_ID) {
        showStatusMessage('Эта группа уже добавлена как основная', 'info');
        return;
    }
    
    if (chats.some(c => c.id === chatId)) {
        showStatusMessage('Чат уже добавлен', 'warning');
        return;
    }
    
    const newChat = {
        id: chatId,
        name: `Чат ${chats.length + 1}`,
        added: new Date().toLocaleDateString(),
        messagesSent: 0,
        aiRequests: 0,
        lastUsed: null,
        isDefault: false
    };
    
    chats.push(newChat);
    saveChats();
    
    document.getElementById('newChatId').value = '';
    showStatusMessage(`Чат добавлен: ${chatId}`, 'success');
    addAILog('[CHAT]', `Добавлен чат: ${chatId}`);
    
    selectChat(chatId);
}

function deleteChat(index) {
    const chat = chats[index];
    
    if (chat.isDefault) {
        showStatusMessage('Основную группу нельзя удалить', 'error');
        return;
    }
    
    if (!confirm(`Удалить чат "${chat.name}"?`)) return;
    
    chats.splice(index, 1);
    saveChats();
    showStatusMessage(`Чат удалён: ${chat.id}`, 'success');
    addAILog('[CHAT]', `Удалён чат: ${chat.id}`);
}

function selectChat(chatId) {
    document.getElementById('chatSelector').value = chatId;
    showStatusMessage(`Выбран чат: ${chatId}`, 'info');
}

function refreshChats() {
    loadChats();
    showStatusMessage('Список чатов обновлён', 'success');
    addAILog('[SYSTEM]', 'Список чатов обновлён');
}

async function testAllChats() {
    if (chats.length === 0) {
        showStatusMessage('Нет чатов для проверки', 'warning');
        return;
    }
    
    showStatusMessage(`<i class="fas fa-spinner fa-spin"></i> Проверка ${chats.length} чатов...`, 'info');
    
    let activeCount = 0;
    
    for (const chat of chats) {
        try {
            const response = await callTelegramAPI('getChat', {
                chat_id: chat.id
            });
            
            if (response.ok) {
                activeCount++;
            }
        } catch (error) {
            // Чат недоступен
        }
    }
    
    showStatusMessage(`Активных чатов: ${activeCount}/${chats.length}`, 'success');
    addAILog('[TEST]', `Проверка чатов: ${activeCount}/${chats.length} активны`);
}

function exportChats() {
    const dataStr = JSON.stringify(chats, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `ai_chats_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showStatusMessage('Чаты экспортированы в JSON', 'success');
    addAILog('[EXPORT]', 'Чаты экспортированы в JSON');
}

function clearChats() {
    if (!confirm('Удалить ВСЕ чаты (кроме основной группы)?')) return;
    
    // Удаляем все чаты кроме основной группы
    chats = chats.filter(chat => chat.isDefault);
    saveChats();
    showStatusMessage('Все чаты удалены (кроме основной группы)', 'warning');
    addAILog('[WARN]', 'Все чаты удалены (кроме основной)');
}

// ===== УТИЛИТЫ =====
function initEventListeners() {
    // Автопрокрутка логов
    const logsContainer = document.getElementById('aiLogs');
    if (logsContainer) {
        logsContainer.addEventListener('scroll', function() {
            const atBottom = this.scrollHeight - this.clientHeight <= this.scrollTop + 50;
            autoScroll = atBottom;
        });
    }
}

function addAILog(source, message) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        source: source,
        message: message
    };
    
    aiLogs.push(logEntry);
    updateAILogsUI();
    saveAILogs();
}

function clearAILogs() {
    if (!confirm('Очистить все логи AI?')) return;
    
    aiLogs = [];
    updateAILogsUI();
    saveAILogs();
    showStatusMessage('Логи AI очищены', 'success');
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const btn = document.querySelector('[onclick="toggleAutoScroll()"]');
    if (btn) {
        btn.innerHTML = autoScroll 
            ? '<i class="fas fa-scroll"></i>' 
            : '<i class="fas fa-scroll" style="opacity: 0.5;"></i>';
        btn.title = autoScroll ? 'Автопрокрутка включена' : 'Автопрокрутка выключена';
    }
}

function clearMessage() {
    document.getElementById('messageText').value = '';
    showStatusMessage('Поле сообщения очищено', 'info');
}

function startAIListening() {
    if (!isPolling) {
        startPolling();
        showStatusMessage('AI прослушивание запущено', 'success');
    } else {
        showStatusMessage('AI уже прослушивает чаты', 'info');
    }
}

function toggleAIMode() {
    isAIActive = !isAIActive;
    document.getElementById('enableAI').checked = isAIActive;
    saveSettings();
    
    const action = isAIActive ? 'включен' : 'выключен';
    showStatusMessage(`AI ${action}`, isAIActive ? 'success' : 'warning');
    addAILog('[AI_MODE]', `AI ${action.toUpperCase()}`);
}

function refreshAll() {
    checkBotStatus();
    refreshChats();
    loadStats();
    showStatusMessage('Все данные обновлены', 'success');
    addAILog('[SYSTEM]', 'Все данные обновлены');
}

function showAIHelp() {
    const help = `
🤖 *Bot Manager AI Help*

*Основные функции:*
1. Отправка сообщений в чаты
2. AI-нейросеть через команду ${AI_CONFIG.trigger}
3. Управление списком чатов
4. Мониторинг и логирование

*Основная группа (нельзя удалить):*
⭐ ${DEFAULT_GROUP_ID}

*Как использовать AI:*
В любом чате с ботом напишите:
${AI_CONFIG.trigger} [ваш вопрос]

*Примеры:*
${AI_CONFIG.trigger} Что такое ИИ?
${AI_CONFIG.trigger} Объясни блокчейн
${AI_CONFIG.trigger} Напиши шутку

*Боты в системе:*
🤖 Основной бот: 7847121145
🧠 AI бот: 8241939804

*Настройки:*
- Включить/выключить AI
- Уведомления
- Автопрослушивание чатов

*Логи:*
Все AI запросы сохраняются в логах
Максимум: 200 последних записей
    `;
    
    alert(help.replace(/\*/g, ''));
}

function showStatusMessage(message, type = 'info') {
    const statusDiv = document.getElementById('messageStatus');
    if (!statusDiv) return;
    
    statusDiv.className = `status-message show ${type}`;
    statusDiv.innerHTML = message;
    
    if (type !== 'info') {
        setTimeout(() => {
            statusDiv.className = 'status-message';
            statusDiv.innerHTML = '';
        }, 3000);
    }
}

// ===== ЭКСПОРТ ФУНКЦИЙ =====
window.sendMessage = sendMessage;
window.testMessage = testMessage;
window.clearMessage = clearMessage;
window.refreshChats = refreshChats;
window.addChat = addChat;
window.testAllChats = testAllChats;
window.exportChats = exportChats;
window.clearChats = clearChats;
window.sendAITest = sendAITest;
window.sendAIPreset = sendAIPreset;
window.saveSettings = saveSettings;
window.checkBotStatus = checkBotStatus;
window.startAIListening = startAIListening;
window.clearAILogs = clearAILogs;
window.toggleAutoScroll = toggleAutoScroll;
window.toggleAIMode = toggleAIMode;
window.refreshAll = refreshAll;
window.showAIHelp = showAIHelp;
