import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
import openai
from supabase import create_client, Client
from dotenv import load_dotenv
import numpy as np


load_dotenv()

app = FastAPI()
# Middleware for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SYSPROMPT = ""


with open("sysprompt.txt", "r", encoding="utf-8") as f:
    SYSPROMPT = f.read()


openai.api_key = OPENAI_API_KEY
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

EMBEDDING_MODEL = "text-embedding-ada-002"
CHUNK_SIZE = 500  # characters
TOP_K = 5

class IngestRequest(BaseModel):
    html: str
    id: str


class FastIngestRequest(BaseModel):
    text: str
    id: str

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
            "id": req.id,
            "content": chunk,
            "embedding": embedding
        }).execute()
    return JSONResponse({"status": "success", "chunks": len(chunks)})

@app.post("/fastingest")
async def fastingest(req: FastIngestRequest):
    chunks = chunk_text(req.text)
    for chunk in chunks:
        safe_chunk = chunk.replace("'", "''")
        sql = f"""
            select id, content, embedding
            from vector_data
            where content = '{safe_chunk}'
            limit {TOP_K};
        """

        res = supabase.rpc("execute_sql", {"sql": sql}).execute()
        if res.data:
            # If chunk already exists, skip embedding
            continue
        embedding = await get_embedding(chunk)
        # Store in Supabase
        supabase.table("vector_data").insert({
            "id": req.id,
            "content": chunk,
            "embedding": embedding
        }).execute()
    return JSONResponse({"status": "success", "chunks": len(chunks)})

@app.post("/query")
async def query(req: QueryRequest):
    query_embedding = await get_embedding(req.question)
    # Query Supabase for top 5 similar chunks using pgvector's <-> operator
    sql = f"""
        select id, content, embedding
        from vector_data
        order by embedding <-> '{query_embedding}'
        limit {TOP_K};
    """
    
    res = supabase.rpc("execute_sql", {"sql": sql}).execute()
    if not res.data:
        return JSONResponse({"status": "error", "message": "No similar content found."}, status_code=404)
    # Write to log.txt

    with open("log.txt", "a", encoding="utf-8") as f:
        f.write(f"Query: {req.question}\n")
        f.write(f"Top {TOP_K} chunks:\n")
        for row in res:
            
            f.write(f"- {row}\n")
        f.write("\n")
    top_chunks = [row["content"] for row in res.data]
    context = "\n---\n".join(top_chunks)
    
    with open("exprompt.txt", "r", encoding="utf-8") as f:
        eprompt = f.read()
    prompt = f"\nContext:\n{context}\n\nQuestion: {req.question}\nAnswer:"
    completion = await openai.ChatCompletion.acreate(
        model="gpt-3.5-turbo",
        messages=[{'role' :'system', 'content' : SYSPROMPT},{"role": "user", "content":eprompt +  prompt}],
        # tools = [
        #     {
        #         "type": "function",
        #         "function": {
        #             "name": "grab_dom",
        #             "description": "Get formatted DOM structure with XPath mappings for elements.",
        #             "parameters": {
        #                 "type": "object",
        #                 "properties": {
        #                     "tab_id": {
        #                         "type": "integer",
        #                         "description": "Optional tab ID to specify which browser tab to extract from."
        #                     }
        #                 },
        #                 "required": []
        #             }
        #         }
        #     }
        # ],
    )
    answer = completion["choices"][0]["message"]["content"]
    return JSONResponse({"status": "success", "answer": answer, "context": top_chunks})

