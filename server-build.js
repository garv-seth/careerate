#!/usr/bin/env node

/**
 * Careerate Server Build Script
 * 
 * A simplified build script that focuses only on the server code for deployment.
 * This uses a direct TypeScript to JavaScript transpilation approach.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
try {
  await fs.rm(path.join(__dirname, 'dist'), { recursive: true, force: true });
  await fs.mkdir(path.join(__dirname, 'dist'));
  await fs.mkdir(path.join(__dirname, 'dist', 'server'), { recursive: true });
  await fs.mkdir(path.join(__dirname, 'dist', 'shared'), { recursive: true });
  await fs.mkdir(path.join(__dirname, 'dist', 'public'), { recursive: true });
} catch (err) {
  console.error('Error cleaning dist directory:', err);
}

// Step 1: Transpile TypeScript files using esbuild
console.log('🔄 Transpiling TypeScript files...');

// Server files in directories
await new Promise((resolve, reject) => {
  const tscProcess = spawn('npx', [
    'esbuild', 
    'server/**/*.ts', 
    '--outdir=dist/server', 
    '--format=esm',
    '--platform=node',
    '--target=node20',
    '--sourcemap'
  ], {
    stdio: 'inherit',
    shell: true
  });
  
  tscProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Server files in directories transpiled successfully');
      resolve();
    } else {
      console.error(`❌ Server transpilation failed with code ${code}`);
      reject(new Error(`Server transpilation failed with code ${code}`));
    }
  });
});

// Root server files - handle them individually
console.log('🔄 Transpiling root server files...');
await new Promise((resolve, reject) => {
  const tscProcess = spawn('npx', [
    'esbuild', 
    'server/index.ts',
    'server/auth.ts',
    'server/db.ts',
    'server/object-storage.ts',
    'server/replitAuth.ts',
    'server/routes.ts',
    'server/setup-sessions.ts',
    'server/storage.ts',
    'server/vite.ts',
    '--outdir=dist/server', 
    '--format=esm',
    '--platform=node',
    '--target=node20',
    '--sourcemap'
  ], {
    stdio: 'inherit',
    shell: true
  });
  
  tscProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Root server files transpiled successfully');
      resolve();
    } else {
      console.error(`❌ Root server files transpilation failed with code ${code}`);
      reject(new Error(`Root server files transpilation failed with code ${code}`));
    }
  });
});

// Shared files
await new Promise((resolve, reject) => {
  const tscProcess = spawn('npx', [
    'esbuild', 
    'shared/**/*.ts', 
    '--outdir=dist/shared', 
    '--format=esm',
    '--platform=node',
    '--target=node20',
    '--sourcemap'
  ], {
    stdio: 'inherit',
    shell: true
  });
  
  tscProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Shared files transpiled successfully');
      resolve();
    } else {
      console.error(`❌ Shared transpilation failed with code ${code}`);
      reject(new Error(`Shared transpilation failed with code ${code}`));
    }
  });
});

// Step 2: Copy JavaScript files that don't need transpilation
console.log('📋 Copying JavaScript files...');
await new Promise((resolve, reject) => {
  const copyProcess = spawn('bash', ['-c', 'find server -name "*.js" -type f -exec cp {} dist/server/ \\;'], {
    stdio: 'inherit',
    shell: true
  });
  
  copyProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ JavaScript files copied successfully');
      resolve();
    } else {
      console.error(`❌ JavaScript file copy failed with code ${code}`);
      // Don't reject, as this step is optional
      resolve();
    }
  });
});

// Step 3: Create a minimal public directory with index.html
console.log('📝 Creating minimal client files...');
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Careerate</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f5f5f5; }
    .message { text-align: center; max-width: 500px; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { margin-top: 0; color: #333; }
    p { color: #666; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="message">
    <h1>Welcome to Careerate</h1>
    <p>The server is running successfully in production mode.</p>
    <p>If you're seeing this page, it means the server is working but the client assets weren't built. This is normal when developing the backend separately.</p>
  </div>
</body>
</html>`;

await fs.writeFile(path.join(__dirname, 'dist', 'public', 'index.html'), indexHtml);

// Step 4: Create production server starter file
console.log('📝 Creating production server starter...');
const serverStarterContent = `// Production server starter
// Generated by server-build.js

console.log("Starting Careerate production server...");
process.env.NODE_ENV = "production";

// Import and start the server
import('./server/index.js')
  .then(() => console.log("✅ Server started successfully!"))
  .catch(err => {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  });
`;

await fs.writeFile(path.join(__dirname, 'dist', 'server-start.js'), serverStarterContent);

// Step 5: Copy package.json (with modifications for production)
console.log('📋 Copying package.json for production...');
const packageJson = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf-8'));

// Modify package.json for production
const productionPackageJson = {
  ...packageJson,
  scripts: {
    ...packageJson.scripts,
    start: 'NODE_ENV=production node server-start.js'
  }
};

await fs.writeFile(
  path.join(__dirname, 'dist', 'package.json'),
  JSON.stringify(productionPackageJson, null, 2)
);

console.log('🎉 Server build completed successfully!');