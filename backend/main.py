

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse
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
        total_chunks = 0
        # Process in batches of N pages to avoid memory issues
        batch_pages = 20
        num_pages = len(pdf_reader.pages)
        for start in range(0, num_pages, batch_pages):
            end = min(start + batch_pages, num_pages)
            print(f"Processing pages {start+1} to {end} of {num_pages}...")
            text = "\n".join(pdf_reader.pages[i].extract_text() or "" for i in range(start, end))
            if text.strip():
                print(f"Upserting batch for pages {start+1}-{end}...")
                num = upsert_document(
                    text,
                    metadata={
                        "doc_name": file.filename,
                        "doc_url": doc_url
                    },
                    chunk_offset=total_chunks
                )
                total_chunks += num
                print(f"Batch upserted: {num} chunks (total so far: {total_chunks})")
        return {"message": f"PDF uploaded and {total_chunks} chunks upserted to Pinecone."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})



@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        matches = query_index(request.question, top_k=3, return_metadata=True)
        context = "\n".join([m["metadata"]["text"] for m in matches])
        prompt = (
            f"Based on the following information: {context}\n"
            f"please provide an answer to this question: {request.question}\n"
            "Also format the response to be in a presentable way for a chat application in normal text not markdown format"
            "If the information is not sufficient, say that you cannot answer."
        )
        sources = [m["metadata"] for m in matches]
        if not GOOGLE_API_KEY:
            def fallback_stream():
                yield "[LLM not configured] Retrieved context: " + context
                yield "\n[[SOURCES]]" + JSONResponse(content={"sources": sources}).body.decode()
            return StreamingResponse(fallback_stream(), media_type="text/plain")

        model = genai.GenerativeModel("gemini-2.5-flash")
        def stream_generator():
            response_stream = model.generate_content(prompt, stream=True)
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
            # At the end, send a marker and the sources as JSON
            yield "\n[[SOURCES]]" + JSONResponse(content={"sources": sources}).body.decode()
        return StreamingResponse(stream_generator(), media_type="text/plain")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
