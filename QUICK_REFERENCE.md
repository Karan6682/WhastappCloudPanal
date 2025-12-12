# 🚀 Quick Reference Guide

## Start Here

### 1️⃣ Start Backend (Terminal 1)
```bash
cd backend
npm install
node server-v2.js
```

### 2️⃣ Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm start
```

### 3️⃣ Create Admin User (Terminal 3)
```bash
node setup.js
```

### 4️⃣ Login
- **URL**: http://localhost:3000
- **Username**: admin
- **Password**: admin123

---

## Menu Navigation

```
📱 WhatsApp Connection
    ↓
    Generate QR → Scan with phone → Connected ✅

📊 Dashboard
    ↓
    View metrics and live progress

📝 Templates
    ↓
    Create message templates with {{placeholders}}

👥 Contacts
    ↓
    Add contacts manually or upload CSV

🚀 Campaigns
    ↓
    Create campaigns with random template distribution

⚙️ Settings
    ↓
    Control delays, rate limits, blocking prevention

📋 Logs
    ↓
    View all message send history

🚪 Logout
    ↓
    Sign out of account
```

---

## Key Features

### 📱 WhatsApp Connection
```
Steps:
1. Go to WhatsApp page
2. Click "Start Connection"
3. Scan QR code with phone
4. Status shows "Connected" ✅
```

### 📝 Create Template
```
1. Go to Templates
2. Click "New Template"
3. Enter name and content
4. Use {{name}}, {{phone}} etc.
5. Save

Example:
"Hi {{name}}, special offer!"
```

### 👥 Add Contacts
```
Option A: Manual
1. Click "Add Contact"
2. Enter name and phone
3. Save

Option B: Bulk (CSV)
1. Click "Upload CSV"
2. Format: name,phone,email
3. Upload file
4. Done!
```

### 🎯 Create Campaign (with Random Distribution)
```
1. Go to Campaigns
2. Click "Create Campaign"
3. Enter campaign name
4. Select 3-4 templates ⭐
5. Toggle "Use Random Templates" ON
6. Create
7. Click Send
8. System randomly assigns templates!
```

### ⚙️ Adjust Settings
```
Message Delay: 1-30 seconds
    ├─ Default: 5 sec
    └─ Lower = Faster, Higher = Safer

Batch Size: 10-500 contacts
    ├─ Default: 100
    └─ Lower = Safer, Higher = Faster

Blocking Prevention: ON/OFF
    ├─ Default: ON ✅
    └─ Always recommended ON

Rate Limit: 5-100 /minute
    ├─ Default: 30/minute
    └─ Lower = Safer, Higher = Faster
```

---

## Default Settings (SAFE)

```
✅ Message Delay:        5 seconds
✅ Blocking Prevention:  ENABLED
✅ Rate Limit:           30 messages/minute
✅ Batch Size:           100 contacts
✅ JWT Token:            Valid 7 days
```

---

## How Random Templates Work

```
You have:
- 10 contacts: A, B, C, D, E, F, G, H, I, J
- 3 templates: T1, T2, T3

System:
1. Picks random template for each contact
2. A gets T2, B gets T3, C gets T1, etc.
3. Sends different message to each
4. With 5-second delays

Result:
✅ Looks natural
✅ Prevents spam detection
✅ No number gets same message
✅ Professional appearance
```

---

## CSV Format for Bulk Import

### Correct Format:
```csv
name,phone,email
Ahmed Khan,923001234567,ahmed@example.com
Fatima Ali,923009876543,fatima@example.com
Hassan Ibrahim,923005555555,hassan@example.com
```

### Important:
- Must have header row
- Phone in format: 923001234567 (no +)
- One contact per line
- Max 50MB file size

---

## Complete Send Workflow

```
STEP 1: Templates
└─ Create 3-4 message templates

STEP 2: Contacts
└─ Import CSV with phone numbers

STEP 3: Settings
└─ Verify safe defaults (already set)

STEP 4: Campaign
└─ Create campaign with templates
└─ Enable random distribution

STEP 5: Send
└─ Click Send Campaign
└─ System sends messages with delays

STEP 6: Monitor
└─ Watch dashboard progress
└─ Check logs for results

STEP 7: Analyze
└─ View success/failure rates
└─ Download logs if needed
```

---

## Time Calculation

```
Formula: (Contacts × Delay) / Rate Limit

Example:
- 500 contacts
- 5 second delay
- 30 messages/minute limit

Time = (500 × 5) / (30/60)
     = 2500 / 0.5
     = ~28 minutes ✅

To make it faster:
- Reduce delay (3 seconds = 17 min)
- Increase rate limit (60/min = 14 min)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| QR won't scan | Generate new, expires in 5 min |
| Messages slow | Lower batch size |
| Messages failing | Check phone numbers |
| Won't login | Check username/password |
| CSV error | Check format (name,phone,email) |
| Campaign stuck | Restart backend |

---

## Security Tips

✅ Use strong password  
✅ Keep JWT token safe  
✅ Don't share login  
✅ Logout when done  
✅ Monitor logs  
✅ Don't disable blocking prevention  
✅ Test before large campaigns  

---

## Support Resources

- **Quick Start**: README.md
- **Full Guide**: COMPLETE_FEATURE_GUIDE.md
- **Implementation**: IMPLEMENTATION_SUMMARY.md
- **API Docs**: COMPLETE_FEATURE_GUIDE.md → Technical Details

---

## Common Commands

```bash
# Create admin user
node setup.js

# Start backend
cd backend && node server-v2.js

# Start frontend
cd frontend && npm start

# Check node version
node --version

# Check npm version
npm --version

# Kill process on port 3001
netstat -ano | findstr :3001

# Kill process on port 3000
netstat -ano | findstr :3000
```

---

## Contact Information

For detailed documentation, see:
- COMPLETE_FEATURE_GUIDE.md
- IMPLEMENTATION_SUMMARY.md
- README.md

---

**Version 2.0** | **Ready to Use** | **December 2025** 🎉
