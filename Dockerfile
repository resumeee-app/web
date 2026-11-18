# ==============================================================================
# Stage 1: Build Static Assets
# ==============================================================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for optimal layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code and configurations
COPY . .

# Build-time Vite environment variables
ARG VITE_API_BASE_URL=/api/v1
ARG ADMIN_MODE=true

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    ADMIN_MODE=${ADMIN_MODE}

# Compile production SPA bundle
RUN npm run build

# ==============================================================================
# Stage 2: Unprivileged Production Static Server (NGINX)
# ==============================================================================
FROM nginx:alpine AS runner

# Configure NGINX for unprivileged non-root user execution
RUN sed -i '/user  nginx;/d' /etc/nginx/nginx.conf && \
    sed -i 's,/run/nginx.pid,/tmp/nginx.pid,g' /etc/nginx/nginx.conf && \
    sed -i '/include \/etc\/nginx\/conf.d\/\*\.conf;/i \
    client_body_temp_path /tmp/client_temp;\n    proxy_temp_path /tmp/proxy_temp_path;\n    fastcgi_temp_path /tmp/fastcgi_temp;\n    uwsgi_temp_path /tmp/uwsgi_temp;\n    scgi_temp_path /tmp/scgi_temp;\n' /etc/nginx/nginx.conf && \
    rm -rf /etc/nginx/conf.d/* && \
    mkdir -p /var/cache/nginx /var/log/nginx /usr/share/nginx/html /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html /tmp

# Copy security headers snippet and NGINX SPA configuration
COPY deploy/security_headers.conf /etc/nginx/security_headers.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure the unprivileged nginx user owns configurations and static assets
RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/security_headers.conf

# Switch to non-root unprivileged user (UID 101)
USER nginx

# Expose unprivileged HTTP port
EXPOSE 8080

# Health check verifying root SPA endpoint returns HTTP 200 (BusyBox wget compatible)
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
