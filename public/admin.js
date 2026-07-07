const socket = io();

// Авторизуемся как админ
socket.emit('admin-join');

// --- УПРАВЛЕНИЕ ВИДЕО ---
const adminVideo = document.getElementById('admin-video');
const movieUrlInput = document.getElementById('movie-url');
const setMovieBtn = document.getElementById('set-movie-btn');

setMovieBtn.addEventListener('click', () => {
    const url = movieUrlInput.value.trim();
    if (url) {
        socket.emit('change-movie', url);
        movieUrlInput.value = '';
    }
});

// Получение текущего состояния при входе админа
socket.on('sync-video', (state) => {
    adminVideo.currentTime = state.time;
    if (state.isPlaying) adminVideo.play().catch(() => console.log("Автоплей заблокирован"));
});

socket.on('movie-changed', (url) => {
    adminVideo.pause(); 
    adminVideo.removeAttribute('src'); 
    adminVideo.src = url; 
    adminVideo.load(); 
});

// Отправка событий синхронизации от админа
adminVideo.addEventListener('play', () => socket.emit('play', adminVideo.currentTime));
adminVideo.addEventListener('pause', () => socket.emit('pause', adminVideo.currentTime));
adminVideo.addEventListener('seeked', () => socket.emit('seek', adminVideo.currentTime));


// --- НАСТРОЙКИ ЧАТА ---
const toggleChatBtn = document.getElementById('toggle-chat-btn');
let isChatEnabled = false;

socket.on('chat-status', (status) => {
    isChatEnabled = status;
    toggleChatBtn.innerText = status ? 'Отключить чат (Сейчас: Вкл)' : 'Включить чат (Сейчас: Выкл)';
    toggleChatBtn.style.background = status ? '#34c759' : '#3a3a3c'; // Зеленый из ИТД или серый
    toggleChatBtn.style.color = '#fff';
});

toggleChatBtn.addEventListener('click', () => {
    socket.emit('toggle-chat', !isChatEnabled);
});


// --- УПРАВЛЕНИЕ АФИШЕЙ ---
const addSchedBtn = document.getElementById('add-sched-btn');
const adminScheduleList = document.getElementById('admin-schedule-list');

addSchedBtn.addEventListener('click', () => {
    const title = document.getElementById('sched-title').value;
    const time = document.getElementById('sched-time').value;
    const genre = document.getElementById('sched-genre').value;
    
    if(title && time) {
        socket.emit('add-schedule', { title, time, genre });
        document.getElementById('sched-title').value = '';
        document.getElementById('sched-time').value = '';
        document.getElementById('sched-genre').value = '';
    }
});

socket.on('update-schedule', (schedule) => {
    adminScheduleList.innerHTML = '';
    schedule.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.title}</td>
            <td>${item.time}</td>
            <td>${item.genre}</td>
            <td><button class="admin-btn danger" onclick="removeSchedule(${item.id})">Удалить</button></td>
        `;
        adminScheduleList.appendChild(tr);
    });
});

window.removeSchedule = function(id) {
    socket.emit('remove-schedule', id);
};


// --- СПИСОК ПОЛЬЗОВАТЕЛЕЙ ---
const usersTable = document.getElementById('users-list');

socket.on('update-users', (users) => {
    usersTable.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${user.nickname}</strong></td>
            <td><code>${user.ip}</code></td>
            <td style="font-size: 0.8em; color: #aaa;">${user.browser}</td>
        `;
        usersTable.appendChild(tr);
    });
});