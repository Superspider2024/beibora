FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files first (for layer caching)
COPY backend/package*.json ./backend/

# Install backend production dependencies
WORKDIR /app/backend
RUN npm ci --only=production || npm install --production

# Copy backend source
COPY backend/ ./

# Expose port and start server
ENV PORT=5000
EXPOSE 5000

CMD ["node", "server.js"]
