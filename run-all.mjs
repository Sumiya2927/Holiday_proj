import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Starting Build My Holiday full-stack environment...');

const server = spawn('node', ['server/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: process.env
});

const client = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--workspace', 'client'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: process.env
});

server.on('exit', (code) => {
  console.log(`[Backend] exited with code ${code}`);
});

client.on('exit', (code) => {
  console.log(`[Frontend] exited with code ${code}`);
});

const shutdown = () => {
  console.log('Shutting down services...');
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

