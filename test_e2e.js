const { chromium } = require('playwright');

const API = 'http://localhost:8081';
const FRONTEND = 'http://localhost:5173';
const EMAIL = 'cihan@cihan.com';
const PASSWORD = 'cihan';

let passed = 0;
let failed = 0;
const issues = [];

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label, detail = '') {
  console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
  failed++;
  issues.push(`${label}${detail ? ' — ' + detail : ''}`);
}

async function apiTest() {
  console.log('\n── API Testleri ─────────────────────────────');
  const fetch = (await import('node-fetch')).default;

  // 1. Login
  let token;
  {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${EMAIL}&password=${PASSWORD}`,
    });
    const data = await r.json();
    if (r.ok && data.access_token) {
      token = data.access_token;
      ok('POST /auth/login → 200, access_token alındı');
    } else {
      fail('POST /auth/login', JSON.stringify(data));
    }
  }

  if (!token) return;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Kategoriler
  {
    const r = await fetch(`${API}/categories/`, { headers });
    const data = await r.json();
    if (r.ok && Array.isArray(data) && data.length > 0) {
      ok(`GET /categories/ → ${data.length} kategori`);
    } else {
      fail('GET /categories/', `${r.status} — ${JSON.stringify(data).slice(0, 100)}`);
    }
  }

  // 3. Haber listesi
  let firstNewsId;
  {
    const r = await fetch(`${API}/news/`, { headers });
    const data = await r.json();
    if (r.ok && data.items !== undefined) {
      firstNewsId = data.items[0]?.id;
      ok(`GET /news/ → ${data.total_count} haber (sayfa ${data.page})`);
    } else {
      fail('GET /news/', `${r.status}`);
    }
  }

  // 4. Haber oluştur (Celery tetiklenecek)
  let createdNewsId;
  {
    const r = await fetch(`${API}/news/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Playwright Test Haberi',
        content: 'Bu haber Playwright E2E testi sırasında otomatik oluşturulmuştur. Yapay zeka bu metni özetleyecek ve sese dönüştürecek.',
        category_id: 1,
        source_url: 'https://test.example.com/playwright-test',
      }),
    });
    const data = await r.json();
    if (r.status === 201 && data.id) {
      createdNewsId = data.id;
      ok(`POST /news/ → 201, id=${data.id} (Celery task tetiklendi)`);
    } else {
      fail('POST /news/', `${r.status} — ${JSON.stringify(data).slice(0, 150)}`);
    }
  }

  // 5. Haber detayı
  if (createdNewsId) {
    const r = await fetch(`${API}/news/${createdNewsId}`, { headers });
    const data = await r.json();
    if (r.ok && data.id === createdNewsId) {
      ok(`GET /news/${createdNewsId} → başlık: "${data.title}"`);
    } else {
      fail(`GET /news/${createdNewsId}`, `${r.status}`);
    }
  }

  // 6. Arama (title-based, embedding henüz üretilmemiş olabilir)
  {
    const r = await fetch(`${API}/news/?search=Playwright`, { headers });
    const data = await r.json();
    if (r.ok) {
      ok(`GET /news/?search=Playwright → ${data.total_count} sonuç`);
    } else {
      fail('GET /news/?search=Playwright', `${r.status} — ${JSON.stringify(data).slice(0, 100)}`);
    }
  }

  // 7. Kategori filtresi
  {
    const r = await fetch(`${API}/news/?category_id=1`, { headers });
    const data = await r.json();
    if (r.ok) {
      ok(`GET /news/?category_id=1 → ${data.total_count} haber`);
    } else {
      fail('GET /news/?category_id=1', `${r.status}`);
    }
  }

  // 8. Click tracking
  const targetId = createdNewsId || firstNewsId;
  if (targetId) {
    const r = await fetch(`${API}/news/${targetId}/click`, { method: 'POST', headers });
    const data = await r.json();
    if (r.ok && 'suggestion' in data) {
      ok(`POST /news/${targetId}/click → suggestion: ${JSON.stringify(data.suggestion)}`);
    } else {
      fail(`POST /news/${targetId}/click`, `${r.status} — ${JSON.stringify(data).slice(0, 100)}`);
    }
  }

  // 9. Podcast listesi
  {
    const r = await fetch(`${API}/podcast/`, { headers });
    if (r.ok) {
      const data = await r.json();
      ok(`GET /podcast/ → ${data.total_count ?? data.length ?? '?'} podcast`);
    } else {
      fail('GET /podcast/', `${r.status}`);
    }
  }

  // 10. Token refresh
  {
    const r = await fetch(`${API}/auth/refresh`, { method: 'POST', headers });
    if (r.ok) {
      ok('POST /auth/refresh → 200');
    } else {
      fail('POST /auth/refresh', `${r.status} (cookie yoksa normal)`);
    }
  }
}

async function uiTest() {
  console.log('\n── Frontend UI Testleri ─────────────────────');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Frontend ayakta mı?
    await page.goto(FRONTEND, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const title = await page.title();
    ok(`Frontend yüklendi — title: "${title}"`);

    // 2. Sayfa içeriği var mı?
    const body = await page.textContent('body');
    if (body && body.length > 50) {
      ok('Sayfa içeriği render edildi');
    } else {
      fail('Sayfa içeriği boş veya çok kısa');
    }

    // 3. Console hataları var mı?
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.waitForTimeout(2000);

    if (consoleErrors.length === 0) {
      ok('Console hatası yok');
    } else {
      fail(`${consoleErrors.length} console hatası`, consoleErrors.slice(0, 2).join(' | '));
    }

    // 4. Sayfa yapısını tara
    const screenshot = '/tmp/playwright_screenshot.png';
    await page.screenshot({ path: screenshot, fullPage: true });
    ok(`Ekran görüntüsü alındı: ${screenshot}`);

    // 5. Input/form elementleri var mı?
    const inputs = await page.$$('input');
    const buttons = await page.$$('button');
    ok(`Formda ${inputs.length} input, ${buttons.length} buton bulundu`);

    // 6. API bağlantısı - network request var mı?
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('localhost:8081') || req.url().includes('/api/')) {
        requests.push(req.url());
      }
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 10000 });

    if (requests.length > 0) {
      ok(`API'ye ${requests.length} istek gönderildi`);
    } else {
      fail('Sayfa API\'ye hiç istek göndermedi (giriş yapılmamış olabilir)');
    }

  } catch (e) {
    fail('Frontend testi', e.message);
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log('═══════════════════════════════════════════════');
  console.log('  AI News Bulletin — E2E Test');
  console.log(`  ${EMAIL} / ${PASSWORD}`);
  console.log('═══════════════════════════════════════════════');

  await apiTest();
  await uiTest();

  console.log('\n── Sonuç ───────────────────────────────────────');
  console.log(`  Geçen : ${passed}`);
  console.log(`  Hata  : ${failed}`);
  if (issues.length > 0) {
    console.log('\n  Sorunlar:');
    issues.forEach(i => console.log(`    • ${i}`));
  }
  console.log('═══════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
})();
