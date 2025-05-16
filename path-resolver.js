#!/usr/bin/env node

/**
 * Path Resolver Utility
 * 
 * This script helps in debugging path resolution issues in the deployed application.
 * It shows where key modules are being looked for and loaded from.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import module from 'module';

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=== Path Resolution Debugger ===');
console.log(`Current directory: ${process.cwd()}`);
console.log(`__dirname equivalent: ${__dirname}`);

// Check for dist directory
const distDir = path.join(__dirname, 'dist');
console.log(`\nDist directory exists: ${fs.existsSync(distDir)}`);

if (fs.existsSync(distDir)) {
  console.log('\nContents of dist directory:');
  const distContents = fs.readdirSync(distDir);
  console.log(distContents);
  
  // Check server directory
  const serverDir = path.join(distDir, 'server');
  if (fs.existsSync(serverDir)) {
    console.log('\nContents of dist/server directory:');
    const serverContents = fs.readdirSync(serverDir);
    console.log(serverContents);
    
    // Check for index.js
    const indexPath = path.join(serverDir, 'index.js');
    console.log(`\nindex.js exists: ${fs.existsSync(indexPath)}`);
  }
}

// Log Node.js module resolution paths
console.log('\nNode.js module resolution paths:');
console.log(module.paths);

// Try to load a few key modules and log their resolved paths
const moduleNames = [
  './dist/server/index.js',
  '@neondatabase/serverless',
  'express',
  'drizzle-orm'
];

console.log('\nModule resolution test:');
for (const moduleName of moduleNames) {
  try {
    // Only attempt to resolve, not actually import
    const modulePath = module.createRequire(import.meta.url).resolve(moduleName);
    console.log(`✅ ${moduleName} => ${modulePath}`);
  } catch (err) {
    console.log(`❌ ${moduleName} => ${err.message}`);
  }
}

console.log('\n=== End of Path Resolution Debugger ===');