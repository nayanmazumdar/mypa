/**
 * Start both backend and frontend servers.
 * 
 * Usage: node start.js
 */
const { spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend');
const FRONTEND_DIR = path.join(__dirname, 'frontend');

function startProcess(name, command, args, cwd) {
  const proc = spawn(command, args, {
    cwd,
    stdio: 'pipe',
  });

  proc.stdout.on('data', (data) => {
    data.toString().trim().split('\n').forEach((line) => {
      console.log(`[${name}] ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    data.toString().trim().split('\n').forEach((line) => {
      console.error(`[${name}] ${line}`);
    });
  });

  proc.on('close', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    // If backend dies, kill everything
    if (name === 'backend') {
      console.log('Backend stopped. Shutting down...');
      process.exit(code);
    }
  });

  return proc;
}

console.log('Starting Shopkeeper App...\n');

const backend = startProcess('backend', 'node', ['src/server.js'], BACKEND_DIR);
const frontend = startProcess('frontend', 'npx', ['vite'], FRONTEND_DIR);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
