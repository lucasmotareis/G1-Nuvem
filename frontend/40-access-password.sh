#!/bin/sh
set -eu

# Não iniciar o servidor público sem o segredo, nem gravar a senha em logs.
access_user=${ACCESS_USER:-visitante}
case "$access_user" in
    ''|*[!a-zA-Z0-9_.-]*)
        echo >&2 'ACCESS_USER deve conter somente letras, numeros, ponto, hifen ou sublinhado.'
        exit 1
        ;;
esac
if [ -z "${ACCESS_PASSWORD:-}" ]; then
    echo >&2 'Defina ACCESS_PASSWORD no ambiente secreto antes de iniciar o Nginx.'
    exit 1
fi
password_size=$(printf '%s' "$ACCESS_PASSWORD" | wc -c | tr -d ' ')
if [ "$password_size" -lt 20 ] || [ "$password_size" -gt 72 ]; then
    echo >&2 'ACCESS_PASSWORD deve ter entre 20 e 72 bytes para o hash bcrypt.'
    exit 1
fi
case "$ACCESS_PASSWORD" in
    *"
"*|*"$(printf '\r')"*)
        echo >&2 'ACCESS_PASSWORD nao pode conter quebras de linha.'
        exit 1
        ;;
esac

umask 077
mkdir -p /run/nginx-auth
chown root:nginx /run/nginx-auth
chmod 750 /run/nginx-auth
printf '%s\n' "$ACCESS_PASSWORD" | htpasswd -i -B -C 10 -c /run/nginx-auth/htpasswd "$access_user" >/dev/null 2>&1
chown root:nginx /run/nginx-auth/htpasswd
chmod 640 /run/nginx-auth/htpasswd
unset ACCESS_PASSWORD
