# Stage 1: Build the application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Remove development dependencies not needed in production
RUN npm remove @shopify/app @shopify/cli

# Build the application
RUN npm run build

# Clean up the build artifacts (e.g., remove SQLite database)
RUN rm -f prisma/dev.sqlite

# Stage 2: Create the production image
FROM node:20-alpine

WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app /app

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "docker-start"]

