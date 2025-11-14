"use client";
import React, { useRef, useState } from "react";

type Source = {
  text: string;
  doc_name?: string;
  doc_url?: string;
  chunk_index?: number;
};

type Message = {
  sender: string;
  text: string;
  sources?: Source[];
};

export default function Home() {
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docUrl, setDocUrl] = useState("");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hello! ask me anything about rice crop." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // File upload to backend
  const [uploadError, setUploadError] = useState<string | null>(null);
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadProgress(0);
    if (!fileInputRef.current?.files?.length) return;
    setUploading(true);
    setUploadSuccess(false);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append("file", file);
    if (docUrl) {
      formData.append("doc_url", docUrl);
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:8000/api/upload");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadSuccess(true);
            resolve();
          } else {
            setUploadError(xhr.responseText || "Upload failed");
            reject(new Error(xhr.responseText || "Upload failed"));
          }
        };
        xhr.onerror = () => {
          setUploadError("Failed to upload file");
          reject(new Error("Failed to upload file"));
        };
        xhr.send(formData);
      });
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let botMsg = "";
      let sources: Source[] | undefined = undefined;
      let buffer = "";
      // Add a placeholder bot message
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "" },
      ]);
      // Helper to append text one character at a time
      const appendCharByChar = async (text: string) => {
        for (let i = 0; i < text.length; i++) {
          botMsg += text[i];
          setMessages((msgs) => {
            const updated = [...msgs];
            for (let j = updated.length - 1; j >= 0; j--) {
              if (updated[j].sender === "bot") {
                updated[j] = { ...updated[j], text: botMsg };
                break;
              }
            }
            return updated;
          });
          // Small delay for effect
          await new Promise((resolve) => setTimeout(resolve, 12));
        }
      };
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = value ? decoder.decode(value) : "";
        buffer += chunk;
        // Check for the sources marker
        const marker = "[[SOURCES]]";
        const markerIdx = buffer.indexOf(marker);
        if (markerIdx !== -1) {
          // Everything before marker is the answer
          const answerPart = buffer.slice(0, markerIdx);
          await appendCharByChar(answerPart);
          // Everything after marker is the sources JSON
          const sourcesJson = buffer.slice(markerIdx + marker.length);
          try {
            const parsed = JSON.parse(sourcesJson);
            sources = parsed.sources;
          } catch (e) {
            sources = undefined;
          }
          buffer = "";
          done = true;
        } else {
          // Stream out the buffer char by char
          await appendCharByChar(buffer);
          buffer = "";
        }
      }
      // After stream ends, update the last bot message with sources
      setMessages((msgs) => {
        const updated = [...msgs];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].sender === "bot") {
            updated[i] = { ...updated[i], text: botMsg, sources };
            break;
          }
        }
        return updated;
      });
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
            <input
              type="url"
              value={docUrl}
              onChange={e => setDocUrl(e.target.value)}
              placeholder="Document URL (required)"
              className="mb-2 w-full rounded border px-3 py-2 text-sm text-gray-800 placeholder-gray-500"
              required
            />
            {uploading && (
              <div className="w-full mb-2">
                <div className="h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-blue-500 rounded"
                    style={{ width: `${uploadProgress}%`, transition: 'width 0.2s' }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">{uploadProgress}%</div>
              </div>
            )}
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
                <div className="w-full">
                  <div
                    className={`px-4 py-2 rounded-lg max-w-[80%] text-sm shadow-sm ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {/* Show sources if present and this is a bot message */}
                  {msg.sender === "bot" && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-100 rounded">
                      <h4 className="font-semibold text-xs text-gray-600">Retrieved Context:</h4>
                      <ul className="list-disc pl-4 mt-1">
                        {msg.sources.map((source: Source, sidx: number) => (
                          <li key={sidx} className="text-xs text-gray-500 italic p-1">
                            <div>"{source.text}"</div>
                            <div>
                              <span className="font-semibold">Source:</span> {source.doc_name}
                              {source.doc_url && (
                                <>
                                  {" | "}
                                  <a href={source.doc_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Document</a>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
