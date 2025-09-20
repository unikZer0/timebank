# Use official Node.js LTS Alpine image
FROM node:lts-alpine

# Set production environment
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production --silent

# Copy source code
COPY . .

# Give ownership to non-root user
RUN chown -R node:node /usr/src/app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "src/index.js"]
