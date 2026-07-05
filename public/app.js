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

let nickname = localStorage.getItem('sync_cinema_nickname') || ''; // Проверяем, есть ли сохраненный ник
let isExternalEvent = false; // Флаг, чтобы избежать бесконечного цикла синхронизации

const logoutBtn = document.getElementById('logout-btn');

// Функция для авторизации и входа в зал
function enterRoom(userNickname) {
    nickname = userNickname;
    localStorage.setItem('sync_cinema_nickname', nickname); // Запоминаем пользователя навсегда
    
    loginOverlay.style.display = 'none';
    cinemaRoom.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'block'; // Показываем кнопку смены ника
    
    socket.emit('user-join', nickname);
}

// ПРОВЕРКА: Если это старый пользователь, сразу пускаем в зал
if (nickname) {
    enterRoom(nickname);
}

// Логика входа (если это НОВЫЙ пользователь)
joinBtn.addEventListener('click', () => {
    const inputVal = nicknameInput.value.trim();
    if (inputVal) {
        enterRoom(inputVal);
    } else {
        alert('Пожалуйста, введите ник!');
    }
});

// Логика смены ника
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('sync_cinema_nickname'); // Удаляем старый ник
        location.reload(); // Перезагружаем страницу, чтобы вернуть окно регистрации
    });
}

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
        video.play().catch(e => {
            console.log("Автоплей заблокирован браузером");
            // Если мы зашли автоматически и браузер не дал включить видео
            const playMsg = document.createElement('div');
            playMsg.style.cssText = "position:absolute; top:20px; left:50%; transform:translateX(-50%); background:var(--itd-blue); color:#fff; padding:10px 20px; border-radius:8px; cursor:pointer; z-index:1000; box-shadow:0 4px 15px rgba(0,0,0,0.5);";
            playMsg.innerText = "Кликните сюда, чтобы включить звук и видео!";
            playMsg.onclick = () => { video.play(); playMsg.remove(); };
            document.querySelector('.video-container').style.position = 'relative';
            document.querySelector('.video-container').appendChild(playMsg);
        });
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