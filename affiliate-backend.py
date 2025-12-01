#!/usr/bin/env python3
"""
Backend API per Convertitore Link Affiliati
Integrazione con YOURLS e scraping Amazon
"""

from flask import Flask, request, jsonify
import re
import logging
from urllib.parse import urlparse, parse_qs, urlencode
import httpx
from bs4 import BeautifulSoup
import asyncio
import os

app = Flask(__name__)

# Configuration
YOURLS_URL = os.environ.get("YOURLS_URL", "https://url.nelloonrender.duckdns.org")
YOURLS_SIGNATURE = os.environ.get("YOURLS_SIGNATURE", "def05e4247")
AFFILIATE_TAG = os.environ.get("AFFILIATE_TAG", "lamendino-21")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

def is_amazon_url(url: str) -> bool:
    """Verifica se è un URL Amazon valido"""
    domains = ["amazon.it", "amazon.com", "amzn.eu", "amzn.to", "amzlink.to"]
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")
        return any(d in domain for d in domains)
    except:
        return False

def extract_asin_from_url(url: str) -> str:
    """Estrae l'ASIN dall'URL Amazon"""
    match = re.search(r'/dp/([A-Z0-9]{10})', url)
    if match:
        return match.group(1)
    match = re.search(r'/gp/product/([A-Z0-9]{10})', url)
    if match:
        return match.group(1)
    return None

def normalize_amazon_url(url: str) -> str:
    """Normalizza l'URL Amazon rimuovendo parametri inutili"""
    try:
        url = url.rstrip('/')
        url = url.replace('?&', '?')
        asin = extract_asin_from_url(url)
        
        if not asin:
            return url
            
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        
        # Preserva solo parametri importanti
        preserved_params = {}
        for param in ['smid', 'condition', 'psc', 'aod', 'm', 's']:
            if param in query_params:
                preserved_params[param] = query_params[param][0]
        
        normalized = f"https://www.amazon.it/dp/{asin}"
        if preserved_params:
            params_str = '&'.join([f"{k}={v}" for k, v in preserved_params.items()])
            normalized = f"{normalized}?{params_str}"
        
        return normalized
    except Exception as e:
        logger.error(f"Error normalizing URL: {e}")
        return url

def add_affiliate_tag(url: str, tag: str) -> str:
    """Aggiunge il tag affiliato all'URL"""
    url = url.rstrip('/')
    url = re.sub(r'[?&]tag=[^&]*', '', url)
    separator = '&' if '?' in url else '?'
    return f"{url}{separator}tag={tag}"

