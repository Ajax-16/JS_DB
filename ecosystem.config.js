export default {
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
        script: "tcp-server.js",
      },
    ],
  };