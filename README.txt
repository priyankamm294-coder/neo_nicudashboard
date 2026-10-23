NeoCare React frontend demo

FILES
- index.html: Vite HTML entry; loads Tailwind CSS from its CDN for this compact demo.
- package.json: React, Vite, Lucide icons, Chart.js dependencies.
- src/main.jsx: mounts the React application.
- src/App.jsx: dashboard, mock incubator data, charts, registration modal, and demo alarm UI/logic.
- src/index.css: global base styles.

RUN ON WINDOWS
1. Install Node.js LTS if it is not already installed: https://nodejs.org/
2. Extract this folder.
3. Open the extracted NeoCare-React-Frontend folder in VS Code.
4. Open Terminal > New Terminal.
5. Run: npm install
6. Run: npm run dev
7. Open the localhost URL printed in the terminal (usually http://localhost:5173).

To check the production build, run: npm run build

IMPORTANT
This version uses synthetic demo readings and simulated 5-second updates. It does not connect to your Python backend or WebSocket yet. Alarm thresholds are demonstration-only and are not clinically validated. Do not use this demo for patient care.
Tailwind styling is loaded from a CDN, so internet access is needed for the dashboard's utility classes to appear.
