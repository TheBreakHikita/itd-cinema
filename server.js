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

io.on('connection', (socket) => {
    console.log('Новый зритель подключился:', socket.id);

    // При подключении отправляем текущее состояние видео
    socket.emit('sync-video', videoState);

    // Обработка сообщений из чата
    socket.on('chat-message', (data) => {
        io.emit('chat-message', data); // Отправляем всем
    });

    // Синхронизация: Play
    socket.on('play', (time) => {
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
        console.log('Зритель отключился:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Кинотеатр запущен на порту ${PORT}`);
});