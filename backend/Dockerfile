FROM nginx:alpine

# Copiar archivos estáticos
COPY . /usr/share/nginx/html

# Copiar configuración de nginx para proxy inverso al backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
