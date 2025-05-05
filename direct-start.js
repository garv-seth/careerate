// Direct production server starter
// This skips all bundling and uses the original source code

console.log("Starting Careerate server...");
process.env.NODE_ENV = "production";

// Load our server directly
import('./server/index.js')
  .then(() => console.log("Server started successfully!"))
  .catch(err => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });