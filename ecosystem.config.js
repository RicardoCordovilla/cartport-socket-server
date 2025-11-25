module.exports = {
  apps: [
    {
      name: "socket-server",
      script: "C://socket/dist/index.js",
      watch: false,
      instances: 1,
      autorestart: true,
      exec_mode: "fork",
      max_memory_restart: "1G"
    },
    {
      name: "api-server",
      script: "C://server-api/dist/index.js",
      watch: false,
      instances: 1,
      autorestart: true,
      exec_mode: "fork",
      max_memory_restart: "1G"
    },
  ],
};
