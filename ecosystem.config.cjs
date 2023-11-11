module.exports = {
  apps: [
    {
      name: "nodemon",
      script: "nodemon",
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