async def shorten_with_yourls(url: str) -> str:
    """Accorcia l'URL usando YOURLS"""
    try:
        api_url = f"{YOURLS_URL}/yourls-api.php"
        url = url.replace('?&', '?')
        
        data = {
            'signature': YOURLS_SIGNATURE,
            'action': 'shorturl',
            'format': 'json',
            'url': url
        }
        
        logger.info(f"Shortening: {url}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(api_url, data=data)
            
            try:
                result = response.json()
            except:
                logger.error(f"JSON parse error")
                return url
            
            if result.get('status') == 'success':
                short = result.get('shorturl')
                logger.info(f"Shortened: {short}")
                return short
            else:
                if 'already exists' in result.get('message', ''):
                    kw = result.get('url', {}).get('keyword')
                    if kw:
                        short = f"{YOURLS_URL}/{kw}"
                        return short
                
                logger.warning(f"YOURLS error: {result.get('message')}")
                return url
                
    except Exception as e:
        logger.error(f"Error shortening: {e}")
        return url

async def get_amazon_product_info(url: str) -> dict:
    """Scrapa le informazioni del prodotto da Amazon"""
    try:
        normalized_url = normalize_amazon_url(url)
        logger.info(f"Scraping from: {normalized_url}")
        
        for user_agent in USER_AGENTS:
            try:
                headers = {
                    'User-Agent': user_agent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
                }
                
                async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                    response = await client.get(normalized_url, headers=headers)
                    
                    if response.status_code != 200:
                        logger.warning(f"Got status {response.status_code}")
                        continue
                    
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Estrai titolo
                    title = 'Prodotto Amazon'
                    title_elem = soup.find('span', {'id': 'productTitle'})
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                    
                    # Estrai prezzo
                    price = None
                    price_container = soup.find('span', {'class': 'a-price'})
                    if price_container:
                        price_text = price_container.get_text(strip=True)
                        prices = re.findall(r'[\d.,€\$]+', price_text)
                        if prices:
                            price = prices[0]
                    
                    # Estrai rating
                    rating = None
                    rating_elem = soup.find('span', {'class': 'a-icon-star-small'})
                    if rating_elem:
                        rating_span = rating_elem.find('span')
                        if rating_span:
                            rating_text = rating_span.get_text(strip=True)
                            match = re.search(r'[\d,]+', rating_text)
                            if match:
                                rating = match.group(0)
                    
                    # Estrai immagine
                    image = None
                    img_elem = soup.find('img', {'id': 'landingImage'})
                    if img_elem:
                        image = img_elem.get('src')
                    
                    # Rileva condizione (Nuovo vs Usato)
                    condition = detect_seller_condition(normalized_url, soup)
                    
                    logger.info(f"Scraped - Title: {title}, Price: {price}, Condition: {condition}")
                    
                    if title and title != 'Prodotto Amazon':
                        return {
                            'success': True,
                            'title': title,
                            'price': price,
                            'rating': rating,
                            'image': image,
                            'condition': condition,
                            'original_url': normalized_url
                        }
            
            except Exception as e:
                logger.warning(f"Error with user agent: {e}")
                continue
        
        return {
            'success': False,
            'title': 'Prodotto Amazon',
            'price': None,
            'rating': None,
            'image': None,
            'condition': None,
            'original_url': normalized_url
        }
    
    except Exception as e:
        logger.error(f"Error scraping: {e}")
        return {
            'success': False,
            'title': 'Prodotto Amazon',
            'price': None,
            'rating': None,
            'image': None,
            'condition': None,
            'error': str(e)
        }

def detect_seller_condition(url: str, soup) -> str:
    """Rileva se il prodotto è nuovo o usato"""
    try:
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        
        aod = query_params.get('aod', [''])[0]
        s_param = query_params.get('s', [''])[0]
        
        if aod == '1':
            return "Usato - Venduto da terzo"
        
        if 'warehouse-deals' in s_param.lower():
            return "Usato - Warehouse Deals Amazon"
        
        seller_section = soup.find('div', {'id': 'merchant-info'})
        if seller_section:
            seller_text = seller_section.get_text(strip=True)
            if 'Amazon Seconda mano' in seller_text:
                return "Usato - Venduto da Amazon Seconda mano"
        
        return "Nuovo - Venduto da Amazon"
    
    except:
        return "Nuovo - Venduto da Amazon"

@app.route('/api/convert-link', methods=['POST'])
async def convert_link():
    """
    Endpoint per convertire link Amazon in link affiliato
    
    Body:
    {
        "url": "https://www.amazon.it/dp/...",
        "shorten": true
    }
    
    Response:
    {
        "success": true,
        "original_url": "...",
        "affiliate_url": "...",
        "short_url": "...",
        "product": {
            "title": "...",
            "price": "...",
            "rating": "...",
            "image": "...",
            "condition": "..."
        }
    }
    """
    try:
        data = request.get_json()
        amazon_url = data.get('url', '').strip()
        should_shorten = data.get('shorten', True)
        
        if not amazon_url:
            return jsonify({'success': False, 'error': 'URL non fornito'}), 400
        
        if not is_amazon_url(amazon_url):
            return jsonify({'success': False, 'error': 'URL non è un link Amazon valido'}), 400
        
        # Normalizza e aggiungi tag affiliato
        normalized_url = normalize_amazon_url(amazon_url)
        affiliate_url = add_affiliate_tag(normalized_url, AFFILIATE_TAG)
        
        # Scrapa le info del prodotto
        product_info = await get_amazon_product_info(normalized_url)
        
        # Accorcia il link se richiesto
        short_url = affiliate_url
        if should_shorten:
            short_url = await shorten_with_yourls(affiliate_url)
        
        return jsonify({
            'success': True,
            'original_url': amazon_url,
            'affiliate_url': affiliate_url,
            'short_url': short_url,
            'product': {
                'title': product_info.get('title'),
                'price': product_info.get('price'),
                'rating': product_info.get('rating'),
                'image': product_info.get('image'),
                'condition': product_info.get('condition')
            }
        })
    
    except Exception as e:
        logger.error(f"Error in convert_link: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'ok', 'affiliate_tag': AFFILIATE_TAG})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
