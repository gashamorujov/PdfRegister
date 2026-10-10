const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('./index');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');

test('health endpoint deploy monitor üçün 200 qaytarır', async () => {
  const response = await request(app).get('/healthz');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('API konfiqurasiyası secret-ləri açıqlamır', async () => {
  const response = await request(app).get('/api/config');
  assert.equal(response.status, 200);
  assert.equal(response.body.courses, undefined);
  assert.equal(typeof response.body.features.telegram, 'boolean');
  assert.equal(response.body.telegramBotToken, undefined);
});

test('tapılmayan API route JSON 404 qaytarır', async () => {
  const response = await request(app).get('/api/does-not-exist');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'API route tapılmadı.');
});

test('PDF route anonim istifadəçiyə sənədləri açmır', async () => {
  const response = await request(app).get('/files/00000000-0000-4000-8000-000000000000.pdf');
  assert.equal(response.status, 401);
});

test('admin endpoint anonim istifadəçiyə bağlıdır', async () => {
  const response = await request(app).get('/api/admin/documents');
  assert.equal(response.status, 401);
});

test('köhnə statik admin cookie saxtalaşdırıla bilmir', async () => {
  const response = await request(app)
    .get('/api/admin/documents')
    .set('Cookie', 'admin_session=ok');
  assert.equal(response.status, 401);
});

test('xarici Origin admin əməliyyatlarını bloklayır', async () => {
  const response = await request(app)
    .post('/api/admin/logout')
    .set('Origin', 'https://attacker.example');
  assert.equal(response.status, 403);
});

test('admin session random token istifadə edir və logout-dan sonra ləğv olunur', async () => {
  const loginCode = process.env.ADMIN_CODE || '0706';
  const login = await request(app)
    .post('/api/admin/login')
    .send({ code: loginCode });

  assert.equal(login.status, 200);
  const sessionCookie = login.headers['set-cookie']
    ?.find(cookie => cookie.startsWith('admin_session='));
  assert.ok(sessionCookie, 'admin login sessiya cookie-si yaratmalıdır');
  assert.match(sessionCookie, /HttpOnly/i);
  assert.doesNotMatch(sessionCookie, /admin_session=ok(?:;|$)/);
  // Plain HTTP (localhost, self-hosted IP) → cookie Secure olmadan işləməlidir.
  assert.doesNotMatch(sessionCookie, /;\s*Secure/i);
  assert.match(sessionCookie, /SameSite=Lax/i);

  const cookieValue = sessionCookie.split(';', 1)[0];
  const authenticated = await request(app)
    .get('/api/admin/documents')
    .set('Cookie', cookieValue);
  assert.equal(authenticated.status, 200);

  const logout = await request(app)
    .post('/api/admin/logout')
    .set('Cookie', cookieValue);
  assert.equal(logout.status, 200);

  const revoked = await request(app)
    .get('/api/admin/documents')
    .set('Cookie', cookieValue);
  assert.equal(revoked.status, 401);

  // HTTPS (birbaşa və ya X-Forwarded-Proto ilə) → Secure + SameSite=None.
  const httpsLogin = await request(app)
    .post('/api/admin/login')
    .set('X-Forwarded-Proto', 'https')
    .send({ code: loginCode });
  assert.equal(httpsLogin.status, 200);
  const httpsCookie = httpsLogin.headers['set-cookie']
    ?.find(cookie => cookie.startsWith('admin_session='));
  assert.ok(httpsCookie, 'HTTPS login də sessiya cookie-si yaratmalıdır');
  assert.match(httpsCookie, /;\s*Secure/i);
  assert.match(httpsCookie, /SameSite=None/i);
});


test('production zəif xüsusi ADMIN_CODE ilə start etmir', () => {
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'docflow-prod-test-'));
  try {
    const result = spawnSync(process.execPath, ['server/src/index.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10000,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ADMIN_CODE: 'kisa-kod',
        SESSION_SECRET: 'a'.repeat(64),
        PORT: '3219',
        PUBLIC_ORIGIN: 'https://example.test',
        STORAGE_DIR: storage,
        TELEGRAM_BOT_TOKEN: '',
        TELEGRAM_CHANNEL_ID: '',
        TELEGRAM_API_ID: '',
        TELEGRAM_API_HASH: '',
        FIREBASE_CLIENT_EMAIL: '',
        FIREBASE_PRIVATE_KEY: ''
      }
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /ADMIN_CODE must be at least 12 characters/);
  } finally {
    fs.rmSync(storage, { recursive: true, force: true });
  }
});


