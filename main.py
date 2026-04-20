"""ZeeZoo-Biz — FastAPI backend"""
import os, re
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests as req
from dotenv import load_dotenv

load_dotenv()
BRAVE_KEY = os.getenv("BRAVE_API_KEY", "")
HERE = Path(__file__).parent

app = FastAPI(title="ZeeZoo-Biz")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def extract_location(text):
    m = re.search(r'\b([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?),\s*([A-Z]{2})\b', text)
    return m.group(0) if m else "United States"

def extract_price(text):
    m = re.search(r'\$[\d,]+(?:[KkMm])?', text)
    return m.group(0) if m else None

def brave_search(query, count=8):
    if not BRAVE_KEY:
        return []
    try:
        r = req.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"Accept": "application/json", "X-Subscription-Token": BRAVE_KEY},
            params={"q": query, "count": count, "search_lang": "en", "country": "us"},
            timeout=10
        )
        results = r.json().get("web", {}).get("results", [])
        out = []
        for item in results:
            title = item.get("title", "")
            desc  = item.get("description", "")
            name  = re.split(r' [-–|] | \| ', title)[0].strip()
            out.append({
                "name":        name,
                "description": desc,
                "sourceUrl":   item.get("url", ""),
                "location":    extract_location(title + " " + desc),
                "price":       extract_price(desc),
            })
        return out
    except Exception as e:
        print("Brave error:", e)
        return []

@app.get("/", response_class=HTMLResponse)
def index():
    return (HERE / "index.html").read_text()

@app.get("/api/search")
def search(q: str = "", location: str = "", type: str = "search"):
    if type == "featured":
        query = "small business for sale USA (site:bizbuysell.com OR site:loopnet.com OR site:businessesforsale.com)"
    else:
        loc   = f" {location}" if location else " United States"
        query = f"{q} business for sale{loc} (site:bizbuysell.com OR site:loopnet.com OR site:businessesforsale.com)"
    return JSONResponse(brave_search(query))
