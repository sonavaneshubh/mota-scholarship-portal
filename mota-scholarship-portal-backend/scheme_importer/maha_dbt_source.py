"""
MahaDBT Source Connector
Connects to official MahaDBT scheme source pages and retrieves scheme information.
"""

import asyncio
import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .normalizer import normalize_scheme_data
from .parser import parse_scheme_page
from .validator import validate_scheme_data


class MahaDBTSource:
    """Source connector for MahaDBT official portal."""
    
    BASE_URL = "https://mahadbt.maharashtra.gov.in"
    SCHEMES_LIST_URL = "https://mahadbt.maharashtra.gov.in/FindEligibleSchemes/FindEligibleSchemes"
    
    def __init__(
        self,
        timeout: float = 30.0,
        max_retries: int = 3,
        rate_limit: float = 1.0,
        user_agent: str = "Mozilla/5.0 (compatible; ScholarshipPortal/1.0; +https://github.com/scholarship-portal)"
    ):
        self.timeout = timeout
        self.max_retries = max_retries
        self.rate_limit = rate_limit
        self.user_agent = user_agent
        self._last_request_time = 0.0
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            headers={"User-Agent": self.user_agent},
            follow_redirects=True,
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()
    
    async def _rate_limit(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit:
            await asyncio.sleep(self.rate_limit - elapsed)
        self._last_request_time = time.time()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)),
    )
    async def fetch(self, url: str) -> httpx.Response:
        """Fetch a URL with rate limiting and retries."""
        await self._rate_limit()
        if not self._client:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        response = await self._client.get(url)
        response.raise_for_status()
        return response
    
    def _generate_content_hash(self, content: str) -> str:
        """Generate SHA256 hash of content for change detection."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]
    
    async def fetch_schemes_list(self) -> list[dict]:
        """
        Fetch the list of eligible schemes from MahaDBT.
        Returns list of dicts with basic scheme info and detail URLs.
        """
        response = await self.fetch(self.SCHEMES_LIST_URL)
        soup = BeautifulSoup(response.text, "lxml")
        
        schemes = []
        
        # Try to find scheme links - adjust selectors based on actual page structure
        # This is a template - actual selectors need to match MahaDBT page structure
        for link in soup.find_all("a", href=True):
            href = link.get("href", "")
            text = link.get_text(strip=True)
            
            # Look for scheme detail pages
            if "scheme" in href.lower() or "detail" in href.lower() or "view" in href.lower():
                full_url = urljoin(self.BASE_URL, href)
                schemes.append({
                    "source_url": full_url,
                    "source_title": text,
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                })
        
        # Deduplicate by URL
        seen = set()
        unique = []
        for s in schemes:
            if s["source_url"] not in seen:
                seen.add(s["source_url"])
                unique.append(s)
        
        return unique
    
    async def fetch_scheme_detail(self, url: str) -> Optional[dict]:
        """Fetch and parse a single scheme detail page."""
        try:
            response = await self.fetch(url)
        except Exception as e:
            return {"error": f"Failed to fetch {url}: {e}", "source_url": url}
        
        content = response.text
        content_hash = self._generate_content_hash(content)
        
        # Parse the scheme page
        parsed = parse_scheme_page(content, url)
        
        if parsed.get("error"):
            return {"error": parsed["error"], "source_url": url, "content_hash": content_hash}
        
        # Normalize the data
        normalized = normalize_scheme_data(parsed)
        
        # Validate
        validation = validate_scheme_data(normalized)
        
        return {
            "source_url": url,
            "content_hash": content_hash,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "raw_html": content[:50000],  # Limit stored HTML
            "parsed": normalized,
            "validation": validation.model_dump() if hasattr(validation, "model_dump") else validation,
        }
    
    async def fetch_multiple_schemes(self, urls: list[str], max_concurrent: int = 3) -> list[dict]:
        """Fetch multiple scheme detail pages with concurrency control."""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def fetch_one(url: str):
            async with semaphore:
                return await self.fetch_scheme_detail(url)
        
        tasks = [fetch_one(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        processed = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed.append({
                    "error": str(result),
                    "source_url": urls[i],
                })
            else:
                processed.append(result)
        
        return processed
    
    def save_raw_response(self, url: str, content: str, output_dir: Path):
        """Save raw HTML response for debugging."""
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = hashlib.md5(url.encode()).hexdigest()[:12] + ".html"
        filepath = output_dir / filename
        filepath.write_text(content, encoding="utf-8")
        return filepath


class ManualJSONSource:
    """Source connector for manually verified JSON dataset imports."""
    
    def __init__(self, json_path: Path):
        self.json_path = json_path
    
    def load_schemes(self) -> list[dict]:
        """Load schemes from a JSON file."""
        if not self.json_path.exists():
            raise FileNotFoundError(f"JSON file not found: {self.json_path}")
        
        with open(self.json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if isinstance(data, dict) and "schemes" in data:
            return data["schemes"]
        elif isinstance(data, list):
            return data
        else:
            raise ValueError("JSON must be a list of schemes or an object with 'schemes' key")
    
    def validate_schemes(self, schemes: list[dict]) -> list[dict]:
        """Validate each scheme in the dataset."""
        validated = []
        for scheme in schemes:
            validation = validate_scheme_data(scheme)
            validated.append({
                "scheme": scheme,
                "validation": validation.model_dump() if hasattr(validation, "model_dump") else validation,
            })
        return validated