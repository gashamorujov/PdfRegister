# Sənəd Axını

Azərbaycan dilində mobil-first sənəd qəbul sistemi. İstifadəçilər şəkilləri kamera və ya qalereyadan seçir, sistem onları PDF-ə çevirir; admin paneldən sənədlər idarə olunur. Firebase və Telegram inteqrasiyaları istəyə bağlıdır.

## Tələblər

- Node.js **22.x** və npm 10+
- Production üçün Docker Engine + Docker Compose tövsiyə olunur
- Kamera istifadəsi üçün HTTPS (və ya `localhost`)

## Local development

```bash
cp .env.example .env
npm ci
npm run check
npm test
npm start
```

Sayt `http://localhost:3000` ünvanında açılır. Local development admin kodu `.env`-dəki `ADMIN_CODE`-dur (`0706` yalnız development üçündür).

## Hər yerdə deploy etmək (PaaS, VPS, Docker)

Server `PORT` (default `3000`), `HOST` (default `0.0.0.0`), `NODE_ENV` və `BASE_PATH` dəyişənlərinə hörmət edir. Xüsusi environment dəyişəni verilməsə belə sayt açılır:

- `npm ci && npm start` — Node 20+ olan istənilən VPS, PaaS və ya bare-metal host.
- `docker compose up -d --build` və ya `docker build -t docflow . && docker run -p 3000:3000 docflow` — istənilən konteyner platforması.
- Hazır platforma faylları: `render.yaml` (Render), `fly.toml` (Fly.io), `railway.json` (Railway), `Procfile` + `app.json` (Heroku), `Dockerfile` (ümumi).
- Health/readiness yoxlaması: `GET /healthz`.

İlk işə düşmə davranışı:

- `SESSION_SECRET` boşdursa `storage/.session-secret` daxilində təsadüfi secret yaradılır və restart-lar arasında saxlanılır.
- `ADMIN_CODE` boşdursa və ya `.env.example`-dakı `0706` dəyərindədirsə (production-da) təsadüfi admin kodu yaradılır və **server log-una** yazılır; deploy loglarından götürüb dərhal dəyişin. `0706` production-da işləmir. Avtomatik kod hash-i `storage/`-da saxlanıldığı üçün restart-da dəyişmir və yenidən log-a düşmür.
- `storage/` yazıla bilmirsə (read-only və ya ephemeral fayl sistemi) server `os.tmpdir()`-ə keçir və xəbərdarlıq yazır — sayt yenə açılır, lakin məlumat restart zamanı itə bilər. Production üçün həmişə persistent volume/disk qoşun.
- Alt-qovluqda deploy edirsinizsə `BASE_PATH=/docflow` təyin edin; frontend API, PDF və statik fayl ünvanlarını avtomatik uyğunlaşdırır (`https://example.com/docflow/...`).
- Reverse proxy arxasındadırsa `TRUST_PROXY_HOPS=1` verin. Cookie-lər uyğunlaşır: HTTPS-də `Secure; SameSite=None`, düz HTTP-də `Secure`siz `SameSite=Lax` — yəni lokal/HTTP deployda da admin girişi işləyir.

## Production deploy — Docker Compose

1. Environment faylı yaradın və production dəyərləri daxil edin:

   ```bash
   cp .env.example .env
   ```

   `.env`-də ən azı bunları dəyişin:

   ```env
   NODE_ENV=production
   ADMIN_CODE=your-unique-admin-code-at-least-12-chars
   SESSION_SECRET=   # aşağıdakı komandadan yaradılmış 64 hex simvol
   PUBLIC_ORIGIN=https://your-domain.example
   TRUST_PROXY_HOPS=1
   ```

   Admin kodu və şifrələmə secret-i üçün təsadüfi dəyərlər yaradın; nəticələri `.env`-ə yazın:

   ```bash
   openssl rand -hex 8  # ADMIN_CODE üçün 16 simvolluq dəyər
   openssl rand -hex 32 # SESSION_SECRET üçün 64 simvolluq dəyər
   ```

   `ADMIN_CODE`/`SESSION_SECRET` verilməzsə (və ya `ADMIN_CODE=0706` olsa) server avtomatik güclü dəyərlər yaradır — yuxarıdaki bölməyə baxın. Açıq şəkildə verilən `ADMIN_CODE` ən azı 12 simvol olmalıdır, əks halda server xəta ilə dayanır. `SESSION_SECRET` ən azı 32 simvol olmalı və server yenidən başladıqdan sonra dəyişməməlidir; bu secret Telegram/MTProto məlumatlarını şifrələmək üçün istifadə olunur. Mövcud admin kodunu paneldən dəyişirsinizsə, production-da yeni kod da ən azı 12 simvol olmalıdır. `.env` faylını git repozitoriyasına əlavə etməyin.

