# Development Guide - WhatsApp Automation Dashboard

## Overview

This guide is for developers who want to understand, modify, or extend the WhatsApp Automation Dashboard.

---

## Project Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / User                        │
│              http://localhost:3000 (React)              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────▼──────────────────────────────────┐
│           Frontend (React Dashboard)                     │
│  - Sidebar Navigation                                    │
│  - Dashboard Page (Charts, Cards)                       │
│  - Contacts Management                                  │
│  - Templates Management                                 │
│  - Campaigns Management                                 │
│  - Activity Logs                                        │
└──────────────────────┬──────────────────────────────────┘
                       │ API Calls via Axios
                       │ http://localhost:3001/api
┌──────────────────────▼──────────────────────────────────┐
│         Backend API Server (Express.js)                  │
│  - Route Handlers                                        │
│  - Validation Logic                                      │
│  - File Upload Handler                                  │
│  - Error Handling                                        │
└──────────────────────┬──────────────────────────────────┘
                       │ Database Queries
┌──────────────────────▼──────────────────────────────────┐
│            Database Layer (SQLite)                       │
│  - Templates Table                                       │
│  - Contacts Table                                        │
│  - Campaigns Table                                       │
│  - Logs Table                                            │
│  - Stats Table                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Development

### File Structure

```
backend/
├── server.js              # Main Express app
├── db/
│   └── database.js        # Database layer
└── package.json
```

### Adding a New API Endpoint

**Step 1: Create the database method** (`db/database.js`)

```javascript
// Add to Database class
getContactsByPhone(phone) {
  return new Promise((resolve, reject) => {
    this.db.get(
      `SELECT * FROM contacts WHERE phone = ?`,
      [phone],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      }
    );
  });
}
```

**Step 2: Create the API route** (`server.js`)

```javascript
// Add new route
app.get('/api/contacts/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const contact = await db.getContactsByPhone(phone);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Step 3: Update API client** (`frontend/src/services/api.js`)

```javascript
// Add new function
export const getContactByPhone = (phone) => 
  apiClient.get(`/contacts/phone/${phone}`);
```

**Step 4: Use in React component** (e.g., `Contacts.js`)

```javascript
const contact = await getContactByPhone('+1234567890');
```

---

## Frontend Development

### Component Structure

Every page component follows this pattern:

```javascript
import React, { useState, useEffect } from 'react';
import { getContacts, createContact } from '../services/api';
import './Contacts.css';

