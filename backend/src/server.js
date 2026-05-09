import dotenv from 'dotenv';
import app from './app.js';
import { connectDatabase } from './config/db.js';

dotenv.config();

const startPort = Number.parseInt(process.env.PORT || '5000', 10);

await connectDatabase();

const listen = (port) =>
  new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    });

    server.once('error', reject);
  });

const startServer = async (initialPort) => {
  let port = Number.isFinite(initialPort) ? initialPort : 5000;

  while (port < 65535) {
    try {
      const server = await listen(port);
      const address = server.address();
      const boundPort = typeof address === 'object' && address ? address.port : port;

      console.log(`[quickcheck] API listening on http://localhost:${boundPort}`);
      return;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') {
        throw error;
      }

      console.warn(`[quickcheck] Port ${port} is in use, trying ${port + 1}...`);
      port += 1;
    }
  }

  throw new Error(`Unable to find a free port starting at ${initialPort}`);
};

await startServer(startPort);