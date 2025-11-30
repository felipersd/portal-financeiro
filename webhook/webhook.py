from flask import Flask, request
import hmac, hashlib, subprocess

app = Flask(__name__)

SECRET = b"csetytpNVal0mHJGX2xA7D5LomCe6UKH"

def verify_signature(payload, signature):
    mac = hmac.new(SECRET, msg=payload, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected, signature)

@app.route("/webhook-deploy", methods=["POST"])
def webhook():
    secret = request.headers.get("X-Secret")
    if secret != "csetytpNVal0mHJGX2xA7D5LomCe6UKH":
        return "Unauthorized", 401

    subprocess.Popen(["sh", "deploy.sh"])
    return "OK", 200

app.run(host="0.0.0.0", port=5173)
