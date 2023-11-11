module.exports = {
  apps: [
    {
      name: "nodemon",
      script: "nodemon --ext js",
      args: "index.js",
      watch: true,
      ignore_watch: ["node_modules", "logs"],
    },
    {
      name: "tcp-server",
      script: "node",
      args: "tcp-server.js",
    },
  ],
};