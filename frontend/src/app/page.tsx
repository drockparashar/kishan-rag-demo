"use client";
import React, { useRef, useState } from "react";

export default function Home() {
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! Upload a PDF or ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Mock file upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.length) return;
    setUploading(true);
    setUploadSuccess(false);
    setTimeout(() => {
      setUploading(false);
      setUploadSuccess(true);
    }, 1200);
  };

  // Mock chat send
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    setMessages((msgs) => [...msgs, { sender: "user", text: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "I am processing your message." },
      ]);
      setSending(false);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-2 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* File Upload Section */}
        <section className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-2">Upload PDF Document</h2>
          <form className="flex flex-col items-center w-full" onSubmit={handleFileUpload}>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2 w-full"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
          {uploadSuccess && (
            <p className="text-green-600 mt-2">Upload successful!</p>
          )}
        </section>

        {/* Chat Section */}
        <section className="bg-white rounded-xl shadow flex flex-col h-[500px] sm:h-[600px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg max-w-[80%] text-sm shadow-sm ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSend}
            className="flex items-center border-t p-2 gap-2"
          >
            <input
              type="text"
              className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              disabled={sending}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
