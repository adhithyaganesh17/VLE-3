
# Stage 1: Build frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Hardened Nginx
FROM nginx:alpine

# Configure Nginx PID in a writable directory
RUN sed -i 's|^[[:space:]]*pid[[:space:]].*;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
    && rm -f /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh

# Remove default static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy frontend build and custom Nginx configuration
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Prepare writable directories for non-root Nginx
RUN mkdir -p /tmp/nginx/client_temp \
    /tmp/nginx/proxy_temp \
    /tmp/nginx/fastcgi_temp \
    /tmp/nginx/uwsgi_temp \
    /tmp/nginx/scgi_temp \
    && chown -R 101:101 /usr/share/nginx/html /tmp/nginx \
    && chmod -R 755 /usr/share/nginx/html \
    && touch /tmp/nginx.pid \
    && chown 101:101 /tmp/nginx.pid

USER 101:101

EXPOSE 8080

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
