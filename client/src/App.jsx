import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const messageSound = new Audio("/notification.mp3");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("general");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState("");
  const [page, setPage] = useState(0);
  const chatRef = useRef();

  const handleJoin = () => {
    socket.emit("join-room", { username, room });
    setJoined(true);
  };

  const fetchMessages = (nextPage) => {
    socket.emit("load-messages", { room, page: nextPage }, (msgs) => {
      setMessages((prev) => [...msgs.reverse(), ...prev]);
    });
  };

  useEffect(() => {
    if (joined) {
      socket.emit("register-user", username);
      fetchMessages(0);
    }
  }, [joined]);

  useEffect(() => {
    socket.on("chat-message", (data) => {
      setMessages((prev) => [...prev, data]);
      if (data.user !== username) {
        messageSound.play();
        toast(`${data.user}: ${data.message.replace(/<[^>]*>?/gm, "")}`);
      }
    });
    socket.on("typing", (data) => {
      setTyping(data);
      setTimeout(() => setTyping(""), 2000);
    });
    return () => {
      socket.off("chat-message");
      socket.off("typing");
    };
  }, [username]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit(
        "chat-message",
        {
          user: username,
          message,
          timestamp: new Date().toLocaleTimeString(),
        },
        (ack) => {
          if (ack.status === "ok") toast.success("Message delivered");
        }
      );
      setMessage("");
    }
  };

  const handleScroll = () => {
    if (chatRef.current.scrollTop === 0) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto sm:p-2 sm:max-w-full">
      <ToastContainer />
      {!joined ? (
        <div className="space-y-4">
          <input
            className="border p-2 w-full"
            placeholder="Enter username"
            onChange={(e) => setUsername(e.target.value)}
          />
          <select
            className="border p-2 w-full"
            onChange={(e) => setRoom(e.target.value)}
            value={room}
          >
            <option value="general"># General</option>
            <option value="tech"># Tech</option>
            <option value="random"># Random</option>
          </select>
          <button className="bg-blue-500 text-white px-4 py-2" onClick={handleJoin}>
            Join Room
          </button>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-2">Room: #{room}</h2>
          <div
            className="h-64 overflow-y-auto border p-2 mb-2 bg-gray-100"
            onScroll={handleScroll}
            ref={chatRef}
          >
            {messages.map((msg, idx) => (
              <div key={idx} className="mb-1">
                <strong>{msg.user}</strong>: <span>{msg.message}</span>
                <div className="text-xs text-gray-500">{msg.timestamp}</div>
              </div>
            ))}
            {typing && <div className="italic text-sm">{typing} is typing...</div>}
          </div>

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={() => socket.emit("typing", username)}
            className="border p-2 w-full mb-2"
            placeholder="Type a message..."
          />
          <button onClick={sendMessage} className="bg-green-600 text-white px-4 py-2 w-full">
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default App;