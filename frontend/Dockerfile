FROM nginx:1.30-alpine

COPY index.html styles.css app.js /usr/share/nginx/html/
COPY routing.conf /etc/nginx/snippets/achados-routing.conf
# Padrão para AWS: Nginx e Flask compartilham a mesma task e o localhost.
# O Compose substitui este arquivo pela configuração de DNS do Docker.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
