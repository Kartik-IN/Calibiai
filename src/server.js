import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT) || 5000;

const server = app.listen(port, () => {
  console.log(`CalibiAI DSA Backend listening on port ${port}`);
});

server.on('error', (error) => {
  console.error('Failed to start the server:', error.message);
  process.exit(1);
});
