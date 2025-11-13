import os
import re
import random
import pymysql
import httpx
import asyncio
import tldextract
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ✅ Create Flask app first
app = Flask(__name__)

# ✅ Enable CORS only once — restrict to your frontend URL
CORS(app, resources={r"/*": {"origins": "http://localhost:8080"}})

# ✅ Load environment variables
load_dotenv()

WHOISXML_API_KEY = os.getenv("WHOISXML_API_KEY")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "domain_saas")
APP_NAME = os.getenv("APP_NAME", "Domain Suggester SaaS")

if not WHOISXML_API_KEY:
    raise ValueError("WHOISXML_API_KEY missing in .env")


# -------------------------
# Database helpers
# -------------------------
def get_db_connection():
    """
    Returns a new pymysql connection.
    Note: for production consider a connection pool.
    """
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

def init_db():
    """Create required tables if they don't exist."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS domain_notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    domain_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    notified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_checked_at TIMESTAMP NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)
        conn.commit()
    finally:
        conn.close()

# run DB init at startup
init_db()

# -------------------------
# Helper logic
# -------------------------
def classify_input(user_input: str) -> str:
    ext = tldextract.extract(user_input)
    return "full_domain" if ext.suffix else "brand_keyword"

async def check_domain_availability(domain: str) -> bool:
    """Query WhoisXML domain availability API. Returns True if AVAILABLE."""
    url = (
        f"https://domain-availability.whoisxmlapi.com/api/v1"
        f"?apiKey={WHOISXML_API_KEY}&domainName={domain}&outputFormat=JSON"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
            data = r.json()
        status = data.get("DomainInfo", {}).get("domainAvailability", "UNKNOWN").strip().lower()
        print(f"[DEBUG] WhoisXML Response for {domain}: {status}")  # optional for testing
        return status == "available"

    except Exception as e:
        print(f"[ERROR] Whois check failed for {domain}: {e}")
        return False

def sanitize_word(w: str) -> str:
    return re.sub(r'[^a-z0-9]', '', w.strip().lower())

PREFIXES = ["get", "try", "go", "my", "join", "the"]
SUFFIXES = ["app", "hq", "site", "online", "tech", "co", "now"]
TLDS = [".com", ".io", ".co", ".xyz", ".net"]

def generate_domain_ideas(keyword: str, limit=20):
    k = sanitize_word(keyword)
    ideas = set()
    for pre in PREFIXES:
        ideas.add(f"{pre}{k}")
    for suf in SUFFIXES:
        ideas.add(f"{k}{suf}")
        ideas.add(f"{k}-{suf}")
    ideas.add(k)
    ideas.add(f"{k}{random.choice(SUFFIXES)}")
    for pre in PREFIXES[:3]:
        for suf in SUFFIXES[:3]:
            ideas.add(f"{pre}{k}{suf}")
    ideas = list(ideas)[:limit]
    return [f"{name}{random.choice(TLDS)}" for name in ideas]

async def suggest_alternatives(domain: str):
    ext = tldextract.extract(domain)
    base = ext.domain.lower()

    # build candidate list
    alternatives = [f"{base}{tld}" for tld in TLDS if tld != f".{ext.suffix}"]

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [
            client.get(
                f"https://domain-availability.whoisxmlapi.com/api/v1?apiKey={WHOISXML_API_KEY}&domainName={alt}&outputFormat=JSON"
            )
            for alt in alternatives
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for alt, resp in zip(alternatives, responses):
        if isinstance(resp, Exception):
            continue
        try:
            data = resp.json()
            status = data.get("DomainInfo", {}).get("domainAvailability", "UNKNOWN").strip().lower()
            results.append({
                "fqdn": alt,
                "available": status == "available"
            })
        except Exception:
            pass

    # fallback: if all unavailable, still show them
    if not results:
        results = [{"fqdn": alt, "available": False} for alt in alternatives]

    return results


# -------------------------
# Routes
# -------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": f"Welcome to {APP_NAME} API 🚀",
        "usage": "POST /check { 'input_text': 'example.com' } | POST /notify { 'domain':'example.com','email':'you@me.com' }"
    })

@app.route("/check", methods=["POST"])
def check_domain():
    data = request.get_json() or {}
    user_input = (data.get("input_text") or "").strip().lower()
    if not user_input:
        return jsonify({"error": "input_text required"}), 400

    mode = classify_input(user_input)

    # run async functions with event loop wrapper
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    if mode == "full_domain":
        available = loop.run_until_complete(check_domain_availability(user_input))
        if available:
            return jsonify({
                "status": "available",
                "domain": user_input,
                "message": f"✅ {user_input} is available!"
            })
        else:
            alternatives = loop.run_until_complete(suggest_alternatives(user_input))
            return jsonify({
                "status": "unavailable",
                "domain": user_input,
                "message": f"❌ {user_input} is not available.",
                "alternatives": alternatives,
                "allow_notification": True
            })
    else:
        suggestions = generate_domain_ideas(user_input)
        results = []
        for domain in suggestions:
            available = loop.run_until_complete(check_domain_availability(domain))
            results.append({"fqdn": domain, "available": available})
        return jsonify({
            "status": "suggestions",
            "keyword": user_input,
            "results": results
        })

@app.route("/notify", methods=["POST"])
def subscribe_for_notification():
    """
    Save domain & email to DB for later re-check.
    Example body: {"domain":"socialeagle.com", "email":"me@example.com"}
    """
    data = request.get_json() or {}
    domain = (data.get("domain") or "").strip().lower()
    email = (data.get("email") or "").strip().lower()

    if not domain or not email:
        return jsonify({"error": "domain and email required"}), 400

    # basic email validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "invalid email"}), 400

    # insert to DB
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO domain_notifications (domain_name, email, notified) VALUES (%s,%s,%s)",
                (domain, email, False)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        print("[DB ERROR]", e)
        return jsonify({"error": "db error"}), 500
    finally:
        conn.close()

    return jsonify({"message": f"You will be notified when {domain} becomes available.", "domain": domain, "email": email})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
