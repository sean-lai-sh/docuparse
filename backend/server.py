import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from bs4 import BeautifulSoup
import openai
from supabase import create_client, Client
from dotenv import load_dotenv
import numpy as np

load_dotenv()

app = FastAPI()

# Load environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

openai.api_key = OPENAI_API_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

EMBEDDING_MODEL = "text-embedding-ada-002"
CHUNK_SIZE = 500  # characters
TOP_K = 5

class IngestRequest(BaseModel):
    html: str
    url: str
    document_id: str

class QueryRequest(BaseModel):
    question: str

# Helper: extract text from HTML
def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator=" ", strip=True)

# Helper: chunk text
def chunk_text(text: str, chunk_size: int = CHUNK_SIZE):
    return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

# Helper: get embedding
async def get_embedding(text: str):
    resp = await openai.Embedding.acreate(
        input=text,
        model=EMBEDDING_MODEL
    )
    return resp["data"][0]["embedding"]

@app.post("/ingest")
async def ingest(req: IngestRequest):
    text = extract_text_from_html(req.html)
    chunks = chunk_text(text)
    for chunk in chunks:
        embedding = await get_embedding(chunk)
        # Store in Supabase
        supabase.table("vector_data").insert({
            "url": req.url,
            "content": chunk,
            "document_id": req.document_id,
            "embedding": embedding
        }).execute()
    return JSONResponse({"status": "success", "chunks": len(chunks)})

@app.post("/query")
async def query(req: QueryRequest):
    query_embedding = await get_embedding(req.question)
    # Query Supabase for top 5 similar chunks using pgvector's <-> operator
    sql = f"""
        select content, url, document_id, embedding
        from vector_data
        order by embedding <-> '{query_embedding}'
        limit {TOP_K};
    """
    res = supabase.rpc("execute_sql", {"sql": sql}).execute()
    if not res.data:
        return JSONResponse({"status": "error", "message": "No similar content found."}, status_code=404)
    top_chunks = [row["content"] for row in res.data]
    context = "\n---\n".join(top_chunks)
    prompt = f"Answer the following question using the provided context.\nContext:\n{context}\n\nQuestion: {req.question}\nAnswer:"
    completion = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    answer = completion["choices"][0]["message"]["content"]
    return JSONResponse({"status": "success", "answer": answer, "context": top_chunks})
