#!/bin/bash
set -e

echo "======== SUPER MINIMAL DEPLOYMENT BUILD ========"

# Create dist directory if it doesn't exist
mkdir -p dist

# Just copy the entire source directory for deployment
echo "Copying source files..."
cp -r server dist/
cp -r shared dist/
cp -r client dist/
cp package.json dist/

# Create a simple starter script
echo "Creating entry point..."
cat > dist/server-start.js << 'EOL'
// Simple entry point for deployment
console.log("Starting production server...");
process.env.NODE_ENV = "production";

// Use dynamic import to start the server
import('./server/index.js')
  .then(() => console.log("Server started successfully!"))
  .catch(error => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
EOL

# Create a minimal package.json specifically for running the production server
cat > dist/package.json << 'EOL'
{
  "name": "careerate-server",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "node server-start.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "@neondatabase/serverless": "^0.10.4",
    "drizzle-orm": "^0.39.1",
    "openai": "^4.96.2",
    "connect-pg-simple": "^10.0.0",
    "express-session": "^1.18.1",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.2",
    "zod": "^3.24.2"
  }
}
EOL

echo "Super minimal build completed!"