const { connectDB } = require('../backend/app');

module.exports = async function handler(req, res) {
  await connectDB();
  const { app } = require('../backend/app');
  return app(req, res);
};