2. Deploy edin:

   ```bash
   docker compose up -d --build
   docker compose ps
   curl http://localhost:3000/healthz
   ```

   Reverse proxy/CDN önündə HTTPS qurun; kamera üçün HTTPS tələb olunur. Birbaşa internetə TLS-siz çıxarmayın. Bir trusted reverse proxy varsa `TRUST_PROXY_HOPS=1`, birbaşa deploy-da `0` saxlayın. Əlavə cross-origin frontend istifadə olunursa, yalnız etibarlı origin-ləri `ALLOWED_ORIGINS`-ə vergüllə ayıraraq əlavə edin.

3. Yeniləmə və loglar:

   ```bash
   docker compose logs -f app
   docker compose up -d --build
   ```

Compose named volume `docflow_data` daxilində `storage/` qovluğunun JSON bazası, PDF faylları və admin sessiyası saxlanılır. Backup zamanı bu volume-u və `.env` faylını ayrıca qoruyub ehtiyat nüsxəsini yaradın. Backup bərpası zamanı `SESSION_SECRET` üçün əvvəlki dəyəri istifadə edin.

## Deploy without Docker

Node.js 22.x olan host-da `npm ci --omit=dev` işlədin, environment dəyişənlərini host secret manager-də təyin edin və `npm start` başladın. Hostun `PORT` dəyişənindən istifadə olunur. `storage/` qovluğu restart və redeploy arasında **persistent** olmalıdır.

## Layihə strukturu

```text
public/        Frontend (index.html, app.js, styles.css, ikonlar, manifest, nümunə şəkillər)
server/src/    Express API, PDF yaradılması, Telegram inteqrasiyası və testlər
docs/          Firebase qaydaları, data modeli, nginx nümunəsi
Dockerfile     Production image (Node 22, non-root istifadəçi, healthcheck)
compose.yaml   Persistent volume ilə single-instance deploy
Procfile       Heroku/Railway start əmri
render.yaml    Render blueprint (health check ilə)
fly.toml       Fly.io konfiqurasiyası (volume mount ilə)
railway.json   Railway deploy konfiqurasiyası
app.json       Heroku "Deploy to Heroku" düyməsi üçün
.nvmrc         Node 22 (nvm/Fly/Render üçün)
```

## Platforma və persistence qeydləri

Bu paket Dockerfile və `compose.yaml` ilə standart Docker host-larına uyğun hazırlanıb. JSON database və sənəd faylları lokal `storage/` qovluğunda saxlanıldığı üçün hazır versiya **single-instance/single-replica** deploy üçündür. Serverless və ya ephemeral filesystem istifadə edən platformada persistent volume attach etmədən deploy etməyin; əks halda restart zamanı məlumatlar itə bilər. Üfüqi miqyaslama üçün ortaq verilənlər bazası və obyekt saxlanması adapteri əlavə edilməlidir. Firebase Admin service-account credentials qoşulduqda sənəd metadata-sı Realtime Database-ə yazılır, admin siyahısı Firebase dəyişikliklərini canlı dinləyir. PDF serverdə və Telegram kanalında saxlanır; server faylı olmadıqda admin PDF-i Telegram `file_id` ilə oxuya bilər. Telegram və Firebase üçün onların müvafiq secret-ləri hostun secret manager-ində qurulmalıdır.

## Environment variables

