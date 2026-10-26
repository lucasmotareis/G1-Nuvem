"""Probe local da imagem AWS; executar no namespace de rede da task simulada."""
import base64
import json
import os
import urllib.error
import urllib.request

credentials = f"{os.environ['TEST_ACCESS_USER']}:{os.environ['TEST_ACCESS_PASSWORD']}"
authorization = 'Basic ' + base64.b64encode(credentials.encode()).decode()
checks = []


def check(port, route, expected, *, forwarded=False, authenticated=False):
    headers = {}
    if forwarded:
        headers['X-Forwarded-Proto'] = 'https'
    if authenticated:
        headers['Authorization'] = authorization
    request = urllib.request.Request(f'http://127.0.0.1:{port}{route}', headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            status = response.status
    except urllib.error.HTTPError as error:
        status = error.code
    assert status == expected, f'{port}{route}: esperado {expected}, obtido {status}'
    checks.append({'porta': port, 'rota': route, 'status': status,
                   'httpsNoALB': forwarded, 'autenticado': authenticated})


check(80, '/', 426)
check(80, '/', 401, forwarded=True)
check(80, '/', 200, forwarded=True, authenticated=True)
check(80, '/health', 401, forwarded=True)
check(80, '/health', 200, forwarded=True, authenticated=True)
check(8082, '/healthz', 200)
check(8082, '/', 404)
check(8082, '/itens', 404)
check(8082, '/estatisticas', 404)
check(8082, '/fotos/inexistente.png', 404)
print(json.dumps({'legenda': 'Ensaio LOCAL da configuracao AWS, sem provisionar recursos.',
                  'checks': checks}))
