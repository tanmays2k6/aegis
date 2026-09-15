FROM node:20-alpine

WORKDIR /app

# Copy package descriptors and install production dependencies
COPY package.json /app/
RUN npm install --production

# Copy application source code
COPY server.js /app/

# Expose Render standard port
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
