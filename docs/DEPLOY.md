# Publicar o jogo no servidor

O jogo é um site estático: `npm run build` gera a pasta `dist/`, que qualquer servidor web entrega
(sem backend). O `vite.config.ts` usa `base: './'`, então funciona na raiz ou em uma subpasta.

## Opção 1 — Docker (recomendada)
```bash
git clone https://github.com/AlessonBarauna/super-zion-barauna-bros
cd super-zion-barauna-bros
git checkout feature/pipes-growth-doublejump   # ou main, depois do merge
docker build -t super-zion .
docker run -d --name super-zion --restart unless-stopped -p 8080:80 super-zion
```
Abra `http://IP-DO-SERVIDOR:8080`. Para atualizar: `git pull && docker build -t super-zion . && docker rm -f super-zion && docker run ... (mesmo comando)`.

## Opção 2 — nginx direto
```bash
npm ci && npm run build
sudo mkdir -p /var/www/super-zion && sudo cp -r dist/* /var/www/super-zion/
```
Aponte o `root` do nginx para `/var/www/super-zion` (veja `nginx.conf`).

## Domínio e HTTPS
Coloque um proxy com HTTPS na frente (Caddy, Traefik ou nginx + certbot) apontando para a porta do jogo.

## Conferir depois de publicar
Abra o jogo, inicie 1 JOGADOR, ande, pule duas vezes, entre no cano da fase 1-1 (↓) e abra o mapa de mundos.
