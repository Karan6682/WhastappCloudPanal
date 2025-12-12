# WhatsApp Automation Dashboard 🚀

A **professional, advanced web application** for managing and monitoring WhatsApp automation campaigns. Built with **Express.js** backend and **React** frontend.

## 🎯 Features

### Dashboard
- Real-time statistics and metrics
- Campaign performance overview
- Message success/failure rates
- Interactive charts and analytics

### Campaigns Management
- Create, edit, and delete campaigns
- Select templates and target contacts
- Monitor campaign status (draft, active, completed)
- Track sent and failed messages

### Contacts Management
- Add individual contacts manually
- Bulk upload via CSV file
- Edit and delete contacts
- View contact history and metadata

### Message Templates
- Create and manage message templates
- Dynamic placeholder support ({{name}})
- Template preview
- Easy editing and deletion

### Activity Logs
- Comprehensive activity logging
- Filter logs by type (success, error, warning)
- Pagination support
- Detailed metadata for debugging

### Advanced Features
- SQLite database for persistence
- RESTful API with comprehensive endpoints
- File upload support (PDF, images)
- Rate limiting and safety measures
- Session management

## 📋 System Requirements

- **Node.js** >= 16.x
- **npm** >= 8.x
- **Git** (optional)
- **Modern browser** (Chrome, Firefox, Safari, Edge)

## 🛠️ Installation

### Step 1: Setup Backend

```bash
cd backend
npm install
```

### Step 2: Setup Frontend

```bash
cd frontend
npm install
```

## 🚀 Running the Application

### Terminal 1 - Start Backend (Port 3001)

```bash
cd backend
npm start
```

You should see:
```
✅ WhatsApp Automation Backend running on http://localhost:3001
📊 Dashboard: http://localhost:3000
```

### Terminal 2 - Start Frontend (Port 3000)

```bash
cd frontend
npm start
```

The dashboard will automatically open at `http://localhost:3000`

## 📁 Project Structure

```
whatsapp_automation_baileys/
├── backend/
│   ├── db/
│   │   └── database.js          # SQLite database layer
│   ├── server.js                # Express server & API routes
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   │   ├── Sidebar.js
│   │   │   ├── DashboardCard.js
│   │   │   └── StatsChart.js
│   │   ├── pages/               # Main page components
│   │   │   ├── Dashboard.js
│   │   │   ├── Contacts.js
│   │   │   ├── Campaigns.js
│   │   │   ├── Templates.js
│   │   │   └── Logs.js
│   │   ├── services/
│   │   │   └── api.js           # API client service
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── index.js                     # Original WhatsApp sender
├── package.json
├── contacts.csv
├── templates.json
└── README.md
```

## 🔌 API Endpoints

### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/bulk-upload` - Bulk upload CSV

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Statistics
- `GET /api/stats` - Get overall statistics
- `GET /api/stats/campaign/:campaignId` - Get campaign statistics

### Logs
- `GET /api/logs?limit=100&offset=0` - Get activity logs
- `POST /api/logs` - Create log entry

### Files
- `POST /api/upload-pdf` - Upload PDF file

### Health
- `GET /api/health` - Check API health

## 💾 Database Schema

### Templates Table
```sql
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT,
  updatedAt TEXT
)
```

### Contacts Table
```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  createdAt TEXT,
  updatedAt TEXT
)
```

### Campaigns Table
```sql
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  templateId TEXT NOT NULL,
  contacts TEXT,
  pdfFile TEXT,
  status TEXT DEFAULT 'draft',
  sentCount INTEGER DEFAULT 0,
  failedCount INTEGER DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT,
  FOREIGN KEY(templateId) REFERENCES templates(id)
)
```

### Logs Table
```sql
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT,
  campaignId TEXT,
  contactId TEXT,
  createdAt TEXT,
  FOREIGN KEY(campaignId) REFERENCES campaigns(id),
  FOREIGN KEY(contactId) REFERENCES contacts(id)
)
```

## 🎨 UI Components

### Dashboard
- 4 metric cards (Total Campaigns, Active, Sent, Failed)
- Performance chart
- Recent campaigns table

### Sidebar Navigation
- 5 main pages with icons
- Active page highlighting
- Professional gradient design

### Forms
- Responsive form layouts
- Form validation
- Success/error feedback

### Tables
- Sortable columns
- Hover effects
- Action buttons

### Cards
- Clean, modern design
- Gradient accents
- Smooth transitions

## 🔒 Safety & Best Practices

### Rate Limiting
- Configurable delays between messages
- Per-number daily limits
- Global daily limits

### Logging
- All activities logged
- Detailed error messages
- Success tracking

### Data Validation
- Input validation on forms
- API request validation
- File type checking

### Security
- CSV file upload validation
- PDF file size limits (50MB)
- MIME type checking

## 🚀 Production Deployment

### Option 1: Heroku

```bash
# Backend
git push heroku-backend main

# Frontend
git push heroku-frontend main
```

### Option 2: DigitalOcean/AWS

1. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start backend/server.js --name "whatsapp-backend"
```

2. Use Nginx as reverse proxy
3. Use Let's Encrypt for SSL

### Option 3: Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Monitoring & Analytics

- Real-time message tracking
- Campaign performance metrics
- Success rate calculations
- Activity logs for debugging
- Error tracking and reporting

## 🛣️ Roadmap

- [ ] Multi-account support
- [ ] Advanced scheduling
- [ ] A/B testing
- [ ] Contact segmentation
- [ ] Webhook integration
- [ ] Real-time WebSocket updates
- [ ] Email notifications
- [ ] Custom report generation

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 3001 is in use
netstat -an | grep 3001

# Kill process on port 3001
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Frontend Won't Connect
- Ensure backend is running on port 3001
- Check CORS settings in backend/server.js
- Clear browser cache and cookies

### Database Issues
- Delete `whatsapp.db` to reset
- Check file permissions

## 📞 Support & Contact

For issues, feature requests, or questions:
- Open an issue in the repository
- Contact the development team

## ⚖️ Legal Notice

This application uses reverse-engineered WhatsApp Web libraries. Use responsibly and comply with WhatsApp's Terms of Service. Bulk messaging can lead to account suspension. Always obtain proper consent from recipients.

## 📄 License

MIT License - See LICENSE file for details

## 🎓 Learning Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [SQLite Documentation](https://www.sqlite.org/)
- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)

---

**Built with ❤️ for professional WhatsApp automation**

Last Updated: December 2025
