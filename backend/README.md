# Backend for RAG Demo

## Setup Instructions

1. **Create a virtual environment (recommended):**

   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **Install dependencies:**

   ```powershell
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**

   - Copy `.env` and fill in your Pinecone credentials:
     - `PINECONE_API_KEY`
     - `PINECONE_ENVIRONMENT`
     - `PINECONE_INDEX_NAME`

4. **Run the FastAPI server:**

   ```powershell
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **API Endpoints:**
   - **POST** `/api/upload` — Upload a PDF file. Returns chunk upload status.
   - **POST** `/api/chat` — Ask a question. Returns top 3 relevant chunks from Pinecone.

CORS is configured to allow requests from `http://localhost:3000` (Next.js frontend).

## Notes

- Ensure your Pinecone index is created and accessible.
- The backend will upsert PDF text chunks and retrieve relevant chunks for questions.
- Generation (LLM) step is not yet implemented; only retrieval is performed.