function Contacts() {
  // State management
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Data fetching
  const loadContacts = async () => {
    try {
      const response = await getContacts();
      setContacts(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Event handlers
  const handleCreate = async (data) => {
    // Handle create
  };

  // Render
  return (
    <div className="contacts-page">
      {/* JSX here */}
    </div>
  );
}

export default Contacts;
```

### Adding a New Page

**Step 1: Create page component** (`frontend/src/pages/NewPage.js`)

```javascript
import React, { useState, useEffect } from 'react';
import './NewPage.css';

function NewPage() {
  const [data, setData] = useState([]);

  return (
    <div className="newpage-page">
      <h1>New Page</h1>
      {/* Content */}
    </div>
  );
}

export default NewPage;
```

**Step 2: Create CSS** (`frontend/src/pages/NewPage.css`)

```css
.newpage-page {
  margin-left: 250px;
  padding: 2rem;
}
```

**Step 3: Import in App.js**

```javascript
import NewPage from './pages/NewPage';
```

**Step 4: Add route in App.js**

```javascript
case 'newpage':
  return <NewPage />;
```

**Step 5: Add sidebar menu item** (`Sidebar.js`)

```javascript
{ id: 'newpage', label: '🆕 New Page', icon: '🆕' }
```

---

## Database Operations

### Creating a New Table

**In `db/database.js` init() method:**

```javascript
this.db.run(`
  CREATE TABLE IF NOT EXISTS newtable (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    value TEXT,
    createdAt TEXT
  )
`);
```

### Query Examples

**SELECT all:**
```javascript
getAll() {
  return new Promise((resolve, reject) => {
    this.db.all(`SELECT * FROM table`, (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });
}
```

**SELECT one:**
```javascript
getById(id) {
  return new Promise((resolve, reject) => {
    this.db.get(`SELECT * FROM table WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}
```

**INSERT:**
```javascript
create(data) {
  return new Promise((resolve, reject) => {
    this.db.run(
      `INSERT INTO table (id, name, value) VALUES (?, ?, ?)`,
      [data.id, data.name, data.value],
      function(err) {
        if (err) reject(err);
        resolve(data);
      }
    );
  });
}
```

**UPDATE:**
```javascript
update(id, data) {
  return new Promise((resolve, reject) => {
    this.db.run(
      `UPDATE table SET name = ?, value = ? WHERE id = ?`,
      [data.name, data.value, id],
      function(err) {
        if (err) reject(err);
        resolve({ id, ...data });
      }
    );
  });
}
```

**DELETE:**
```javascript
delete(id) {
  return new Promise((resolve, reject) => {
    this.db.run(`DELETE FROM table WHERE id = ?`, [id], function(err) {
      if (err) reject(err);
      resolve();
    });
  });
}
```

---

## Styling Guide

### Color Scheme

```css
/* Primary Colors */
--primary: #667eea;      /* Purple */
--primary-dark: #764ba2; /* Dark Purple */

/* Accent Colors */
--success: #48bb78;      /* Green */
--error: #f56565;        /* Red */
--warning: #ecc94b;      /* Yellow */
--info: #4299e1;         /* Blue */

/* Grays */
--text: #333333;         /* Dark text */
--text-light: #666666;   /* Light text */
--bg-light: #f9f9f9;     /* Light background */
--border: #eeeeee;       /* Border color */
```

### Component Styling Pattern

```css
/* Container with margins */
.component {
  padding: 2rem;
  margin-bottom: 2rem;
}

/* Typography */
h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
p { color: #666; line-height: 1.5; }

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

/* Forms */
input, textarea, select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
```

---

## Common Tasks

### Task 1: Add a New Status Type

**Database:**
```javascript
// In campaigns table, status values:
'draft' | 'active' | 'paused' | 'completed'
```

**CSS:**
```css
.status-paused {
  padding: 0.4rem 0.8rem;
  background: #f687b3;
  color: #742a2a;
  border-radius: 4px;
}
```

**Component:**
```javascript
const getStatusColor = (status) => {
  const colors = {
    'draft': '#fff3cd',
    'active': '#d1ecf1',
    'paused': '#f687b3',
    'completed': '#d4edda'
  };
  return colors[status] || '#fff3cd';
};
```

### Task 2: Add Form Validation

```javascript
const validateForm = (formData) => {
  const errors = {};

  if (!formData.name) {
    errors.name = 'Name is required';
  }

  if (!formData.email || !formData.email.includes('@')) {
    errors.email = 'Valid email is required';
  }

  if (!formData.phone || formData.phone.length < 10) {
    errors.phone = 'Valid phone number is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// In form submit:
const { isValid, errors } = validateForm(formData);
if (!isValid) {
  setFormErrors(errors);
  return;
}
```

### Task 3: Add Loading States

```javascript
const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    setLoading(true);
    await createContact(formData);
    setFormData({});
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// In JSX:
<button disabled={loading}>
  {loading ? 'Creating...' : 'Create'}
</button>
```

---

## Testing Workflow

### Manual Testing

1. **Test Create:**
   - Add new item
   - Verify in database
   - Check in UI

2. **Test Update:**
   - Modify item
   - Verify in database
   - Refresh UI

3. **Test Delete:**
   - Delete item
   - Verify removed from database
   - Check UI updates

4. **Test Bulk Operations:**
   - Upload CSV
   - Verify all records created
   - Check data integrity

---

## Performance Tips

1. **Pagination:** Limit results for large datasets
```javascript
const loadContacts = async (page = 0, limit = 50) => {
  const offset = page * limit;
  const response = await apiClient.get(
    `/contacts?limit=${limit}&offset=${offset}`
  );
};
```

2. **Caching:** Cache data when appropriate
```javascript
const [cache, setCache] = useState({});

const loadTemplates = async () => {
  if (cache.templates) return cache.templates;
  const response = await getTemplates();
  setCache({ ...cache, templates: response.data });
};
```

3. **Lazy Loading:** Load images and data on demand
```javascript
const [contacts, setContacts] = useState([]);
const [loadedIds, setLoadedIds] = useState([]);

const loadContactDetails = async (id) => {
  if (loadedIds.includes(id)) return;
  const details = await getContactById(id);
  setLoadedIds([...loadedIds, id]);
};
```

---

## Debugging

### Browser Console Errors

Check in DevTools (F12):
- Network tab: API calls
- Console: JavaScript errors
- Application: LocalStorage/Cookies

### Server Logs

Check terminal where server is running:
- Request logs
- Database errors
- Validation errors

### Common Issues

```javascript
// CORS Error
// Solution: Check backend CORS setup

// "Cannot read property of undefined"
// Solution: Check data loading before accessing

// API not responding
// Solution: Check server is running on 3001

// Database locked
// Solution: Restart server
```

---

## Best Practices

✅ **Code Style:**
- Use consistent naming (camelCase for JS, kebab-case for CSS)
- Add comments for complex logic
- Keep functions small and focused

✅ **Error Handling:**
- Always use try-catch for async operations
- Provide user-friendly error messages
- Log errors for debugging

✅ **Performance:**
- Minimize re-renders in React
- Use useCallback for event handlers
- Implement pagination for large lists

✅ **Security:**
- Validate all inputs
- Sanitize file uploads
- Use parameterized queries
- Never expose sensitive data in console

---

## Useful Commands

```bash
# Start development servers
cd backend && npm start
cd frontend && npm start

# Reset database
rm whatsapp.db

# Check dependencies
npm outdated

# Update dependencies
npm update

# Clean install
rm -r node_modules package-lock.json && npm install

# Format code
npm run format
```

---

## Resources

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [SQLite Docs](https://www.sqlite.org/docs.html)
- [Axios Docs](https://axios-http.com/)
- [CSS Tricks](https://css-tricks.com/)

---

## Contributing

1. Create a new branch
2. Make changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create pull request

---

**Happy coding! 🚀**
