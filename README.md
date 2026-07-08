# LEGACY-X: Digital Wisdom Twin

<div align="center">
  <img src="static/images/logo.svg" alt="LEGACY-X Logo" width="120"/>
  <h3>Preserve Wisdom Beyond a Lifetime</h3>
  <em>"People may leave the world. Their wisdom shouldn't."</em>
  <br/><br/>
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask"/>
  <img src="https://img.shields.io/badge/IBM%20Granite-watsonx.ai-1261FE?style=flat-square&logo=ibm"/>
  <img src="https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=flat-square&logo=bootstrap"/>
  <img src="https://img.shields.io/badge/RAG-Enabled-success?style=flat-square"/>
</div>

---

## Project Description

**LEGACY-X** is a next-generation **Agentic AI platform** that preserves a person's wisdom, experiences, values, life lessons, and decision-making style as a **Digital Wisdom Twin**. Unlike traditional AI assistants that only answer questions using general knowledge, LEGACY-X creates an intelligent representation of *how a specific person thinks, reasons, and approaches life decisions*.

Users can upload documents (PDFs, TXT files, DOCX journals, personal stories, letters) to build a personal knowledge base. Three specialized AI agents — **Legacy Agent**, **Analyst Agent**, and **Consensus Agent** — collaborate using **Retrieval-Augmented Generation (RAG)** powered by **IBM Granite** models on **IBM watsonx.ai** to deliver grounded, hallucination-free wisdom.

---

## Features

| Feature | Description |
|---------|-------------|
| 🧠 Digital Wisdom Twin | Preserved personality, values, voice of any individual |
| 🤖 Multi-Agent Architecture | Legacy + Analyst + Consensus agents working together |
| 📄 RAG Pipeline | TF-IDF retrieval ensures grounded, factual responses |
| 🔬 IBM Granite | Enterprise AI generation via IBM watsonx.ai |
| 📁 Document Upload | PDF, TXT, DOCX — journals, letters, biographies |
| 💬 Chat Interface | ChatGPT-style streaming UI with history |
| 🌑 Dark Mode | IBM-inspired premium dark + light theme |
| 📊 Knowledge Dashboard | Document stats, timeline, memory visualization |
| ⚙️ Configuration | All agent behaviour in one `config.py` file |
| 📤 Export Chat | Download conversation as `.txt` |

---

## Architecture

```
User Question
     │
     ▼
RAG Engine (TF-IDF Retrieval)
     │
     ├─► Legacy Agent    → wisdom, first-person voice, emotional depth
     │
     ├─► Analyst Agent   → benefits, risks, alternatives, reasoning
     │
     └─► Consensus Agent → synthesize → final balanced recommendation
```

**IBM Granite** (`ibm/granite-13b-instruct-v2`) handles all language generation via `ibm-watsonx-ai` SDK.

---

## Folder Structure

```
LEGACY-X/
├── app.py                    # Flask application & API routes
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template
├── README.md
│
├── agents/
│   ├── __init__.py
│   ├── config.py             # ⚙️ ALL agent settings live here
│   ├── rag_engine.py         # Document ingestion, chunking, TF-IDF, IBM calls
│   ├── legacy_agent.py       # Wisdom Twin agent
│   ├── analyst_agent.py      # Logical analysis agent
│   └── consensus_agent.py    # Synthesis & recommendation agent
│
├── templates/
│   ├── base.html             # Navbar, footer, shared layout
│   ├── index.html            # Landing page with particle hero
│   ├── dashboard.html        # 3-panel chat dashboard
│   ├── knowledge.html        # File upload & management
│   └── settings.html         # Configuration viewer
│
├── static/
│   ├── css/style.css         # Premium dark theme (glassmorphism)
│   ├── js/main.js            # Theme toggle, toast, utilities
│   ├── js/dashboard.js       # Chat, workflow, agent cards
│   ├── js/knowledge.js       # Upload, delete, drag-drop
│   ├── js/particles.js       # Hero particle animation
│   └── images/logo.svg       # SVG brain+tree logo
│
├── uploads/                  # Uploaded documents (gitignored)
└── knowledge/                # RAG index cache (gitignored)
```

---

## Installation

### Prerequisites
- Python 3.10+
- pip
- An [IBM Cloud account](https://cloud.ibm.com/) with watsonx.ai access

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/legacy-x.git
cd legacy-x

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and fill in your IBM credentials

# 5. Run the application
python app.py
```

Open your browser at **http://localhost:5000**

---

## IBM Cloud Setup

1. **Create an IBM Cloud account**: https://cloud.ibm.com/registration
2. **Provision IBM watsonx.ai**:
   - Go to IBM Cloud Catalog → search "Watson Studio"
   - Create a project in Watson Studio
   - Note your **Project ID**
3. **Generate an API Key**:
   - IBM Cloud → Manage → Access → API Keys → Create
4. **Find your service URL**:
   - Default: `https://us-south.ml.cloud.ibm.com`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
IBM_API_KEY=your_ibm_api_key_here
IBM_PROJECT_ID=your_ibm_project_id_here
IBM_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=change_this_to_a_long_random_string
FLASK_DEBUG=false
PORT=5000
```

> ⚠️ **Never commit `.env` to version control.**

---

## How to Run

```bash
# Development
python app.py

# Production (with Gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

## Customizing Agent Behaviour

All agent settings are in **`agents/config.py`** — no need to touch application logic:

```python
AGENT_INSTRUCTIONS = {
    "profile": { "name": "...", "profession": "..." },
    "legacy":  { "tone": "warm", "response_length": "medium", ... },
    "analyst": { "tone": "objective", "creativity": 0.3, ... },
    "consensus": { "tone": "balanced", ... },
    "model":   { "model_id": "ibm/granite-13b-instruct-v2", ... },
    "rag":     { "chunk_size": 500, "top_k": 5, ... },
}
```

---

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

```bash
docker build -t legacy-x .
docker run -p 5000:5000 --env-file .env legacy-x
```

### IBM Code Engine / Cloud Foundry

```bash
ibmcloud cf push legacy-x --buildpack python_buildpack
```

---

## Future Scope

- 🔊 **Voice Interface** — Web Speech API for voice input/output
- 🌐 **Multi-language Support** — Multilingual IBM Granite models
- 🧬 **Semantic Embeddings** — Replace TF-IDF with vector embeddings (ChromaDB/Pinecone)
- 👥 **Multiple Profiles** — Switch between different Digital Wisdom Twins
- 📱 **Mobile App** — React Native wrapper
- 🔐 **User Authentication** — Multi-user support with Flask-Login
- 📊 **Analytics Dashboard** — Question trends, usage statistics
- 🔗 **API Integration** — REST API for external applications
- 🗄️ **Persistent Storage** — PostgreSQL for conversations + profiles
- ☁️ **IBM Cloud Object Storage** — Scalable document storage

---

## Screenshots

| Page | Description |
|------|-------------|
| `Home` | Animated hero with particle system |
| `Dashboard` | 3-panel: Profile · Chat · Agent Cards |
| `Knowledge` | Drag-drop upload, file management |
| `Settings` | Agent configuration viewer |

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

<div align="center">
  Powered by <strong>IBM Granite</strong> · <strong>IBM watsonx.ai</strong> · <strong>Flask</strong> · <strong>RAG</strong>
  <br/>
  Built with ❤️ for preserving human wisdom
</div>
