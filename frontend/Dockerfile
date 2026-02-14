FROM node:20-alpine AS base
WORKDIR /srv/frontend

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Development target
FROM base AS development
EXPOSE 5173
CMD ["npx", "react-router", "dev", "--host", "0.0.0.0"]

# Build target
FROM base AS build
RUN npm run build

# Production target
FROM node:20-alpine AS production
WORKDIR /srv/frontend
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /srv/frontend/build ./build
EXPOSE 3000
CMD ["npm", "run", "start"]
