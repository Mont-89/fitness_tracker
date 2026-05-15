const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const server = createApp();

server.listen(PORT, () => {
  console.log(`Elders Well-being Monitor API running on port ${PORT}`);
});
