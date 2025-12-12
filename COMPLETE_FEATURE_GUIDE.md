# WhatsApp Automation - Complete Feature Guide

## 🎯 Quick Start

### 1. **First Time Setup**
```bash
cd c:\Users\Administrator\Downloads\whatsapp_automation_baileys
node setup.js
```

This creates an admin account:
- **Username**: `admin`
- **Password**: `admin123`

### 2. **Access Dashboard**
Open browser and go to: `http://localhost:3000`

---

## 🔐 Authentication System

### User Management
- ✅ Register new user accounts with username/password
- ✅ Secure JWT token-based authentication
- ✅ Automatic session management
- ✅ Logout functionality
- ✅ User data isolation (each user sees only their own data)

### Features
- **Registration**: Create new admin accounts (for team members)
- **Login**: Secure login with JWT tokens (valid for 7 days)
- **Session**: Auto-logout on browser close
- **Security**: Password hashing with bcryptjs, no plain text storage

---

## 📱 WhatsApp Connection

### QR Code Authentication
1. Go to **WhatsApp** menu in sidebar
2. Click **📲 Start WhatsApp Connection**
3. Scan the generated QR code with your WhatsApp phone
4. System automatically connects to your account
5. View connection status in real-time

### Features
- ✅ QR code expires in 5 minutes
- ✅ Real-time connection status updates
- ✅ Automatic session storage
- ✅ One-click disconnect
- ✅ Multi-client support (each user has separate connection)

---

## ⚙️ Settings Menu

### Message Delay (Prevention of Blocking)
**Path**: Settings → Message Delay
- **Range**: 1-30 seconds
- **Default**: 5 seconds
- **What it does**: Controls time between sending messages
- **Recommendations**:
  - 3-5s: Normal sending
  - 5-10s: Safe mode
  - 10+s: Maximum protection

### Batch Size
**Path**: Settings → Batch Size
- **Range**: 10-500 contacts
- **Default**: 100
- **What it does**: Maximum contacts per campaign
- **Tips**:
  - Smaller = Safer
  - Larger = Faster
  - Balance for best results

### Number Blocking Prevention
**Path**: Settings → Prevent Number Blocking
- **Default**: ENABLED ✅
- **What it does**:
  - Enforces message delays
  - Limits rate per minute
  - Distributes loads evenly
- **Always Recommended**: ON

### Rate Limiting
**Path**: Settings → Rate Limit
- **Range**: 5-100 messages/minute
- **Default**: 30/minute
- **Guidelines**:
  - Low (5-15): Maximum safety
  - Medium (15-30): Balanced
  - High (30+): Faster sending

### Saving Settings
- All changes auto-save with confirmation
- Settings persist per user account
- Reset to defaults anytime

---

## 📧 Templates Management

### Create Templates
**Path**: Templates → New Template

Features:
- ✅ Rich text content
- ✅ Dynamic placeholders: `{{name}}`, `{{phone}}`, etc.
- ✅ Preview before sending
- ✅ Save unlimited templates
- ✅ Edit and delete anytime

### Example Templates
```
Template 1: "Hi {{name}}, We have a special offer for you! Reply with YES"
Template 2: "{{name}}, Click here for exclusive deals: link.com"
Template 3: "Hello {{name}}, This is {{company}} calling"
```

### Template Usage
- Use in single campaigns
- Use in random distribution campaigns
- Reuse across multiple campaigns

---

## 👥 Contacts Management

### Add Contacts
**Methods**:
1. **Manual Entry**: Add one by one with name and phone
2. **Bulk Import**: Upload CSV file with headers: `name,phone,email`

### CSV Format Example
```csv
name,phone,email
Ahmed Khan,923001234567,ahmed@example.com
Fatima Ali,923009876543,fatima@example.com
Hassan Ibrahim,923005555555,hassan@example.com
```

### Contact Organization
- Automatic deduplication
- Search and filter by name/phone
- Delete single or bulk contacts
- View total contact count

---

## 🚀 Campaigns Management

### Campaign Types

#### 1. **Single Template Campaign**
- Send same message to all contacts
- Simple and quick
- Best for announcements

#### 2. **Random Template Distribution** ⭐ NEW
- Randomly assign different templates to contacts
- Prevents spam detection
- Maintains variety in messaging
- **How it works**:
  ```
  Contacts (10): A, B, C, D, E, F, G, H, I, J
  Templates (3): T1, T2, T3
  
  Automatic Distribution:
  - A → T2, B → T3, C → T1, D → T2, E → T3
  - F → T1, G → T2, H → T3, I → T1, J → T2
  ```

### Creating Campaigns
1. Go to **Campaigns** menu
2. Click **Create Campaign**
3. Enter campaign name
4. Select templates:
   - For random: Select 3-4 different templates
   - For single: Select 1 template
5. Select toggle: "Use Random Templates"
6. Click Create

### Sending Campaign
1. Open campaign
2. Click **Send**
3. Select contacts (or all)
4. Click **Start Sending**
5. Monitor progress in real-time
6. Check logs for details

### Smart Features
- ✅ Automatic delays between messages
- ✅ Rate limiting prevents blocking
- ✅ Batch processing for large lists
- ✅ Automatic retry on failure
- ✅ Real-time progress tracking

---

## 📊 Dashboard

