module.exports = {
  apps: [
    {
      name: "nodemon",
      script: "nodemon --ext js",
      args: "index.js"
    },
    {
      name: "tcp-server",
      script: "node",
      args: "tcp-server.js",
    },
  ],
};