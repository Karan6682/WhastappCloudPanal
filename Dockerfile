FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy backend package files first for better cache
COPY backend/package*.json ./backend/

# Install dependencies inside backend
WORKDIR /app/backend
RUN npm install --production

# Copy backend source
WORKDIR /app
COPY backend/ ./backend/

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /app/backend
EXPOSE 3001

# Use the start script from backend/package.json
CMD ["npm", "start"]
