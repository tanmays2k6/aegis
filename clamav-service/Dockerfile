FROM clamav/clamav:1.4

USER root

# Install Node.js & npm on Alpine
RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY package.json /app/
RUN npm install --production

COPY server.js /app/

EXPOSE 8080

# Start clamd daemon in background, wait for socket, then start HTTP Gateway
CMD clamd & node server.js
