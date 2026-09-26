"""
Parser for MahaDBT scheme pages.
Extracts structured data from official scheme HTML pages.
"""

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup


# Known section headers in scheme pages
SECTION_PATTERNS = {
    "overview": [r"overview", r"about\s+the\s+scheme", r"scheme\s+overview", r"introduction"],
    "benefits": [r"benefits?", r"financial\s+assistance", r"amount", r"scholarship\s+amount", r"rate\s+of\s+scholarship"],
    "eligibility": [r"eligibility", r"who\s+can\s+apply", r"conditions?", r"criteria"],
    "renewal": [r"renewal", r"continuation", r"renewal\s+policy"],
    "documents": [r"documents?", r"required\s+documents?", r"attachments?", r"enclosures?"],
    "application": [r"application", r"how\s+to\s+apply", r"application\s+process", r"procedure"],
    "gr": [r"government\s+resolution", r"gr\s+no", r"gr\s+number", r"resolution"],
    "instructions": [r"instructions?", r"guidelines?", r"important\s+points", r"note"],
}


def identify_section(heading: str) -> str:
    """Identify which section a heading belongs to."""
    heading_lower = heading.lower()
    for section, patterns in SECTION_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, heading_lower):
                return section
    return "other"


def clean_text(text: str) -> str:
    """Clean and normalize text content."""
    if not text:
        return ""
    # Replace multiple whitespace with single space
    text = re.sub(r"\s+", " ", text)
    # Remove zero-width spaces and other invisible chars
    text = text.replace("\u200b", "").replace("\ufeff", "")
    return text.strip()


