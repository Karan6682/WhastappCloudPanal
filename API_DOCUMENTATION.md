# WhatsApp Automation - Backend API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Currently, the API has no authentication. For production, implement JWT or OAuth2.

## Response Format

All responses are in JSON format:

```json
{
  "data": {},
  "error": null,
  "status": "success"
}
```

## Error Handling

Standard HTTP status codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## TEMPLATES ENDPOINTS

### Get All Templates
```http
GET /templates
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Welcome Message",
    "content": "Hello {{name}}, welcome!",
    "createdAt": "2025-12-10T10:00:00Z",
    "updatedAt": "2025-12-10T10:00:00Z"
  }
]
```

### Create Template
```http
POST /templates
Content-Type: application/json

{
  "title": "Welcome Message",
  "content": "Hello {{name}}, welcome to our service!"
}
```

**Response:** `201 Created`

### Update Template
```http
PUT /templates/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content {{name}}"
}
```

### Delete Template
```http
DELETE /templates/:id
```

---

## CONTACTS ENDPOINTS

### Get All Contacts
```http
GET /contacts
```

**Response:**
```json
[
  {
    "id": "uuid",
    "phone": "+1234567890",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-12-10T10:00:00Z"
  }
]
```

### Create Contact
```http
POST /contacts
Content-Type: application/json

{
  "phone": "+1234567890",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Update Contact
```http
PUT /contacts/:id
Content-Type: application/json

{
  "phone": "+1234567890",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

### Delete Contact
```http
DELETE /contacts/:id
```

### Bulk Upload Contacts (CSV)
```http
POST /contacts/bulk-upload
Content-Type: multipart/form-data

CSV File with columns: phone, name, email
```

**CSV Format:**
```
phone,name,email
+1234567890,John Doe,john@example.com
+1234567891,Jane Doe,jane@example.com
```

---

## CAMPAIGNS ENDPOINTS

### Get All Campaigns
```http
GET /campaigns
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Q4 Marketing",
    "templateId": "uuid",
    "contacts": "[\"contact-id-1\", \"contact-id-2\"]",
    "status": "draft",
    "sentCount": 0,
    "failedCount": 0,
    "createdAt": "2025-12-10T10:00:00Z"
  }
]
```

### Create Campaign
```http
POST /campaigns
Content-Type: application/json

{
  "name": "Q4 Marketing",
  "templateId": "template-uuid",
  "contacts": ["contact-id-1", "contact-id-2"],
  "pdfFile": "report.pdf"
}
```

### Update Campaign
```http
PUT /campaigns/:id
Content-Type: application/json

{
  "status": "active",
  "sentCount": 100,
  "failedCount": 5
}
```

### Delete Campaign
```http
DELETE /campaigns/:id
```

---

## STATISTICS ENDPOINTS

### Get Overall Statistics
```http
GET /stats
```

**Response:**
```json
[
  {
    "id": "uuid",
    "campaignId": "uuid",
    "date": "2025-12-10",
    "totalSent": 150,
    "totalFailed": 5,
    "totalPending": 10
  }
]
```

### Get Campaign Statistics
```http
GET /stats/campaign/:campaignId
```

---

## LOGS ENDPOINTS

### Get Activity Logs
```http
GET /logs?limit=100&offset=0
```

**Query Parameters:**
- `limit` (default: 100) - Number of logs to return
- `offset` (default: 0) - Pagination offset

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "success",
    "message": "Message sent successfully",
    "campaignId": "uuid",
    "contactId": "uuid",
    "createdAt": "2025-12-10T10:00:00Z"
  }
]
```

### Create Log
```http
POST /logs
Content-Type: application/json

{
  "type": "success",
  "message": "Campaign started",
  "campaignId": "uuid",
  "contactId": "uuid"
}
```

Log Types:
- `success` - Successful operation
- `error` - Error occurred
- `warning` - Warning message
- `info` - Informational message

---

## FILE UPLOAD ENDPOINTS

### Upload PDF
```http
POST /upload-pdf
Content-Type: multipart/form-data

[Binary PDF File]
```

**Response:**
```json
{
  "filename": "pdf-timestamp-random.pdf",
  "path": "/uploads/pdf-timestamp-random.pdf",
  "size": 102400
}
```

**Allowed File Types:**
- PDF
- JPEG
- PNG
- TXT

**Size Limit:** 50MB

---

## HEALTH CHECK

### Check API Status
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-10T10:00:00Z"
}
```

---

## Example Usage with cURL

### Create a Template
```bash
curl -X POST http://localhost:3001/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Welcome",
    "content": "Hello {{name}}!"
  }'
```

### Get All Contacts
```bash
curl http://localhost:3001/api/contacts
```

### Create a Contact
```bash
curl -X POST http://localhost:3001/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "name": "John",
    "email": "john@example.com"
  }'
```

### Upload CSV
```bash
curl -X POST http://localhost:3001/api/contacts/bulk-upload \
  -F "file=@contacts.csv"
```

---

## Example Usage with JavaScript/Node.js

```javascript
const axios = require('axios');

const API = 'http://localhost:3001/api';

// Get all templates
async function getTemplates() {
  const response = await axios.get(`${API}/templates`);
  console.log(response.data);
}

// Create a contact
async function createContact(phone, name, email) {
  const response = await axios.post(`${API}/contacts`, {
    phone,
    name,
    email
  });
  return response.data;
}

// Create a campaign
async function createCampaign(name, templateId, contacts) {
  const response = await axios.post(`${API}/campaigns`, {
    name,
    templateId,
    contacts
  });
  return response.data;
}
```

---

## Best Practices

1. **Always validate input** before sending to API
2. **Use proper HTTP methods** (GET, POST, PUT, DELETE)
3. **Handle errors gracefully** with try-catch
4. **Implement pagination** for large datasets
5. **Cache responses** where appropriate
6. **Log all API calls** for debugging
7. **Use HTTPS** in production
8. **Implement rate limiting** on client side
9. **Validate file uploads** by type and size
10. **Use environment variables** for configuration

---

For more information, refer to the main README.md
