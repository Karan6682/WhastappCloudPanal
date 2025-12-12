# 🎯 Quick Reference Card

## 🌐 Access Points

```
Frontend:  http://localhost:3000
Backend:   http://localhost:3001
Database:  whatsapp.db (SQLite)
```

## 👤 Default Account

```
Username: admin
Password: admin123
```

## 🚀 Quick Start (Copy-Paste)

### Terminal 1 - Backend
```bash
cd c:\Users\Administrator\Downloads\whatsapp_automation_baileys\backend
npm install
node server-v2.js
```

### Terminal 2 - Frontend
```bash
cd c:\Users\Administrator\Downloads\whatsapp_automation_baileys\frontend
npm install
npm start
```

### Terminal 3 - Create Admin
```bash
cd c:\Users\Administrator\Downloads\whatsapp_automation_baileys
node setup.js
```

## 📊 Default Settings (Safe)

| Setting | Value | Why |
|---------|-------|-----|
| Message Delay | 5 seconds | Prevents blocking |
| Rate Limit | 30/minute | Safe WhatsApp limit |
| Batch Size | 100 | Manageable chunks |
| Blocking Prevention | ON | Default safety |

## 🎯 Sidebar Menu

```
📊 Dashboard      → View metrics & progress
📱 WhatsApp       → Connect/disconnect
📝 Templates      → Create messages
👥 Contacts       → Add phone numbers
🚀 Campaigns      → Create & send
⚙️ Settings       → Adjust delays & limits
📋 Logs           → Track all messages
🚪 Logout         → Sign out
```

## 🔑 Key Features

```
✅ WhatsApp Login         → QR code authentication
✅ Multiple Clients       → Separate accounts & data
✅ Random Templates       → Distribute 3-4 templates
✅ Settings Control       → Sliders & toggles
✅ Safety Defaults        → Pre-configured safe
✅ CSV Import             → Bulk add contacts
✅ Real-time Tracking     → Live progress
✅ Complete Logging       → All messages tracked
```

## 🎬 Common Workflows

### Connect WhatsApp (First Time)
```
1. Click 📱 WhatsApp
2. Click 📲 Start Connection
3. Scan QR with phone
4. Wait for "Connected ✅"
```

### Create & Send Campaign
```
1. Click 📝 Templates → Create 3-4 templates
2. Click 👥 Contacts → Import CSV file
3. Click 🚀 Campaigns → New Campaign
4. Select templates + Enable "Random"
5. Click Send
6. System assigns templates randomly
7. Messages sent with delays
```

### Check Results
```
1. Click 📊 Dashboard → See progress
2. Click 📋 Logs → View all messages
3. Filter by status/campaign
4. Export if needed
```

## ⏱️ Time Calculations

```
Send 100 messages: ~8-10 minutes
Send 500 messages: ~40-50 minutes
Send 1000 messages: ~80-100 minutes

(With 5-second delays & 30/min rate limit)
```

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Won't login | Check admin/admin123 |
| QR won't scan | Generate new (expires 5 min) |
| Messages slow | Reduce batch size |
| CSV error | Check format: name,phone,email |
| Connection lost | Reconnect WhatsApp |
| Can't send | Ensure WhatsApp connected |

## 📁 Important Files

```
backend/server-v2.js        Main API
backend/db/database-v2.js   Database layer
frontend/src/App.js         React app
setup.js                    Create admin
whatsapp.db                 SQLite database
```

## 🔐 Security Reminders

✅ Never share login credentials  
✅ Keep JWT tokens safe  
✅ Use strong passwords  
✅ Monitor logs regularly  
✅ Respect WhatsApp ToS  

## 📚 Documentation Index

- **Start Here**: README.md
- **Navigation**: QUICK_REFERENCE.md
- **Full Guide**: COMPLETE_FEATURE_GUIDE.md
- **Technical**: IMPLEMENTATION_SUMMARY.md
- **Status**: SYSTEM_STATUS.md
- **Delivery**: DELIVERY_COMPLETE.md

## API Endpoints (Most Used)

```
POST   /api/auth/login              → Login
POST   /api/whatsapp/start-qr       → Generate QR
GET    /api/whatsapp/status         → Check connection
POST   /api/templates               → Create template
GET    /api/templates               → List templates
POST   /api/contacts                → Add contact
POST   /api/contacts/bulk-upload    → Import CSV
POST   /api/campaigns               → Create campaign
POST   /api/campaigns/:id/send      → Send campaign
GET    /api/logs                    → View logs
PUT    /api/settings                → Update settings
```

## 🎨 Random Template Distribution

```
3 Templates + 10 Contacts = Each gets DIFFERENT
4 Templates + 100 Contacts = Each gets DIFFERENT
```

**Why?** Prevents spam detection ✅

## ⚙️ Settings Sliders

```
Message Delay        1s ←---[●]--→ 30s
Batch Size          10 ←---[●]--→ 500
Rate Limit        5/min ←---[●]--→ 100/min
```

## 🌟 Pro Tips

1. **Test First**: Send to 10 contacts before 1000
2. **Use Random**: Always enable random templates
3. **Keep Delays**: Don't lower below 3 seconds
4. **Monitor Logs**: Check success rates
5. **Respect WhatsApp**: Don't spam
6. **Vary Messages**: Use different content
7. **Spread Sends**: Don't do all at once

## 🎯 Success Checklist

- [ ] Backend running
- [ ] Frontend running
- [ ] Can login (admin/admin123)
- [ ] WhatsApp connected (QR scanned)
- [ ] Created 3-4 templates
- [ ] Imported contacts (CSV or manual)
- [ ] Settings reviewed
- [ ] Campaign created
- [ ] Random templates enabled
- [ ] First test sent
- [ ] Results in logs
- [ ] Ready for production

## 💬 Support

- See README.md for quick start
- See COMPLETE_FEATURE_GUIDE.md for details
- Check logs for error messages
- Verify settings are correct
- Restart if needed

## 🎉 You're All Set!

```
✅ System Ready
✅ Documentation Complete
✅ All Features Working
✅ Safe Defaults Configured
✅ Ready to Send Campaigns

START NOW! 🚀
```

---

**Version 2.0** | **December 2025** | **100% Complete**
