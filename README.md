# RAG Demo: Next.js + FastAPI + Pinecone + Gemini Pro

This project is a full-stack Retrieval-Augmented Generation (RAG) demo featuring:

- **Frontend:** Next.js (React, Tailwind CSS)
- **Backend:** FastAPI (Python)
- **Vector DB:** Pinecone
- **LLM:** Google Gemini Pro (Generative AI)

## Features

- Upload PDF documents and index their content in Pinecone
- Ask questions in a chat interface
- The backend retrieves relevant context from Pinecone and generates answers using Gemini Pro
- Mobile-friendly, clean UI

## Project Structure

```
rag-demo/
├── backend/    # FastAPI backend
├── frontend/   # Next.js frontend
└── README.md   # (this file)
```

## Getting Started

### 1. Backend Setup

- Go to the `backend` folder:
  ```powershell
  cd backend
  python -m venv venv
  .\venv\Scripts\activate
  pip install -r requirements.txt
  ```
- Create a `.env` file with your Pinecone and Google API keys:
  ```env
  PINECONE_API_KEY=your-pinecone-key
  PINECONE_ENVIRONMENT=aws-us-east-1
  PINECONE_INDEX_NAME=demo
  GOOGLE_API_KEY=your-google-api-key
  ```
- Start the FastAPI server:
  ```powershell
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```

### 2. Frontend Setup

- Go to the `frontend` folder:
  ```powershell
  cd ../frontend
  npm install
  npm run dev
  ```
- The app will be available at [http://localhost:3000](http://localhost:3000)

### 3. Usage

- Upload a PDF using the upload section.
- Ask questions in the chat window.
- The backend retrieves context from Pinecone and uses Gemini Pro to generate answers.

## Notes

- Ensure your Pinecone index dimension matches your embedding model (default: 384 for all-MiniLM-L6-v2).
- CORS is configured to allow requests from the frontend.
- For production, secure your API keys and consider deploying with HTTPS.

---

Made with ❤️ using Next.js, FastAPI, Pinecone, and Gemini Pro.
