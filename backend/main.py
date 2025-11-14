

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import pypdf
from pinecone_service import upsert_document, query_index
import google.generativeai as genai

app = FastAPI()

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class ChatRequest(BaseModel):
    question: str

from fastapi import Form

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), doc_url: str = Form(...)):
    if not file.filename.lower().endswith('.pdf'):
        return JSONResponse(status_code=400, content={"error": "Only PDF files are supported."})
    try:
        pdf_reader = pypdf.PdfReader(file.file)
        text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)
        num_chunks = upsert_document(
            text,
            metadata={
                "doc_name": file.filename,
                "doc_url": doc_url
            }
        )
        return {"message": f"PDF uploaded and {num_chunks} chunks upserted to Pinecone."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Get full metadata for each chunk
        matches = query_index(request.question, top_k=3, return_metadata=True)
        context = "\n".join([m["metadata"]["text"] for m in matches])
        prompt = (
            f"Based on the following information: {context}\n"
            f"please provide an answer to this question: {request.question}\n"
            "Also format the response to be in a presentable way for a chat application in normal text not markdown format"
            "If the information is not sufficient, say that you cannot answer."
        )
        if not GOOGLE_API_KEY:
            return {"answer": "[LLM not configured] Retrieved context: " + context, "sources": [m["metadata"] for m in matches]}
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return {"answer": response.text, "sources": [m["metadata"] for m in matches]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
