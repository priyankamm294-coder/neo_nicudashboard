import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  auth: {
    token: "neocare-dev-key-change-me",
  },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("NEOCARE SOCKET CONNECTED:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("NEOCARE SOCKET ERROR:", error.message);
});

socket.on("connection_status", (data) => {
  console.log("NEOCARE BACKEND STATUS:", data);
});

export default socket;