import net from 'net';
import fs from 'fs';

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const dataString = data.toString();
    const [filePath, fileContent] = dataString.split('|');

    fs.writeFile(filePath, fileContent, (err) => {
      if (err) {
        console.error('Error al escribir en el archivo:', err);
        return;
      }

      // Después de escribir en el archivo, redirigir la consola al cliente
      const oldConsoleLog = console.log;
      console.log = function (message) {
        oldConsoleLog.apply(console, arguments);
        socket.write(`mensaje|${message}`);
      };
    });
  });

  socket.on('end', () => {
    console.log('Cliente desconectado.');

    // Restaurar console.log original cuando el cliente se desconecta
    console.log = oldConsoleLog;
  });

  socket.on('error', (err) => {
    console.error('Error en la conexión del cliente:', err);
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Servidor TCP escuchando en el puerto 3000');
});