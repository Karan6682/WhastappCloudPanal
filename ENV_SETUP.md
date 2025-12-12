# Environment Configuration

## Backend Environment (.env.example)

Copy this to `backend/.env`:

```
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=../whatsapp.db

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads

# Rate Limiting
MIN_DELAY_MS=3000
MAX_DELAY_MS=8000
MAX_PER_NUMBER_PER_DAY=150
GLOBAL_DAILY_LIMIT=800

# Logging
LOG_LEVEL=info
```

## Frontend Environment (.env.example)

Copy this to `frontend/.env`:

```
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_API_TIMEOUT=30000

# App Configuration
REACT_APP_APP_NAME=WhatsApp Automation
REACT_APP_APP_VERSION=1.0.0
REACT_APP_DEBUG=true
```

## Setup Instructions

### Backend

1. Create file: `backend/.env`
2. Copy variables from above
3. Customize as needed:
   ```bash
   PORT=3001                    # Change if needed
   NODE_ENV=development         # development or production
   ```

### Frontend

1. Create file: `frontend/.env`
2. Copy variables from above
3. Customize as needed:
   ```bash
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_DEBUG=true        # false in production
   ```

## Important Notes

- ⚠️ Never commit `.env` files to git
- ✅ Use `.env.example` as template
- 🔒 Keep sensitive data in `.env` only
- 📝 Document all env variables in `.env.example`

## Variables Explained

### Backend

| Variable | Purpose | Example |
|----------|---------|---------|
| PORT | API server port | 3001 |
| NODE_ENV | Environment type | development |
| DATABASE_PATH | SQLite database location | ../whatsapp.db |
| CORS_ORIGIN | Allowed frontend URL | http://localhost:3000 |
| MAX_FILE_SIZE | Max upload size (bytes) | 52428800 (50MB) |
| MIN_DELAY_MS | Min delay between messages | 3000 |
| MAX_DELAY_MS | Max delay between messages | 8000 |

### Frontend

| Variable | Purpose | Example |
|----------|---------|---------|
| REACT_APP_API_URL | Backend API URL | http://localhost:3001/api |
| REACT_APP_API_TIMEOUT | Request timeout (ms) | 30000 |
| REACT_APP_APP_NAME | App name | WhatsApp Automation |
| REACT_APP_DEBUG | Debug mode | true/false |

## Production Setup

### Backend (.env)

```
PORT=3001
NODE_ENV=production
DATABASE_PATH=/var/lib/whatsapp/whatsapp.db
CORS_ORIGIN=https://yourdomain.com
MAX_FILE_SIZE=52428800
UPLOAD_DIR=/var/uploads
LOG_LEVEL=error
```

### Frontend (.env.production)

```
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_API_TIMEOUT=30000
REACT_APP_APP_NAME=WhatsApp Automation
REACT_APP_DEBUG=false
```

## Common Issues

### "Cannot find module dotenv"
```bash
npm install dotenv
```

### Variables not loading
- Check file is in correct directory
- Restart server after changing .env
- Use REACT_APP_ prefix in frontend variables

### CORS errors
- Check CORS_ORIGIN in backend/.env
- Ensure frontend URL matches
- Test with http://localhost:3000

## Additional Resources

- [Node.js dotenv docs](https://github.com/motdotla/dotenv)
- [React environment variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Environment best practices](https://12factor.net/config)