| Dəyişən | Tələb | Təsviri |
|---|---:|---|
| `NODE_ENV` | Production-da | `production` olduqda güclü admin kodu və session secret yoxlanılır |
| `PORT` | Xeyr | Server portu; default `3000` (PaaS platformaları özləri verir) |
| `HOST` | Xeyr | Bind olunacaq host; default `0.0.0.0` |
| `BASE_PATH` | Xeyr | Alt-qovluq deployu, məsələn `/docflow`; boş olduqda domain kökü |
| `ADMIN_CODE` | Production-da | Unikal admin kodu, ən azı 12 simvol |
| `SESSION_SECRET` | Production-da | Ən azı 32 simvolluq təsadüfi secret; Telegram/MTProto məlumatlarını şifrələyir |
| `PUBLIC_ORIGIN` | Tövsiyə olunur | Public sayt origin-i, məsələn `https://docs.example.com` |
| `ALLOWED_ORIGINS` | Xeyr | Əlavə etibarlı frontend origin-ləri, vergüllə ayrılmış |
| `TRUST_PROXY_HOPS` | Proxy olduqda | Etibarlı reverse proxy sayı; adətən `1` |
| `MAX_UPLOAD_MB` | Xeyr | Hər şəkil üçün maksimum fayl ölçüsü; default `15` MB |
| `STORAGE_DIR` | Xeyr | Persistent məlumat qovluğunun yolu; default layihədəki `storage/` |
| `FIREBASE_*` | Firebase real-time üçün | Project ID, service-account email/private key, Realtime Database URL və Storage bucket; private key-i yalnız hosting secrets-də saxlayın |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | Xeyr | Telegram Bot API sinxronizasiyası |
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` | Xeyr | Telegram MTProto inteqrasiyası |

## Health və security

- `GET /healthz` sadə readiness/health statusu qaytarır; Docker HEALTHCHECK bu endpoint-i yoxlayır.
- Frontend sərt `Content-Security-Policy` ilə verilir (inline script/style yoxdur, yalnız `'self'`); kamera üçün `Permissions-Policy: camera=(self)` göndərilir.
- Nümunə şəkilləri 7 gün keşlənir, `app.js`/`styles.css` isə hər açılışda yenidən yoxlanılır (deploy-dan sonra köhnə versiya qalmır).
- Admin session random, opaque token-dur; serverdə yalnız SHA-256 hash saxlanır. Çıxış zamanı sessiya tokeni etibarsız edilir.
- Admin POST/PATCH/DELETE sorğularında Origin yoxlanır; CORS yalnız same-origin və konfiqurasiya edilmiş origin-lərə açılır.
- Production-da zəif və ya buraxılmış `ADMIN_CODE` və `SESSION_SECRET` serverin işə düşməsini dayandırır.
- JSON store faylı atomik yazılır; production database faylı zədəlidirsə səssizcə boş store yaratmaq əvəzinə serverin işə düşməsi dayandırılır.
- Firebase rules nümunəsi `docs/firebase.rules.json` içindədir; deploy zamanı Firebase-də tətbiq edin.

İstehsalat mühitində hər hansı xarici inteqrasiyanı aktiv etməzdən əvvəl onun credential-larını platformanın secret manager-ində qurun. Heç bir `.env`, API key və ya Telegram session faylını arxivə/repoya yükləməyin.


## Vercel, Netlify və statik hostlar

- Vercel Express tətbiqini repozitoriyanın kökündəki `index.js` faylından başladır; statik fayllar `public/` qovluğundadır.
- Netlify konfiqurasiyası `netlify.toml` və `netlify/functions/api.js` vasitəsilə `/api/*` və `/files/*` sorğularını Express tətbiqinə yönləndirir. GitHub deploy-da build əmri `npm run check`, publish qovluğu `public` olmalıdır.
- EdgeOne kimi sadə statik hostlarda repozitoriyanın kökünü deploy edin. Kökdəki `index.html` tətbiqin ekranını açır, amma statik host özü API serveri yaratmır; sənəd göndərmə və admin əməliyyatları üçün Node.js serveri və ya platformanın funksiyaları lazımdır.
- Vercel və Netlify funksiyalarının lokal fayl sistemi davamlı disk deyil. Sənədlərin, bazanın və admin sessiyasının redeploy/restart sonrası qalması üçün persistent saxlama qoşun. Serverless mühitdə `storage/`-a yazılan məlumatlara davamlı saxlama zəmanəti yoxdur.
- Deploy-u repozitoriyanın kökündən edin və `package.json`-dakı Node.js tələbinə uyğun runtime seçin.
