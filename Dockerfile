# Use Node.js LTS Alpine
FROM node:lts-alpine

# Set environment
ENV NODE_ENV=development

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (dev + prod)
RUN npm install --silent

# Copy the rest of the source code
COPY . .

# Expose port
EXPOSE 3000

# Run nodemon
CMD ["npx", "nodemon", "--watch", "src", "--ext", "js,json", "src/index.js"]
