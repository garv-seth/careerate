import { createRoot } from "react-dom/client";
import App from "./App";
import "./tailwind-generated.css";

// Add Clash Display font
const link = document.createElement("link");
link.href = "https://api.fontshare.com/v2/css?f[]=clash-display@600,700&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

// Add Inter and JetBrains Mono fonts
const googleFontsLink = document.createElement("link");
googleFontsLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap";
googleFontsLink.rel = "stylesheet";
document.head.appendChild(googleFontsLink);

// Set page title
const title = document.createElement("title");
title.textContent = "Careerate - AI-Powered Career Acceleration Platform";
document.head.appendChild(title);

createRoot(document.getElementById("root")!).render(<App />);
