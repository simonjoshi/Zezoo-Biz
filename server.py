import os, re
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import requests as req
from dotenv import load_dotenv

load_dotenv()

BRAVE_API_KEY = os.getenv("BRAVE_API_KEY", "")
HERE = Path(__file__).parent
DIST = HERE / "dist"

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def extract_location(text):
    m = re.search(r'\b([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?),\s*([A-Z]{2})\b', text)
    return m.group(0) if m else "United States"

def extract_price(text):
    m = re.search(r'\$[\d,]+(?:[KkMm])?(?:\s*[-–]\s*\$[\d,]+(?:[KkMm])?)?', text)
    return m.group(0) if m else None

def brave_search(query: str, count: int = 8):
    if not BRAVE_API_KEY:
        return []
    r = req.get(
        "https://api.search.brave.com/res/v1/web/search",
        headers={"Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY},
        params={"q": query, "count": count, "search_lang": "en", "country": "us"},
        timeout=10
    )
    if r.status_code != 200:
        return []
    results = r.json().get("web", {}).get("results", [])
    businesses = []
    for res in results:
        title = res.get("title", "")
        desc  = res.get("description", "")
        name  = re.split(r' [-|–] | \| ', title)[0].strip()
        businesses.append({
            "name":        name,
            "description": desc,
            "sourceUrl":   res.get("url", ""),
            "location":    extract_location(title + " " + desc),
            "price":       extract_price(desc),
            "revenue":     None,
            "cashFlow":    None,
        })
    return businesses

@app.get("/api/search")
def search(q: str = "", location: str = "", type: str = "search"):
    if type == "featured":
        query = 'small business for sale USA (site:bizbuysell.com OR site:loopnet.com OR site:businessesforsale.com)'
    else:
        loc   = f" {location}" if location else " United States"
        query = f'{q} business for sale{loc} (site:bizbuysell.com OR site:loopnet.com OR site:businessesforsale.com OR site:flippa.com)'
    return JSONResponse(brave_search(query))

# Serve React build
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")

@app.get("/{full_path:path}")
def catch_all(full_path: str = ""):
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"status": "building"}, status_code=503)
