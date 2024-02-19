FROM node:latest

WORKDIR /JS_DB

RUN git clone https://github.com/Ajax-16/ajaxdb-server.git .

RUN npm install

EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "server.js"]