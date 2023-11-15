import net from 'net';
import fs from 'fs';
import { execFileSync } from 'child_process';

const server = net.createServer((socket) => {
  let receivedData = '';

  socket.on('data', (data) => {
    receivedData += data.toString();
  });

  socket.on('end', () => {
    try {

      const filePath = 'tempCode.js';
      fs.writeFileSync(filePath, receivedData);

      const result = execFileSync('node', [filePath], { encoding: 'utf-8' });

      socket.write(result);
    } catch (error) {
      socket.write(`Error: ${error.message}`);
    } finally {
      socket.end();
    }
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Servidor TCP escuchando en el puerto 3000');
});