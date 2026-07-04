const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы из папки public
app.use(express.static('public'));

// Состояние комнаты
let videoState = {
    time: 0,
    isPlaying: false,
    lastUpdate: Date.now()
};

// Глобальные настройки и данные
let chatEnabled = false; // Чат по умолчанию отключен
let currentMovieUrl = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
let usersList = []; // Список пользователей
let schedule = [
    { id: 1, title: 'Мультфильм "Big Buck Bunny"', time: 'Сегодня в 18:00', genre: 'Комедия, Приключения' }
];

io.on('connection', (socket) => {
    // Получаем IP и браузер (User-Agent)
    const clientIp = socket.handshake.address;
    const userAgent = socket.request.headers['user-agent'];
    
    console.log(`Новое подключение: ${socket.id} | IP: ${clientIp}`);

    // Отправляем текущие состояния при подключении
    socket.emit('sync-video', videoState);
    socket.emit('movie-changed', currentMovieUrl);
    socket.emit('update-schedule', schedule);
    socket.emit('chat-status', chatEnabled);

    // Регистрация обычного пользователя
    socket.on('user-join', (nickname) => {
        socket.nickname = nickname;
        const user = { 
            id: socket.id, 
            nickname, 
            ip: clientIp, 
            browser: userAgent 
        };
        usersList.push(user);
        io.emit('update-users', usersList); // Отправляем админу обновленный список
    });

    // Регистрация админа
    socket.on('admin-join', () => {
        socket.isAdmin = true;
        socket.emit('update-users', usersList);
        socket.emit('update-schedule', schedule);
    });

    // Обработка сообщений из чата
    socket.on('chat-message', (data) => {
        if (chatEnabled || socket.isAdmin) {
            io.emit('chat-message', data);
        } else {
            socket.emit('chat-error', 'Чат временно отключен администратором.');
        }
    });

    // === АДМИНСКИЕ КОМАНДЫ ===
    socket.on('toggle-chat', (status) => {
        if (!socket.isAdmin) return;
        chatEnabled = status;
        io.emit('chat-status', chatEnabled);
    });

    socket.on('change-movie', (url) => {
        if (!socket.isAdmin) return;
        currentMovieUrl = url;
        videoState = { time: 0, isPlaying: false, lastUpdate: Date.now() };
        io.emit('movie-changed', url);
    });

    socket.on('add-schedule', (item) => {
        if (!socket.isAdmin) return;
        item.id = Date.now();
        schedule.push(item);
        io.emit('update-schedule', schedule);
    });

    socket.on('remove-schedule', (id) => {
        if (!socket.isAdmin) return;
        schedule = schedule.filter(item => item.id !== id);
        io.emit('update-schedule', schedule);
    });

    // === СИНХРОНИЗАЦИЯ (Только если админ) ===
    socket.on('play', (time) => {
        if (!socket.isAdmin) return; // Игнорируем команды от обычных юзеров
        videoState.isPlaying = true;
        videoState.time = time;
        socket.broadcast.emit('play', time); // Отправляем всем, кроме того, кто нажал
    });

    // Синхронизация: Pause
    socket.on('pause', (time) => {
        videoState.isPlaying = false;
        videoState.time = time;
        socket.broadcast.emit('pause', time);
    });

    // Синхронизация: Перемотка
    socket.on('seek', (time) => {
        videoState.time = time;
        socket.broadcast.emit('seek', time);
    });

    socket.on('disconnect', () => {
        console.log('Отключился:', socket.id);
        usersList = usersList.filter(user => user.id !== socket.id);
        if (socket.nickname) {
            io.emit('update-users', usersList);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Кинотеатр запущен на порту ${PORT}`);
});