# ✨ WhatsApp Automation System - v2.0# WhatsApp Automation (Baileys) — Safe Multi-Client Basic Project



**Professional WhatsApp automation platform** with secure authentication, multi-client support, and intelligent template distribution.**What this zip contains**

- Node.js project using **Baileys** (WhatsApp Web) to:

## 🎯 What You Get  - Let clients scan QR (session saved)

  - Send messages using **5 random templates**

✅ **Secure Authentication** - Register users, JWT tokens, session management    - Optionally attach a PDF per contact

✅ **WhatsApp via Baileys** - Direct WhatsApp connection using QR code    - Rate limiting (random delay between messages)

✅ **Multi-Client System** - Each user has isolated data    - Daily-send tracking (simple JSON store) to avoid over-send

✅ **Settings Management** - Control delays, rate limiting, blocking prevention  

✅ **Smart Template Distribution** - Randomly assign 3-4 templates to contacts  **Important legal & safety note**

✅ **Bulk Contact Import** - Upload CSV files with thousands of contacts  - This project uses reverse-engineered WhatsApp Web libraries (Baileys). Use responsibly and comply with WhatsApp terms. Excessive unsolicited bulk messaging can lead to account bans. This code includes safety measures but does not guarantee immunity.

✅ **Real-time Campaigns** - Send to thousands with automatic safety delays  

✅ **Complete Logging** - Track every message sent/failed  ## Requirements

- Node.js (>=16)

## ⚡ Quick Start (5 minutes)- npm

- Place PDF files inside the `pdfs/` folder (create it) matching `contacts.csv` pdf column values.

### 1. Start Backend

```bash## Install

cd backend```bash

npm install# unzip then:

node server-v2.jscd whatsapp_automation_baileys

```npm install

✅ Runs on: `http://localhost:3001````



### 2. Start Frontend## Usage

```bash1. Put PDFs you want to send in `pdfs/` (example files not included).

cd frontend2. Edit `contacts.csv` (columns: phone in international format without +, name, pdf filename or empty).

npm install3. Run:

npm start```bash

```node index.js

✅ Runs on: `http://localhost:3000````

4. A QR will appear in the console — scan with client's WhatsApp Web (or phone) to login.

### 3. Create Admin User5. The script will send messages one-by-one with random delays. Sessions are saved in `auth_info_multi.json`.

```bash

node setup.js## File summary

```- `index.js` — main program

**Login**: `admin` / `admin123`- `templates.json` — 5 message templates (uses {{name}} placeholder)

- `contacts.csv` — sample contact list

### 4. Connect WhatsApp- `stats.json` — simple tracking for daily counts

- Click **📱 WhatsApp** in sidebar- `pdfs/` — you must create and drop PDFs here

- Click **📲 Start WhatsApp Connection**

- Scan QR code with your phone## Customization

- Done! ✅- Adjust delay range in `index.js` (minDelayMs / maxDelayMs).

- Adjust `MAX_PER_NUMBER_PER_DAY` or add multiple sessions/numbers for rotation.

## 📚 Key Features

## Disclaimer

### 🔐 AuthenticationThis project is a starting point — test carefully with a small set of friendly numbers before scaling. I am not responsible for accounts blocked due to misuse.

- User registration/login

- JWT tokens (7-day expiry)Enjoy and message me if you want multi-number rotation, UI, or CSV upload features!

- Secure password hashing
- Per-user data isolation

### 📝 Templates
- Create multiple templates
- Use placeholders: `{{name}}`, `{{phone}}`
- Reuse across campaigns

### 👥 Contacts
- Add manually or CSV import
- Bulk upload thousands
- Auto-deduplication

### 🎯 Campaigns - Random Distribution ⭐
```
Select 3-4 templates → Enable Random Distribution
System randomly assigns templates to each contact

Example (10 contacts):
A→T2, B→T3, C→T1, D→T2, E→T3
F→T1, G→T2, H→T3, I→T1, J→T2

✓ Prevents spam detection
✓ Maintains variety
✓ Looks more authentic
```

### ⚙️ Settings (Safe Defaults)
- **Message Delay**: 5 seconds (prevents blocking)
- **Batch Size**: 100 (process limit)
- **Blocking Prevention**: ENABLED
- **Rate Limit**: 30 messages/minute

### 📊 Dashboard
- Real-time metrics
- Live progress tracking
- Connection status
- Activity logs

## 🛡️ Safety Features

**Default Configuration:**
- ✅ 5-second delays between messages
- ✅ 30 messages/minute rate limit
- ✅ Blocking prevention enabled
- ✅ Automatic retry on failure
- ✅ Session-based authentication

**Best Practices:**
- Start with small batches
- Use random templates
- Monitor logs regularly
- Respect WhatsApp Terms of Service
- Never send unsolicited/spam messages

## 📂 Architecture

```
Backend (Express.js)
├── API endpoints
├── JWT authentication
├── WhatsApp Baileys integration
└── SQLite database

Frontend (React)
├── Login page
├── Dashboard
├── Templates manager
├── Contacts manager
├── Campaigns (with random distribution)
├── Settings
├── WhatsApp connection
└── Logs viewer
```

## 🔧 Tech Stack

**Backend:**
- Node.js + Express
- SQLite3
- Baileys (WhatsApp API)
- JWT authentication
- Bcryptjs

**Frontend:**
- React 18
- Axios
- Chart.js

## 📖 Complete Documentation

See `COMPLETE_FEATURE_GUIDE.md` for:
- Detailed feature breakdown
- API endpoint documentation
- Database schema
- Advanced examples
- Troubleshooting guide

## ⚠️ Legal Notice

This project uses reverse-engineered WhatsApp Web libraries (Baileys). Use responsibly and comply with WhatsApp's Terms of Service. Excessive unsolicited bulk messaging can lead to account bans. This code includes safety measures but does not guarantee immunity.

## 🎉 Ready to Deploy!

Your system is **fully operational** with multi-user authentication, WhatsApp Baileys integration, and smart template distribution.

**Version**: 2.0 | **License**: MIT | **Updated**: December 2025
