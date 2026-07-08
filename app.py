"""
LEGACY-X: Digital Wisdom Twin
Flask application entry point — routes, file upload, chat API.
"""

import os
import json
import uuid
import datetime
from flask import Flask, render_template, request, jsonify, session, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from agents.rag_engine import RAGEngine
from agents.legacy_agent import LegacyAgent
from agents.analyst_agent import AnalystAgent
from agents.consensus_agent import ConsensusAgent
from agents.config import AGENT_INSTRUCTIONS

# ── Environment ────────────────────────────────────────────────────────────────
load_dotenv()

IBM_API_KEY    = os.getenv("IBM_API_KEY", "")
IBM_PROJECT_ID = os.getenv("IBM_PROJECT_ID", "")
IBM_URL        = os.getenv("IBM_URL", "https://us-south.ml.cloud.ibm.com")

# ── Flask Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "legacy-x-secret-key-change-in-production")

UPLOAD_FOLDER    = os.path.join(os.path.dirname(__file__), "uploads")
KNOWLEDGE_FOLDER = os.path.join(os.path.dirname(__file__), "knowledge")
ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

app.config["UPLOAD_FOLDER"]      = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(KNOWLEDGE_FOLDER, exist_ok=True)

# ── Agent / RAG Singletons ─────────────────────────────────────────────────────
rag_engine      = RAGEngine(upload_dir=UPLOAD_FOLDER, knowledge_dir=KNOWLEDGE_FOLDER,
                            api_key=IBM_API_KEY, project_id=IBM_PROJECT_ID, ibm_url=IBM_URL)
legacy_agent    = LegacyAgent(rag_engine, IBM_API_KEY, IBM_PROJECT_ID, IBM_URL)
analyst_agent   = AnalystAgent(rag_engine, IBM_API_KEY, IBM_PROJECT_ID, IBM_URL)
consensus_agent = ConsensusAgent(IBM_API_KEY, IBM_PROJECT_ID, IBM_URL)

# ── Helpers ────────────────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def get_uploaded_files():
    """Return metadata list for every file in the upload folder."""
    files = []
    for fname in os.listdir(UPLOAD_FOLDER):
        fpath = os.path.join(UPLOAD_FOLDER, fname)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            files.append({
                "name":     fname,
                "size":     round(stat.st_size / 1024, 1),
                "type":     fname.rsplit(".", 1)[-1].upper(),
                "uploaded": datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
            })
    return sorted(files, key=lambda x: x["uploaded"], reverse=True)

# ── Page Routes ────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    files = get_uploaded_files()
    stats = rag_engine.get_stats()
    return render_template("dashboard.html", files=files, stats=stats,
                           profile=AGENT_INSTRUCTIONS["profile"])

@app.route("/knowledge")
def knowledge():
    files = get_uploaded_files()
    stats = rag_engine.get_stats()
    return render_template("knowledge.html", files=files, stats=stats)

@app.route("/settings")
def settings():
    return render_template("settings.html", config=AGENT_INSTRUCTIONS)

# ── API: Chat ──────────────────────────────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    Accepts: { "question": str, "history": list }
    Returns: { legacy, analyst, consensus, workflow_steps, timestamp }
    """
    data     = request.get_json(force=True)
    question = data.get("question", "").strip()
    history  = data.get("history", [])

    if not question:
        return jsonify({"error": "Question cannot be empty."}), 400

    # Step 1 – retrieve relevant context from uploaded documents
    context_chunks = rag_engine.retrieve(question, top_k=5)
    context_text   = "\n\n".join(context_chunks) if context_chunks else ""

    # Step 2 – run agents
    legacy_response    = legacy_agent.respond(question, context_text, history)
    analyst_response   = analyst_agent.respond(question, context_text, history)
    consensus_response = consensus_agent.respond(question, legacy_response, analyst_response)

    timestamp = datetime.datetime.now().strftime("%H:%M")

    return jsonify({
        "legacy":        legacy_response,
        "analyst":       analyst_response,
        "consensus":     consensus_response,
        "context_used":  len(context_chunks),
        "timestamp":     timestamp,
        "workflow_steps": [
            "Question Received",
            f"Retrieved {len(context_chunks)} memory chunks",
            "Legacy Agent — analyzing wisdom",
            "Analyst Agent — logical evaluation",
            "Consensus Agent — synthesizing response",
            "Final Response Ready",
        ],
    })

# ── API: Upload ────────────────────────────────────────────────────────────────
@app.route("/api/upload", methods=["POST"])
def api_upload():
    """Upload a document to the knowledge base."""
    if "file" not in request.files:
        return jsonify({"error": "No file part in request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use PDF, TXT, or DOCX."}), 400

    filename = secure_filename(file.filename)
    base, ext = os.path.splitext(filename)
    unique    = f"{base}_{uuid.uuid4().hex[:6]}{ext}"
    filepath  = os.path.join(UPLOAD_FOLDER, unique)
    file.save(filepath)

    # Index the new document immediately
    rag_engine.index_file(filepath)

    return jsonify({
        "message":   f"'{filename}' uploaded and indexed successfully.",
        "stored_as": unique,
        "stats":     rag_engine.get_stats(),
    })

# ── API: Delete file ───────────────────────────────────────────────────────────
@app.route("/api/delete/<filename>", methods=["DELETE"])
def api_delete(filename):
    safe = secure_filename(filename)
    path = os.path.join(UPLOAD_FOLDER, safe)
    if not os.path.exists(path):
        return jsonify({"error": "File not found."}), 404

    os.remove(path)
    rag_engine.remove_file(safe)

    return jsonify({"message": f"'{safe}' removed from knowledge base.",
                    "stats":   rag_engine.get_stats()})

# ── API: Stats ─────────────────────────────────────────────────────────────────
@app.route("/api/stats")
def api_stats():
    return jsonify(rag_engine.get_stats())

# ── API: Files list ────────────────────────────────────────────────────────────
@app.route("/api/files")
def api_files():
    return jsonify(get_uploaded_files())

# ── Static uploads (preview) ───────────────────────────────────────────────────
@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
            host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
