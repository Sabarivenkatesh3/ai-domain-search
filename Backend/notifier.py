# notifier.py
import os
import time
import smtplib
import httpx
import pymysql
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Load env variables
load_dotenv()

WHOISXML_API_KEY = os.getenv("WHOISXML_API_KEY")

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# -------------------------------
# Database connection
# -------------------------------
def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

# -------------------------------
# Check domain availability
# -------------------------------
async def check_domain_availability(domain: str) -> bool:
    url = f"https://domain-availability.whoisxmlapi.com/api/v1?apiKey={WHOISXML_API_KEY}&domainName={domain}&outputFormat=JSON"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
            data = r.json()
        status = data.get("DomainInfo", {}).get("domainAvailability", "UNKNOWN")
        return status == "AVAILABLE"
    except Exception as e:
        print(f"[ERROR] WHOIS check failed for {domain}: {e}")
        return False

# -------------------------------
# Send email notification
# -------------------------------
def send_email_notification(to_email, domain):
    subject = f"🎉 {domain} is now available!"
    body = f"Good news! The domain '{domain}' is now available for registration.\n\nVisit your registrar to claim it before someone else does!"
    
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
        print(f"✅ Email sent to {to_email} for {domain}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False

# -------------------------------
# Main loop
# -------------------------------
import asyncio

def check_and_notify():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM domain_notifications WHERE notified = 0")
        records = cursor.fetchall()

    if not records:
        print("No pending notifications. Sleeping...")
        conn.close()
        return

    for record in records:
        domain = record["domain_name"]
        email = record["email"]
        print(f"🔍 Checking {domain} for {email}...")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        available = loop.run_until_complete(check_domain_availability(domain))

        if available:
            success = send_email_notification(email, domain)
            if success:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "UPDATE domain_notifications SET notified = 1 WHERE id = %s",
                        (record["id"],)
                    )
                conn.commit()
        else:
            print(f"❌ {domain} still not available.")
    conn.close()

# -------------------------------
# Schedule every 6 hours
# -------------------------------
if __name__ == "__main__":
    print("🚀 Notifier started! Checking every 6 hours...")
    while True:
        check_and_notify()
        print("⏰ Sleeping for 6 hours...")
        time.sleep(30)  # every 30 seconds (for testing)