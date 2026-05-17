# Stage 1: Build the React application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Use HTTP registry and extended timeouts to avoid TLS issues on Docker/Windows
RUN echo "registry=http://registry.npmjs.org/" > .npmrc && \
    echo "fetch-timeout=300000" >> .npmrc && \
    echo "fetch-retry-maxtimeout=300000" >> .npmrc && \
    npm install --no-audit
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the compiled static files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
