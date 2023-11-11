import net from 'net';
import fs from 'fs';

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const dataString = data.toString();
        const [operation, filePath, fileContent] = dataString.split('|');
      
        if (operation === 'write') {
          fs.writeFile(filePath, fileContent, (err) => {
            if (err) throw err;
            console.log(`Archivo ${filePath} modificado exitosamente.`);
          });
        } else if (operation === 'read') {
          fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) throw err;
            socket.write(content);
          });
        }
      });
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Servidor TCP escuchando en el puerto 3000');
});