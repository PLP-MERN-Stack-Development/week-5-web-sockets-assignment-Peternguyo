
import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER || "http://localhost:5000";

export const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