def extract_amount(text: str) -> tuple[Optional[float], Optional[str]]:
    """Extract numeric amount and currency from text."""
    if not text:
        return None, None
    
    # Pattern for INR amounts: Rs. 1,20,000 or ₹ 1,20,000 or 120000
    patterns = [
        r"(?:Rs\.?|₹|INR)\s*([\d,]+(?:\.\d+)?)",
        r"([\d,]+(?:\.\d+)?)\s*(?:Rs\.?|₹|INR)",
        r"^([\d,]+(?:\.\d+)?)$",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                amount_str = match.group(1).replace(",", "")
                amount = float(amount_str)
                return amount, "INR"
            except ValueError:
                continue
    
    return None, None


def extract_percentage(text: str) -> Optional[float]:
    """Extract percentage value from text."""
    if not text:
        return None
    
    match = re.search(r"(\d+(?:\.\d+)?)\s*%", text)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return None


def extract_income_limit(text: str) -> Optional[float]:
    """Extract income limit from text like 'income up to Rs. 8,00,000'."""
    if not text:
        return None
    
    # Look for patterns like "up to", "not exceeding", "below", "less than"
    patterns = [
        r"(?:up\s+to|not\s+exceeding|below|less\s+than|maximum|max)\s+(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d+)?)",
        r"(?:income|annual\s+income)\s*(?:up\s+to|not\s+exceeding|below|less\s+than)?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+(?:\.\d+)?)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                continue
    
    # Fallback: just find any amount in text near income keywords
    income_keywords = ["income", "annual income", "family income", "parental income"]
    for keyword in income_keywords:
        if keyword in text.lower():
            amount, _ = extract_amount(text)
            if amount:
                return amount
    
    return None


def extract_age_range(text: str) -> tuple[Optional[int], Optional[int]]:
    """Extract min and max age from text."""
    if not text:
        return None, None
    
    min_age = None
    max_age = None
    
    # Pattern for "aged between X and Y" or "age X to Y"
    patterns = [
        r"(?:aged?|age)\s*(?:between\s+)?(\d+)\s*(?:and|to|-)\s*(\d+)",
        r"(?:minimum|min)\s*age\s*(\d+)",
        r"(?:maximum|max)\s*age\s*(\d+)",
        r"(\d+)\s*(?:to|-)\s*(\d+)\s*years",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                if len(match.groups()) == 2:
                    min_age = int(match.group(1))
                    max_age = int(match.group(2))
                elif "min" in pattern:
                    min_age = int(match.group(1))
                elif "max" in pattern:
                    max_age = int(match.group(1))
                break
            except ValueError:
                continue
    
    return min_age, max_age


def parse_scheme_page(html: str, base_url: str) -> dict:
    """
    Parse a scheme detail page and extract structured information.
    Returns a dict with raw extracted data for normalization.
    """
    soup = BeautifulSoup(html, "lxml")
    
    result = {
        "source_url": base_url,
        "raw_sections": {},
        "extracted": {},
    }
    
    # Try to find the main content area
    main_content = soup.find("main") or soup.find("div", class_=re.compile(r"content|scheme|detail")) or soup.body
    
    if not main_content:
        return {"error": "Could not find main content area", "source_url": base_url}
    
    # Extract page title
    title_tag = soup.find("title")
    if title_tag:
        result["extracted"]["page_title"] = clean_text(title_tag.get_text())
    
    h1_tag = main_content.find("h1")
    if h1_tag:
        result["extracted"]["heading"] = clean_text(h1_tag.get_text())
    
    # Find all headings and their content
    current_section = "overview"
    section_content = []
    
    for element in main_content.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "table", "div"]):
        tag_name = element.name
        
        if tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            # Save previous section
            if section_content:
                result["raw_sections"][current_section] = result["raw_sections"].get(current_section, "") + "\n".join(section_content)
                section_content = []
            
            # Identify new section
            heading_text = clean_text(element.get_text())
            current_section = identify_section(heading_text)
            section_content.append(f"## {heading_text}")
        else:
            text = clean_text(element.get_text())
            if text:
                section_content.append(text)
    
    # Save last section
    if section_content:
        result["raw_sections"][current_section] = result["raw_sections"].get(current_section, "") + "\n".join(section_content)
    
    # Extract structured data from sections
    extracted = result["extracted"]
    
    # Overview
    if "overview" in result["raw_sections"]:
        extracted["overview"] = result["raw_sections"]["overview"][:2000]
    
    # Benefits - extract amounts
    if "benefits" in result["raw_sections"]:
        benefits_text = result["raw_sections"]["benefits"]
        extracted["benefits_raw"] = benefits_text[:3000]
        amount, currency = extract_amount(benefits_text)
        if amount:
            extracted["benefit_amount"] = amount
            extracted["benefit_currency"] = currency
    
    # Eligibility - extract structured fields
    if "eligibility" in result["raw_sections"]:
        elig_text = result["raw_sections"]["eligibility"]
        extracted["eligibility_raw"] = elig_text[:3000]
        
        # Extract income limit
        income = extract_income_limit(elig_text)
        if income:
            extracted["max_income"] = income
        
        # Extract age range
        min_age, max_age = extract_age_range(elig_text)
        if min_age:
            extracted["min_age"] = min_age
        if max_age:
            extracted["max_age"] = max_age
        
        # Extract percentage
        percentage = extract_percentage(elig_text)
        if percentage:
            extracted["min_percentage"] = percentage
    
    # Documents
    if "documents" in result["raw_sections"]:
        docs_text = result["raw_sections"]["documents"]
        extracted["documents_raw"] = docs_text[:2000]
    
    # Application process
    if "application" in result["raw_sections"]:
        app_text = result["raw_sections"]["application"]
        extracted["application_raw"] = app_text[:2000]
    
    # GR references
    if "gr" in result["raw_sections"]:
        gr_text = result["raw_sections"]["gr"]
        extracted["gr_raw"] = gr_text[:1000]
    
    # Find all links in the page
    links = []
    for a in main_content.find_all("a", href=True):
        href = a.get("href")
        text = clean_text(a.get_text())
        if href and text:
            full_url = urljoin(base_url, href)
            links.append({"url": full_url, "text": text})
    
    # Look for GR links
    gr_links = [l for l in links if "gr" in l["text"].lower() or "resolution" in l["text"].lower()]
    if gr_links:
        extracted["gr_links"] = gr_links
    
    # Look for application links
    apply_links = [l for l in links if any(kw in l["text"].lower() for kw in ["apply", "application", "register"])]
    if apply_links:
        extracted["application_links"] = apply_links
    
    result["extracted"] = extracted
    return result


def parse_scheme_list_page(html: str, base_url: str) -> list[dict]:
    """
    Parse a scheme listing page to extract scheme summary cards.
    Returns list of basic scheme info with links to detail pages.
    """
    soup = BeautifulSoup(html, "lxml")
    schemes = []
    
    # This will need to be adjusted based on actual MahaDBT page structure
    # Look for common patterns: cards, tables, list items
    
    # Try cards
    for card in soup.find_all(["div", "article"], class_=re.compile(r"card|scheme|item")):
        link = card.find("a", href=True)
        if not link:
            continue
        
        title_elem = card.find(["h1", "h2", "h3", "h4", "h5", "h6"])
        title = clean_text(title_elem.get_text()) if title_elem else clean_text(link.get_text())
        
        if title:
            schemes.append({
                "title": title,
                "detail_url": urljoin(base_url, link["href"]),
                "snippet": clean_text(card.get_text())[:200],
            })
    
    # Try table rows
    for row in soup.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) >= 2:
            link = cells[0].find("a", href=True) or cells[1].find("a", href=True)
            if link:
                title = clean_text(link.get_text())
                schemes.append({
                    "title": title,
                    "detail_url": urljoin(base_url, link["href"]),
                    "snippet": clean_text(row.get_text())[:200],
                })
    
    return schemes