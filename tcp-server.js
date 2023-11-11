import fs from 'fs';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';

const server = http.createServer();
const io = new SocketIoServer(server);

let oldConsoleLog;

io.on('connection', (socket) => {
  console.log('Cliente conectado.');

  socket.on('disconnect', () => {
    console.log('Cliente desconectado.');
    if (oldConsoleLog) {
      console.log = oldConsoleLog;
    }
  });

  socket.on('writeFile', ({ filePath, fileContent }) => {
    fs.writeFile(filePath, fileContent, (err) => {
      if (err) {
        console.error('Error al escribir en el archivo:', err);
        return;
      }

      oldConsoleLog = console.log;
      console.log = function (message) {
        socket.emit('consoleLog', { message });
        oldConsoleLog.apply(console, arguments);
      };
    });
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Servidor y Socket.io escuchando en el puerto 3000');
});