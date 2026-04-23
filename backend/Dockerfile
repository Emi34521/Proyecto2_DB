FROM node:20-alpine
 
WORKDIR /app
 
# Instalar dependencias
COPY backend/package*.json ./
RUN npm install
 
# Copiar todo el backend
COPY backend/src ./src
 
# Copiar frontend (para que Express lo sirva como estático)
COPY frontend ./frontend
 
EXPOSE 3000
 
CMD ["node", "src/index.js"]
 