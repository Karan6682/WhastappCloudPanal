# Quick Start Guide - WhatsApp Automation Dashboard

## 🚀 Get Started in 5 Minutes

### Prerequisites
- ✅ Node.js v16+ installed
- ✅ npm v8+ installed
- ✅ Two terminal windows

---

## Step 1️⃣: Clone/Extract Project

Extract the project folder to your desired location:
```bash
cd whatsapp_automation_baileys
```

---

## Step 2️⃣: Install Backend Dependencies

**Terminal 1:**
```bash
cd backend
npm install
```

This will install:
- ✅ Express.js (server framework)
- ✅ SQLite3 (database)
- ✅ Multer (file upload)
- ✅ CORS (cross-origin requests)
- ✅ UUID (unique identifiers)

**Expected output:**
```
added 50 packages in 12s
```

---

## Step 3️⃣: Install Frontend Dependencies

**Terminal 2:**
```bash
cd frontend
npm install
```

This will install:
- ✅ React (UI library)
- ✅ React Router (navigation)
- ✅ Axios (HTTP client)
- ✅ Chart.js (charts & graphs)

**Expected output:**
```
added 1500+ packages in 2-3 minutes
```

---

## Step 4️⃣: Start Backend Server

**Terminal 1** (in backend folder):
```bash
npm start
```

**Expected output:**
```
✅ WhatsApp Automation Backend running on http://localhost:3001
📊 Dashboard: http://localhost:3000
```

✅ Backend is ready!

---

## Step 5️⃣: Start Frontend Server

**Terminal 2** (in frontend folder):
```bash
npm start
```

**Expected output:**
```
Compiled successfully!
On Your Network: http://192.168.x.x:3000

Click on any file in the terminal window to open it in your editor
Press q to quit
```

✅ A browser window will open automatically!

---

## ✨ You're All Set!

### Dashboard URL
```
http://localhost:3000
```

### What You Can Do Now

1. **📊 Dashboard** - View real-time statistics and performance metrics
2. **👥 Contacts** - Add and manage contact lists
   - Add contacts manually
   - Bulk upload CSV file
3. **📝 Templates** - Create message templates
   - Use {{name}} placeholder for personalization
4. **🚀 Campaigns** - Create and manage WhatsApp campaigns
   - Select template
   - Choose contacts
   - Monitor progress
5. **📋 Logs** - Track all activities
   - Filter by type (success, error, warning)
   - Pagination support

---

## 📝 Sample CSV Format (for Bulk Upload)

Create a file named `contacts.csv`:

```csv
phone,name,email
+11234567890,John Doe,john@example.com
+11234567891,Jane Smith,jane@example.com
+11234567892,Bob Wilson,bob@example.com
```

Then in the **Contacts** page, click **📥 Bulk Upload CSV** and select your file.

---

## 🛑 Stopping the Servers

To stop either server:
- **Press `Ctrl + C`** in the terminal

To stop both:
- Stop Terminal 1 (Backend)
- Stop Terminal 2 (Frontend)

---

## 🐛 Troubleshooting

### Issue: "Port 3001 is already in use"

**Solution:**
```bash
# Find process using port 3001
netstat -an | grep 3001

# Kill it (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
```

### Issue: "Cannot find module 'xyz'"

**Solution:**
```bash
# Clear node_modules and reinstall
rm -r node_modules package-lock.json
npm install
```

### Issue: "Frontend won't connect to backend"

**Solution:**
1. Ensure backend is running on port 3001
2. Check browser console for CORS errors
3. Try refreshing the page (Ctrl + R)

### Issue: "npm command not found"

**Solution:**
- Reinstall Node.js from https://nodejs.org/
- Restart your terminal

---

## 📚 Project Structure

```
whatsapp_automation_baileys/
├── backend/
│   ├── db/database.js           ← Database logic
│   ├── server.js                ← API server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/          ← UI components
│   │   ├── pages/               ← Main pages
│   │   └── services/api.js      ← API calls
│   └── package.json
├── index.js                     ← Original WhatsApp sender
├── INSTALLATION_GUIDE.md        ← Detailed setup
└── API_DOCUMENTATION.md         ← API reference
```

---

## 🔗 Useful Links

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health

---

## 📖 Next Steps

1. Read `INSTALLATION_GUIDE.md` for detailed setup
2. Check `API_DOCUMENTATION.md` for API endpoints
3. Create your first template and campaign
4. Monitor statistics in real-time

---

## 💡 Pro Tips

✅ **Bulk Upload CSV** - Upload many contacts at once
✅ **Use Placeholders** - {{name}} in templates for personalization
✅ **Monitor Logs** - Check activity logs for debugging
✅ **Check Health** - Visit http://localhost:3001/api/health

---

## ⚠️ Important Notes

1. **This uses reverse-engineered WhatsApp Web APIs** - Use responsibly
2. **Respect WhatsApp's Terms of Service**
3. **Test with small contact lists first**
4. **Always get proper consent from recipients**
5. **Bulk messaging can result in account suspension**

---

## 🎯 Common Tasks

### Add a Contact
1. Go to **Contacts** page
2. Click **➕ Add Contact**
3. Enter phone, name, email
4. Click **Save**

### Create a Template
1. Go to **Templates** page
2. Click **➕ New Template**
3. Enter title and message
4. Use {{name}} for personalization
5. Click **Save Template**

### Create a Campaign
1. Go to **Campaigns** page
2. Click **➕ New Campaign**
3. Enter campaign name
4. Select a template
5. Choose contacts
6. Click **Create Campaign**

### View Statistics
1. Go to **Dashboard** page
2. See real-time metrics
3. View recent campaigns table

---

## 🆘 Need Help?

1. Check `INSTALLATION_GUIDE.md`
2. Review `API_DOCUMENTATION.md`
3. Check browser console for errors (F12)
4. Check terminal for error messages
5. Restart both servers

---

**Enjoy your professional WhatsApp Automation Dashboard! 🎉**

Questions? Check the documentation files!
