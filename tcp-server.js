import net from 'net';
import fs from 'fs';

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const dataString = data.toString();
        const [filePath, fileContent] = dataString.split('|');
          fs.writeFile(filePath, fileContent, (err) => {
            if (err) throw err;
            const oldConsoleLog = console.log;
            console.log = function (message) {
            oldConsoleLog.apply(console, arguments);
            socket.write(message);
  };
          });

      });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Servidor TCP escuchando en el puerto 3000');
});