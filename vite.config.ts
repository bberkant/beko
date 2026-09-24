import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';
import crypto from 'crypto';

let cachedMikrokomToken: string | null = null;
let tokenExpiresAt = 0;

function getMikrokomToken(): Promise<string> {
  if (cachedMikrokomToken && Date.now() < tokenExpiresAt) {
    return Promise.resolve(cachedMikrokomToken);
  }
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify({
      username: 'admin_007408',
      password: 'rvkDAuKh'
    });
    const req = https.request({
      hostname: 'portal.mikrokomdonusum.com',
      port: 443,
      path: '/accounting/api/auth/signin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0',
        'Content-Length': Buffer.byteLength(dataStr)
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          cachedMikrokomToken = j.token.accessToken;
          tokenExpiresAt = Date.now() + 3600000;
          resolve(cachedMikrokomToken!);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

function fetchMikrokomMedia(token: string, uuid: string, direction: string, dateStr: string, mediaType: 'pdf' | 'html'): Promise<{ status: number; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
    const month = isNaN(d.getMonth()) ? 12 : d.getMonth();

    const path = direction === 'gelen' ? `/inbox/downloadMedia/${mediaType}` : `/outbox/downloadMedia/${mediaType}`;
    const postData = JSON.stringify({
      documentUuid: uuid,
      year: year,
      month: direction === 'gelen' ? month : 12
    });

    const req = https.request({
      hostname: 'portal.mikrokomdonusum.com',
      port: 443,
      path: `/accounting/api${path}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0',
        'Content-Length': Buffer.byteLength(postData)
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode || 500, buffer: buf });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const marifPdfPlugin = (): Plugin => ({
  name: 'marif-pdf-middleware',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/api/marif/efaturalar/')) {
        return next();
      }

      const urlObj = new URL(req.url, 'http://localhost:5173');
      const pathname = urlObj.pathname;
      const isPdf = pathname.endsWith('/pdf');
      const isHtml = pathname.endsWith('/html');

      if (!isPdf && !isHtml) {
        return next();
      }

      const uuid = urlObj.searchParams.get('uuid') || '';
      const direction = urlObj.searchParams.get('direction') || 'gelen';
      const dateStr = urlObj.searchParams.get('date') || '';

      if (!uuid) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'UUID parametresi gerekli' }));
      }

      try {
        const token = await getMikrokomToken();
        const mediaType = isPdf ? 'pdf' : 'html';
        const result = await fetchMikrokomMedia(token, uuid, direction, dateStr, mediaType);

        if (result.status === 200 && result.buffer.length > 0) {
          res.statusCode = 200;
          res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', `inline; filename="${uuid}.${mediaType}"`);
          return res.end(result.buffer);
        } else {
          res.statusCode = result.status || 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Fatura belgesi portalda bulunamadı' }));
        }
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: err.message || 'PDF getirme hatası' }));
      }
    });
  }
});

export default defineConfig({
  base: '/',
  plugins: [react(), marifPdfPlugin()],
  server: {
    watch: {
      ignored: ['**/dosyalar/**', '**/*.xlsx', '**/*.rar', '**/*.zip'],
    },
  },
});

