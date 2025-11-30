from flask import Flask, request
import hmac
import hashlib
import subprocess
import os

app = Flask(__name__)
SECRET = os.environ.get("WEBHOOK_SECRET", "csetytpNVal0mHJGX2xA7D5LomCe6UKH").encode()

def verify_github_signature(payload, signature):
    mac = hmac.new(SECRET, msg=payload, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route("/webhook-deploy", methods=["POST"])
def webhook():
    print("---- Webhook received ----")
    print("Headers:", dict(request.headers))
    # Use get_data() to ensure we get the raw bytes for HMAC verification
    payload = request.get_data()
    print("Body length:", len(payload))

    signature = request.headers.get("X-Hub-Signature-256", "")
    if not verify_github_signature(payload, signature):
        print("❌ Webhook não autorizado")
        return "Unauthorized", 401

    print("✅ Webhook autorizado - executando deploy.sh")
    # Use Popen to run in background so we don't block the response
    subprocess.Popen(["sh", "webhook/deploy.sh"])
    return "OK", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7000)