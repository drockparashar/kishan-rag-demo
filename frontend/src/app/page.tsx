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

  // File upload to backend
  const [uploadError, setUploadError] = useState<string | null>(null);
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!fileInputRef.current?.files?.length) return;
    setUploading(true);
    setUploadSuccess(false);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadSuccess(true);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Chat send to backend
  const [chatError, setChatError] = useState<string | null>(null);
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setChatError(null);
    if (!input.trim()) return;
    setSending(true);
    setMessages((msgs) => [...msgs, { sender: "user", text: input }]);
    const question = input;
    setInput("");
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not get an answer");
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: data.answer },
      ]);
    } catch (err: any) {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "[Error] Could not get an answer." },
      ]);
      setChatError(err.message || "Could not get an answer");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-2 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* File Upload Section */}
        <section className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Upload PDF Document</h2>
          <form className="flex flex-col items-center w-full" onSubmit={handleFileUpload}>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2 w-full text-gray-800 placeholder-gray-500"
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
          {uploadError && (
            <p className="text-red-600 mt-2">{uploadError}</p>
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
              className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-500"
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
              {sending ? (
                <svg className="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : "Send"}
            </button>
          </form>
          {chatError && (
            <p className="text-red-600 mt-2 text-sm">{chatError}</p>
          )}
        </section>
      </div>
    </main>
  );
}
