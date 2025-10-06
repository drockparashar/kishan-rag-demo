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
