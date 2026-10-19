
const { io } = require("socket.io-client");

const socket = io("http://localhost:3001", {
  auth: {
    token: "neocare-local-test-key-2026"
  }
});

socket.on("connect", () => {
  console.log("✅ Socket connected!");
  console.log("Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection failed:", error.message);
});

socket.on("connection_status", (data) => {
  console.log("\nConnection status:");
  console.log(data);
});

socket.on("telemetry_update", (data) => {
  console.log("\n📡 Telemetry update:");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("incubator_update", (data) => {
  console.log("\n🏥 Incubator update:");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("alerts_update", (data) => {
  console.log("\n🚨 Alerts update:");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});
