const socket = io();

// Элементы DOM
const loginOverlay = document.getElementById('login-overlay');
const joinBtn = document.getElementById('join-btn');
const nicknameInput = document.getElementById('nickname-input');
const cinemaRoom = document.getElementById('cinema-room');
const video = document.getElementById('video-player');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

let nickname = '';
let isExternalEvent = false; // Флаг, чтобы избежать бесконечного цикла синхронизации

// Логика входа
joinBtn.addEventListener('click', () => {
    nickname = nicknameInput.value.trim();
    if (nickname) {
        loginOverlay.style.display = 'none';
        cinemaRoom.style.display = 'flex';
        // Браузеры запрещают автовоспроизведение со звуком до взаимодействия со страницей.
        socket.emit('user-join', nickname);
        // Клик по кнопке "Войти" решает эту проблему!
    } else {
        alert('Пожалуйста, введите ник!');
    }
});

// === ЧАТ ===
function sendMessage() {
    const text = chatInput.value.trim();
    if (text) {
        socket.emit('chat-message', { user: nickname, text: text });
        chatInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

socket.on('chat-status', (isEnabled) => {
    chatInput.disabled = !isEnabled;
    sendBtn.disabled = !isEnabled;
    chatInput.placeholder = isEnabled ? "Написать в чат..." : "Чат отключен администратором";
});

socket.on('chat-error', (msg) => {
    alert(msg);
});

socket.on('movie-changed', (url) => {
    video.src = url;
    video.load();
});

socket.on('chat-message', (data) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.innerHTML = `<strong>${data.user}:</strong> ${data.text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Автоскролл вниз
});

// === СИНХРОНИЗАЦИЯ ВИДЕО ===

// 1. Отправка событий на сервер
video.addEventListener('play', () => {
    if (!isExternalEvent) socket.emit('play', video.currentTime);
    isExternalEvent = false;
});

video.addEventListener('pause', () => {
    if (!isExternalEvent) socket.emit('pause', video.currentTime);
    isExternalEvent = false;
});

video.addEventListener('seeked', () => {
    if (!isExternalEvent) socket.emit('seek', video.currentTime);
    isExternalEvent = false;
});

// 2. Получение событий от сервера
socket.on('sync-video', (state) => {
    isExternalEvent = true;
    video.currentTime = state.time;
    if (state.isPlaying) {
        video.play().catch(e => console.log("Автоплей заблокирован браузером"));
    }
});

socket.on('play', (time) => {
    isExternalEvent = true;
    if (Math.abs(video.currentTime - time) > 1) video.currentTime = time;
    video.play();
});

socket.on('pause', (time) => {
    isExternalEvent = true;
    video.currentTime = time;
    video.pause();
});

socket.on('seek', (time) => {
    isExternalEvent = true;
    video.currentTime = time;
});