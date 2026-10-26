FROM nginx:1.30-alpine

RUN apk add --no-cache apache2-utils

COPY index.html styles.css app.js /usr/share/nginx/html/
COPY routing.conf /etc/nginx/snippets/achados-routing.conf
COPY internal-health.conf /etc/nginx/conf.d/internal-health.conf
COPY 40-access-password.sh /docker-entrypoint.d/40-access-password.sh
RUN chmod 755 /docker-entrypoint.d/40-access-password.sh
# Padrão para AWS: Nginx e Flask compartilham a mesma task e o localhost.
# O Compose substitui este arquivo pela configuração de DNS do Docker.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 8082