### Key Metrics
- Total templates created
- Total contacts added
- Campaigns sent
- Messages successfully sent
- Failed/blocked messages
- Average send time

### Real-Time Updates
- Live campaign progress
- Connection status
- Recent activity logs
- System health check

---

## 📋 Logs & Monitoring

### Log Details
Each log entry contains:
- Phone number sent to
- Message status (sent/failed)
- Timestamp
- Campaign ID
- Error details (if any)

### Filtering
- By campaign
- By status (sent/failed)
- By date range
- Search by phone

### Export
- Download logs as CSV
- Print for records
- Share with team

---

## 🛡️ Safety & Best Practices

### ✅ DO's
- Start with small batches (50-100 contacts)
- Use delays of 5+ seconds between messages
- Enable "Number Blocking Prevention"
- Vary your message templates
- Test before sending to large lists
- Monitor logs regularly
- Respect WhatsApp Terms of Service

### ❌ DON'Ts
- Don't send identical messages too fast
- Don't send to inactive numbers repeatedly
- Don't spam the same contacts
- Don't ignore WhatsApp TOS
- Don't disable blocking prevention
- Don't use aggressive delays with large batches
- Don't send unsolicited messages

---

## 🔧 Technical Details

### Architecture
```
Frontend (React)
    ↓
API Authentication (JWT)
    ↓
Backend (Express.js)
    ↓
WhatsApp (Baileys)
Database (SQLite)
```

### Database Schema
- **users**: User accounts
- **user_settings**: Per-user settings
- **templates**: Message templates
- **contacts**: Phone contacts
- **campaigns**: Campaign records
- **logs**: Message send logs
- **qr_sessions**: WhatsApp QR sessions

### API Endpoints
```
POST   /api/auth/register          - Create account
POST   /api/auth/login             - Login
GET    /api/auth/me                - Current user

POST   /api/whatsapp/start-qr      - Start QR auth
GET    /api/whatsapp/qr-code       - Get QR code
GET    /api/whatsapp/status        - Connection status
POST   /api/whatsapp/disconnect    - Disconnect

GET    /api/settings               - Get settings
PUT    /api/settings               - Update settings

POST   /api/templates              - Create template
GET    /api/templates              - List templates
PUT    /api/templates/:id          - Update template
DELETE /api/templates/:id          - Delete template

POST   /api/contacts               - Create contact
GET    /api/contacts               - List contacts
DELETE /api/contacts/:id           - Delete contact
POST   /api/contacts/bulk-upload   - CSV import

POST   /api/campaigns              - Create campaign
GET    /api/campaigns              - List campaigns
POST   /api/campaigns/:id/send     - Send campaign

GET    /api/logs                   - Get logs
```

---

## 🚀 Workflow Example

### Complete Workflow
```
1. Register/Login
   ↓
2. Connect WhatsApp (QR code)
   ↓
3. Create 3-4 Templates
   ↓
4. Import Contacts (CSV)
   ↓
5. Adjust Settings (delay, batch size)
   ↓
6. Create Campaign (select templates)
   ↓
7. Send Campaign (random distribution)
   ↓
8. Monitor Logs
```

### Real Example
```
Step 1: Create Templates
- "Hello {{name}}, Special offer just for you!"
- "{{name}}, Don't miss out on this deal"
- "Hi {{name}}, Last chance to grab this"

Step 2: Add Contacts
- Upload contacts.csv with 500 phone numbers

Step 3: Configure Settings
- Message Delay: 5 seconds
- Batch Size: 100
- Prevention: Enabled
- Rate Limit: 30/min

Step 4: Create Campaign
- Name: "Holiday Promotion"
- Templates: Select all 3
- Random: Yes

Step 5: Send
- Start campaign
- System randomly assigns templates
- Some get T1, some T2, some T3
- Messages sent with 5s delays
- Max 30 messages/minute
```

---

## 🆘 Troubleshooting

### WhatsApp Won't Connect
1. QR code expires in 5 minutes
2. Try again, generate new QR
3. Ensure you're on same network
4. Check phone WhatsApp is updated

### Messages Not Sending
1. Check logs for error details
2. Verify phone numbers are valid
3. Check message delay settings
4. Ensure WhatsApp is connected
5. Check rate limiting

### Campaign Running Slow
1. Reduce batch size
2. Increase message delay
3. Close other applications
4. Restart backend server

### Contacts Not Importing
1. Check CSV format (name,phone,email)
2. Verify phone numbers are valid
3. Check file size (max 50MB)
4. Ensure proper encoding (UTF-8)

---

## 📧 Support & Updates

For issues, suggestions, or updates:
- Check system logs
- Verify all settings are correct
- Restart servers if needed
- Contact support team

---

## 📝 Version History

**v2.0** (Current)
- ✨ WhatsApp Baileys authentication
- ✨ Multi-client account system
- ✨ JWT authentication
- ✨ Settings management
- ✨ Random template distribution
- ✨ Enhanced security
- ✨ Session management

**v1.0** (Previous)
- Basic dashboard
- Template management
- Contact management
- Campaign creation
- Log tracking

---

## 🎉 Conclusion

Your WhatsApp Automation system is now fully configured with:
- ✅ Secure multi-client authentication
- ✅ Direct WhatsApp connection
- ✅ Smart template distribution
- ✅ Configurable safety settings
- ✅ Enterprise-grade features

**Start sending campaigns now!** 🚀
