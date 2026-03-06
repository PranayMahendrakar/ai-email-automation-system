# 📬 AI Email Automation System

> A smart, AI-powered email manager with auto-reply, summarization, importance detection, draft generation, inbox categorization, and Gmail API integration.

[![GitHub Pages Live](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://pranaymahendr.github.io/ai-email-automation-system/)
[![Python](https://img.shields.io/badge/Python-3.9%2B-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey)](https://flask.palletsprojects.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-purple)](https://openai.com)
[![Gmail API](https://img.shields.io/badge/Gmail-API-red)](https://developers.google.com/gmail/api)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🚀 Purpose

The AI Email Automation System transforms how you manage email by leveraging artificial intelligence to handle the most time-consuming aspects of inbox management. Whether you're drowning in work emails, newsletters, or client requests — the system intelligently reads, understands, categorizes, and acts on your behalf.

---

## ✨ Core Features

### 📥 Smart Inbox Management
- **Multi-view Dashboard**: Inbox, Important, Drafts, Sent, Categories, Analytics, Settings
- **Real-time search** across all emails with instant results
- **Bulk operations**: Select all, bulk auto-reply, bulk summarize
- **Category filtering**: Work, Personal, Newsletter, Finance, Social, Spam

### 🤖 Auto Reply
- **One-click auto-reply** to any email using AI-generated responses
- **Bulk auto-reply**: Reply to multiple selected emails simultaneously
- **Three reply tones**: Professional, Friendly, Formal
- **Context-aware replies**: Detects meetings, approvals, questions, and deadlines
- **Gmail API integration**: Sends replies directly from your Gmail account

### 📋 Email Summarization
- **Instant summaries** with key points extracted from email body
- **Auto-summarize**: Automatically summarizes emails when you open them
- **Word count & read time** estimation
- **Urgency detection**: Flags time-sensitive content

### ⭐ Importance Detection
- **AI-powered importance scoring** (0–100% confidence)
- **Three levels**: 🔴 High, 🟡 Medium, 🟢 Low
- **Signal detection**: Identifies urgent words, authority senders, deadlines
- **Visual indicators**: Color-coded badges and unread dots
- **Auto-flagging**: Important emails marked automatically on load

### ✍️ Draft Replies
- **AI-generated draft replies** with full editing capability
- **Context-sensitive content**: Meeting scheduling, approval requests, file reviews
- **Email improvement**: AI rewrites drafts for clarity and professionalism
- **Save as draft** or send directly
- **In-line editing** with textarea

### 🗂️ Inbox Categorization
- **6 categories**: Work 💼, Personal 👤, Newsletter 📰, Finance 💰, Social 🌐, Spam 🚫
- **Rule-based categorization** using keyword matching
- **Visual category cards** with email counts
- **Quick filter**: Click category to filter inbox instantly
- **Category analytics**: See distribution of email types

### 📊 AI Analytics Dashboard
- **Total emails & unread count** with progress bars
- **Important email tracker**
- **AI activity stats**: Processed, auto-replied, summarized, categorized
- **7-day email volume chart**
- **Category breakdown** with visual bars

---

## 🔗 Gmail API Integration (Bonus)

### Authentication
- Full **OAuth2 flow** with Google Identity Services
- **Token persistence** via pickle storage
- **Auto-refresh** expired credentials
- Scopes: `readonly`, `send`, `modify`, `labels`

### Available Operations
| Operation | Endpoint | Description |
|-----------|----------|-------------|
| Connect | POST /api/gmail/connect | Authenticate with Gmail |
| Fetch Emails | GET /api/emails | Get inbox messages |
| Search | GET /api/emails/search?q= | Gmail query syntax |
| Send Email | POST /api/emails/send | Send new email |
| Send Reply | POST /api/emails/reply | Reply to thread |
| Mark Read | POST /api/emails/{id}/read | Mark as read |
| Archive | POST /api/emails/{id}/archive | Archive email |
| Add Label | POST /api/emails/{id}/label | Add Gmail label |
| Auto-Reply | POST /api/ai/auto-reply | AI reply + send |

### Push Notifications
- **Gmail Pub/Sub webhook** for real-time new email processing
- Endpoint: `POST /api/webhook/gmail`
- Automatic AI analysis of incoming emails

---

## 🤖 AI Engine

### Dual-Mode Processing
1. **OpenAI GPT-4** (when API key provided): Full semantic understanding, context-aware replies, nuanced importance scoring
2. **Rule-Based Fallback** (default): Fast keyword matching, template replies, pattern detection — works without any API key

### Processing Pipeline
```
Email Input → Importance Detection → Categorization → Summarization → Sentiment Analysis → Reply Generation → Suggested Actions
```

### AI Capabilities
| Feature | Rule-Based | OpenAI GPT-4 |
|---------|-----------|--------------|
| Summarization | ✅ Extractive | ✅ Abstractive |
| Importance | ✅ Keyword-based | ✅ Semantic |
| Categorization | ✅ Pattern matching | ✅ Context-aware |
| Reply generation | ✅ Templates | ✅ Custom drafts |
| Sentiment analysis | ✅ Word scoring | ✅ Deep understanding |
| Email improvement | ✅ Rule rewrites | ✅ Full rewrite |

---

## 🗂️ Project Structure

```
ai-email-automation-system/
├── index.html          # Frontend dashboard (GitHub Pages compatible)
├── styles.css          # Full UI design system (dark theme)
├── app.js              # Frontend AI engine + all UI logic
├── app.py              # Flask REST API server
├── email_processor.py  # Core AI processing pipeline
├── gmail_api.py        # Gmail API client + webhook handler
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.9+
- Gmail Account
- Google Cloud Console project
- (Optional) OpenAI API key

### 1. Clone Repository
```bash
git clone https://github.com/PranayMahendrakar/ai-email-automation-system.git
cd ai-email-automation-system
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Gmail API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: **AI Email Automation**
3. Enable **Gmail API** in API Library
4. Create **OAuth 2.0 credentials** → Web Application
5. Add `http://localhost:5000` to authorized origins
6. Download `credentials.json` to project root

### 4. Configure Environment
Create a `.env` file:
```env
OPENAI_API_KEY=sk-your-openai-key-here
DEFAULT_REPLY_TONE=professional
FLASK_DEBUG=false
PORT=5000
```

### 5. Run the Server
```bash
python app.py
```

Open http://localhost:5000 in your browser.

### 6. Connect Gmail
- Navigate to **⚙️ Settings** in the app
- Click **🔗 Connect Gmail Account**
- Complete the OAuth flow in the popup
- Start using real Gmail integration!

---

## 🌐 GitHub Pages (Frontend Demo)

The frontend runs entirely in the browser — **no backend required** for the demo.

**Live Demo**: https://pranaymahendr.github.io/ai-email-automation-system/

Features in demo mode:
- All 10 mock emails with realistic data
- Full AI simulation with visual feedback
- All UI features: compose, categories, analytics, settings
- No API keys needed

### Enable GitHub Pages
1. Go to **Settings** → **Pages**
2. Source: **Deploy from branch** → `main` → `/ (root)`
3. Save — your site deploys in ~2 minutes

---

## 📡 REST API Reference

### AI Endpoints
```http
POST /api/ai/analyze         # Full email analysis
POST /api/ai/analyze/batch   # Process multiple emails
POST /api/ai/summarize       # Summarize email
POST /api/ai/draft-reply     # Generate reply draft
POST /api/ai/auto-reply      # Auto-reply + send via Gmail
POST /api/ai/importance      # Detect importance level
POST /api/ai/categorize      # Categorize email
POST /api/ai/improve         # Improve email draft
POST /api/ai/generate        # Generate email from context
```

### Example Request
```bash
curl -X POST http://localhost:5000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "email": {
      "id": "001",
      "from": "boss@company.com",
      "subject": "URGENT: Approval needed by EOD",
      "body": "Please approve the Q4 budget ASAP. Deadline is today."
    }
  }'
```

### Example Response
```json
{
  "success": true,
  "analysis": {
    "importance": "high",
    "importance_score": 0.89,
    "category": "work",
    "summary": "Urgent budget approval request from manager...",
    "key_points": ["• Deadline is today", "• Q4 budget needs approval"],
    "draft_reply": "Dear Manager, Thank you for your email...",
    "sentiment": "urgent",
    "requires_response": true,
    "suggested_actions": ["Reply to sender", "Mark as important", "Set deadline reminder"]
  }
}
```

---

## 🎨 UI Components

| Component | Description |
|-----------|-------------|
| **Sidebar** | Navigation with live email counters |
| **Top Bar** | Search, compose, Gmail sync, AI analyze all |
| **Email List** | Sortable, filterable email cards |
| **Detail Panel** | Full email view with AI action buttons |
| **Compose Modal** | Rich editor with AI compose tools |
| **AI Overlay** | Processing animation during AI operations |
| **Toast System** | Success/error/AI notification toasts |
| **Analytics Cards** | Charts and statistics |

---

## 🔧 Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Reply Tone | Professional | professional / friendly / formal |
| Auto-Reply | Enabled | Auto-reply to incoming emails |
| Auto-Summarize | Enabled | Summarize on email open |
| Auto-Categories | Enabled | Auto-categorize inbox |
| Importance Detection | Enabled | Flag important emails |
| OpenAI Key | — | For GPT-4 powered features |

---

## 🏗️ Architecture

```
Browser (GitHub Pages)
    ↕ HTML/CSS/JS (Frontend)
    ↕ REST API (Flask)
        ├── EmailProcessor (AI Pipeline)
        │   ├── RuleBasedAI (fallback)
        │   └── OpenAIProcessor (GPT-4)
        └── GmailClient (Gmail API)
            └── GmailWebhook (Pub/Sub)
```

---

## 📦 Technologies

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS, CSS3, HTML5 |
| Backend | Python 3.9, Flask 3.0 |
| AI | OpenAI GPT-4, Rule-based NLP |
| Email API | Google Gmail API v1 |
| Auth | OAuth2 (Google Identity) |
| Deployment | GitHub Pages (frontend), Any WSGI host |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Pranay Mahendrakar**

Built with ❤️ using AI-powered automation

---

*Part of the AI Tools Portfolio — Building intelligent automation solutions*
