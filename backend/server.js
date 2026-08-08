const { app, startServer, connectDB } = require('./app');

(async () => {
  const port = Number(process.env.PORT) || 5001;
  await connectDB();
  startServer(port);
})();