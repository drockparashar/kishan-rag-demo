import os
from dotenv import load_dotenv
import pinecone
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

pinecone.init(api_key=PINECONE_API_KEY, environment=PINECONE_ENVIRONMENT)

model = SentenceTransformer('all-MiniLM-L6-v2')

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

def get_or_create_index():
    if PINECONE_INDEX_NAME not in pinecone.list_indexes():
        pinecone.create_index(PINECONE_INDEX_NAME, dimension=384, metric="cosine")
    return pinecone.Index(PINECONE_INDEX_NAME)

index = get_or_create_index()

def upsert_document(text, metadata=None):
    chunks = text_splitter.split_text(text)
    embeddings = model.encode(chunks).tolist()
    ids = [f"chunk-{i}" for i in range(len(chunks))]
    to_upsert = list(zip(ids, embeddings, [{"text": c} for c in chunks]))
    index.upsert(vectors=to_upsert)
    return len(chunks)

def query_index(query, top_k=3):
    query_emb = model.encode([query])[0].tolist()
    res = index.query(vector=query_emb, top_k=top_k, include_metadata=True)
    return [match['metadata']['text'] for match in res['matches']]
