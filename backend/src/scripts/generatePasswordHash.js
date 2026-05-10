#!/usr/bin/env node
import bcrypt from 'bcryptjs';

const plainPassword = process.argv[2];
const rounds = Number.parseInt(process.argv[3] || '12', 10);

if (!plainPassword) {
  console.error('Usage: node src/scripts/generatePasswordHash.js <plainPassword> [rounds]');
  process.exit(1);
}

if (!Number.isInteger(rounds) || rounds < 8 || rounds > 15) {
  console.error('Rounds must be an integer between 8 and 15.');
  process.exit(1);
}

const run = async () => {
  const hash = await bcrypt.hash(plainPassword, rounds);
  console.log(hash);
};

run().catch((error) => {
  console.error('Failed to generate bcrypt hash:', error.message);
  process.exit(2);
});
