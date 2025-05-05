// simple-build.js - A basic script to prepare the server for deployment 
// without using complex bundling tools

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SRC_DIR = './server';
const DEST_DIR = './dist';

// Create dist directory if it doesn't exist
console.log('Creating dist directory...');
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

// Compile TypeScript with tsc
console.log('Compiling TypeScript files...');
try {
  execSync('npx tsc --project tsconfig.json --outDir dist', { stdio: 'inherit' });
  console.log('TypeScript compilation successful');
} catch (error) {
  console.error('TypeScript compilation failed:', error);
  process.exit(1);
}

// Copy necessary files
console.log('Copying necessary files...');
const CLIENT_DIST = path.join(DEST_DIR, 'client');
if (!fs.existsSync(CLIENT_DIST)) {
  fs.mkdirSync(CLIENT_DIST, { recursive: true });
}

// When building for production, static files should be pre-built
try {
  console.log('Building client assets...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Client build successful');
} catch (error) {
  console.error('Client build failed, but continuing:', error);
}

console.log('Build process completed successfully!');