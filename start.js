/**
 * Start both backend and frontend servers.
 * 
 * Usage: node start.js
 */
const { spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend');
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const INDIVIDUAL_DIR = path.join(__dirname, 'individual');

function startProcess(name, command, args, cwd) {
  // On Windows, npx/npm are .cmd files and require shell: true to be found by spawn
  const isWindows = process.platform === 'win32';
  const proc = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: isWindows,
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

console.log('Starting MyPA App...\n');

const backend = startProcess('backend', 'node', ['src/server.js'], BACKEND_DIR);
const frontend = startProcess('frontend', 'npx', ['vite'], FRONTEND_DIR);
const individual = startProcess('individual', 'npx', ['vite'], INDIVIDUAL_DIR);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  backend.kill();
  frontend.kill();
  individual.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  individual.kill();
  process.exit(0);
});
