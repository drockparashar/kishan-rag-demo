import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

pc = Pinecone(api_key=PINECONE_API_KEY)

# Parse environment for cloud/region
if PINECONE_ENVIRONMENT and "-" in PINECONE_ENVIRONMENT:
    cloud, region = PINECONE_ENVIRONMENT.split("-", 1)
else:
    cloud, region = "aws", "us-east-1"

pc = Pinecone(api_key=PINECONE_API_KEY)

model = SentenceTransformer('all-MiniLM-L6-v2')

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)


def get_or_create_index():
    index_names = pc.list_indexes().names()
    if PINECONE_INDEX_NAME not in index_names:
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(cloud=cloud, region=region)
        )
    return pc.Index(PINECONE_INDEX_NAME)

index = get_or_create_index()

def upsert_document(text, metadata=None, batch_size=50, chunk_offset=0):
    # Accept doc_name and doc_url in metadata
    doc_name = metadata.get("doc_name") if metadata else None
    doc_url = metadata.get("doc_url") if metadata else None
    chunks = text_splitter.split_text(text)
    total_chunks = len(chunks)
    for batch_start in range(0, total_chunks, batch_size):
        batch_chunks = chunks[batch_start:batch_start+batch_size]
        embeddings = model.encode(batch_chunks).tolist()
        ids = [f"chunk-{chunk_offset + batch_start + i}" for i in range(len(batch_chunks))]
        to_upsert = []
        for i, (chunk, emb) in enumerate(zip(batch_chunks, embeddings)):
            chunk_metadata = {
                "text": chunk,
                "chunk_index": chunk_offset + batch_start + i
            }
            if doc_name:
                chunk_metadata["doc_name"] = doc_name
            if doc_url:
                chunk_metadata["doc_url"] = doc_url
            to_upsert.append((ids[i], emb, chunk_metadata))
        index.upsert(vectors=to_upsert)
    return total_chunks

def query_index(query, top_k=3, return_metadata=False):
    query_emb = model.encode([query])[0].tolist()
    res = index.query(vector=query_emb, top_k=top_k, include_metadata=True)
    if return_metadata:
        return res['matches']
    return [match['metadata']['text'] for match in res['matches']]