test('şəkil göndərişi PDF yaradır və faylı yalnız admin aça bilir', async () => {
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: '#ffffff' }
  }).jpeg().toBuffer();
  const submitted = await request(app)
    .post('/api/documents')
    .field('fullName', 'Test User')
    .field('phone', '+994 50 348 26 97')
    .field('courseCodes', JSON.stringify(['SP']))
    .attach('images', image, { filename: 'test.jpg', contentType: 'image/jpeg' });

  assert.equal(submitted.status, 201);
  const id = submitted.body.document.id;
  assert.ok(id);
  assert.equal(submitted.body.document.status, 'pending');

  const anonymousPdf = await request(app).get(`/files/${id}.pdf`);
  assert.equal(anonymousPdf.status, 401);

  const login = await request(app)
    .post('/api/admin/login')
    .send({ code: process.env.ADMIN_CODE || '0706' });
  assert.equal(login.status, 200);
  const cookie = login.headers['set-cookie']
    .find(value => value.startsWith('admin_session='))
    .split(';', 1)[0];

  const pdf = await request(app)
    .get(`/files/${id}.pdf`)
    .set('Cookie', cookie);
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers['content-type'], /application\/pdf/);
  assert.ok(pdf.body.length > 100);

  const deleted = await request(app)
    .delete(`/api/admin/documents/${id}`)
    .set('Cookie', cookie);
  assert.equal(deleted.status, 200);
  const logout = await request(app)
    .post('/api/admin/logout')
    .set('Cookie', cookie);
  assert.equal(logout.status, 200);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'storage', `${id}.pdf`)), false);
});


test('frontend sərt Content-Security-Policy və kamera icazə siyasəti ilə verilir', async () => {
  const response = await request(app).get('/');
  assert.equal(response.status, 200);
  const csp = response.headers['content-security-policy'];
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.match(response.headers['permissions-policy'], /camera=\(self\)/);
  assert.doesNotMatch(response.text, /\son(click|change|input|submit)=/i);
});

test('API konfiqurasiyası şəkil limitlərini qaytarır', async () => {
  const response = await request(app).get('/api/config');
  assert.equal(response.status, 200);
  assert.equal(response.body.limits.maxImages, 20);
  assert.ok(response.body.limits.maxUploadMb > 0);
});

/* ---------- Deploy-anywhere: canlı server testləri ---------- */
const { spawn } = require('node:child_process');
const http = require('node:http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await httpGet(url);
      if (response.status === 200) return response;
    } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Server hazır olmadı (${url}): ${lastError?.message}`);
}

async function withLiveServer(env, run) {
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), 'docflow-live-'));
  const port = 3300 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ['server/src/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      STORAGE_DIR: storage,
      ADMIN_CODE: '',
      SESSION_SECRET: '',
      PUBLIC_ORIGIN: '',
      ALLOWED_ORIGINS: '',
      BASE_PATH: '',
      HOST: '',
      TRUST_PROXY_HOPS: '',
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(`${base}/healthz`);
    return await run({ base, port, storage, output: () => output, child });
  } finally {
    child.kill('SIGKILL');
    fs.rmSync(storage, { recursive: true, force: true });
  }
}

test('production-da heç bir env dəyişəni olmadan da sayt açılır', async () => {
  await withLiveServer({}, async ({ base, storage, output }) => {
    const health = await httpGet(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).status, 'ok');

    const home = await httpGet(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(home.body, /<div id="app">/);
    assert.match(home.body, /src="app\.js"/);

    const config = await httpGet(`${base}/api/config`);
    assert.equal(config.status, 200);

    // ADMIN_CODE/SESSION_SECRET avtomatik yaradılır və diskdə saxlanılır.
    assert.match(output(), /avtomatik yaradıldı: [A-Z2-9]{16}/);
    assert.ok(fs.existsSync(path.join(storage, '.session-secret')), 'session secret faylı yaradılmalıdır');
    assert.ok(fs.existsSync(path.join(storage, 'data.json')), 'auto admin code hash-i saxlanmalıdır');
  });
});

test('0706 development kodu production-da avtomatik güclü kodla əvəz olunur', async () => {
  await withLiveServer({ ADMIN_CODE: '0706' }, async ({ base, output }) => {
    assert.equal((await httpGet(`${base}/healthz`)).status, 200);

    const login = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: '0706' })
    });
    assert.equal(login.status, 401, '0706 production-da işləməməlidir');

    assert.match(output(), /avtomatik yaradıldı: [A-Z2-9]{16}/);
  });
});

test('BASE_PATH altında deploy edildikdə də sayt açılır', async () => {
  await withLiveServer({ BASE_PATH: '/docflow' }, async ({ base }) => {
    const redirected = await httpGet(`${base}/docflow`);
    assert.equal(redirected.status, 308);
    assert.equal(redirected.headers.location, '/docflow/');

    const health = await httpGet(`${base}/docflow/healthz`);
    assert.equal(health.status, 200);

    const config = await httpGet(`${base}/docflow/api/config`);
    assert.equal(config.status, 200);
    assert.equal(JSON.parse(config.body).basePath, '/docflow');

    const home = await httpGet(`${base}/docflow/`);
    assert.equal(home.status, 200);
    assert.match(home.body, /href="styles\.css"/);

    // Kök ünvan da işləməyə davam edir.
    assert.equal((await httpGet(`${base}/`)).status, 200);
  });
});
