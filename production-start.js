// A simple bootstrapper for production
// This is used to avoid any direct dependency issues

console.log("Starting Careerate server in production mode...");
process.env.NODE_ENV = "production";

import('./dist/index.js').catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});