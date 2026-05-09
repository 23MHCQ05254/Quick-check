import dotenv from 'dotenv';
import app from './app.js';
import { connectDatabase } from './config/db.js';

dotenv.config();

const port = process.env.PORT || 5000;

await connectDatabase();

app.listen(port, () => {
  console.log(`[quickcheck] API listening on http://localhost:${port}`);
});

