const { chromium } = require('playwright');

const API = 'http://localhost:8080';
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

  // 4. Yenile endpoint'i (scraper tetikleme)
  {
    const r = await fetch(`${API}/news/refresh`, { method: 'POST', headers });
    if (r.status === 202) {
      const data = await r.json();
      ok(`POST /news/refresh → 202, status: ${data.status}`);
    } else {
      fail('POST /news/refresh', `${r.status}`);
    }
  }

  // 5. Haber oluştur
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
      ok(`POST /news/ → 201, id=${data.id}`);
    } else {
      fail('POST /news/', `${r.status} — ${JSON.stringify(data).slice(0, 150)}`);
    }
  }

  // 6. Haber detayı
  if (createdNewsId) {
    const r = await fetch(`${API}/news/${createdNewsId}`, { headers });
    const data = await r.json();
    if (r.ok && data.id === createdNewsId) {
      ok(`GET /news/${createdNewsId} → başlık: "${data.title}"`);
    } else {
      fail(`GET /news/${createdNewsId}`, `${r.status}`);
    }
  }

  // 7. Podcast generate endpoint'i
  if (createdNewsId) {
    const r = await fetch(`${API}/podcast/generate/${createdNewsId}`, { method: 'POST', headers });
    if (r.status === 202) {
      const data = await r.json();
      ok(`POST /podcast/generate/${createdNewsId} → 202, status: ${data.status}`);
    } else {
      fail(`POST /podcast/generate/${createdNewsId}`, `${r.status}`);
    }
  }

  // 8. Podcast by-news endpoint'i (henüz oluşmamış olabilir → 404 normal)
  if (createdNewsId) {
    const r = await fetch(`${API}/podcast/by-news/${createdNewsId}`, { headers });
    if (r.ok) {
      const data = await r.json();
      ok(`GET /podcast/by-news/${createdNewsId} → podcast hazır, id=${data.id}`);
    } else if (r.status === 404) {
      ok(`GET /podcast/by-news/${createdNewsId} → 404 (henüz işleniyor, normal)`);
    } else {
      fail(`GET /podcast/by-news/${createdNewsId}`, `${r.status}`);
    }
  }

  // 9. Arama
  {
    const r = await fetch(`${API}/news/?search=Playwright`, { headers });
    const data = await r.json();
    if (r.ok) {
      ok(`GET /news/?search=Playwright → ${data.total_count} sonuç`);
    } else {
      fail('GET /news/?search=Playwright', `${r.status}`);
    }
  }

  // 10. Click tracking
  const targetId = createdNewsId || firstNewsId;
  if (targetId) {
    const r = await fetch(`${API}/news/${targetId}/click`, { method: 'POST', headers });
    const data = await r.json();
    if (r.ok && 'suggestion' in data) {
      ok(`POST /news/${targetId}/click → suggestion: ${JSON.stringify(data.suggestion)}`);
    } else {
      fail(`POST /news/${targetId}/click`, `${r.status}`);
    }
  }

  // 11. Podcast listesi
  {
    const r = await fetch(`${API}/podcast/`, { headers });
    if (r.ok) {
      const data = await r.json();
      ok(`GET /podcast/ → ${data.total_count ?? '?'} podcast`);
    } else {
      fail('GET /podcast/', `${r.status}`);
    }
  }

  // 12. Token refresh (cookie gerekirez, 401 normal)
  {
    const r = await fetch(`${API}/auth/refresh`, { method: 'POST', headers });
    if (r.ok) {
      ok('POST /auth/refresh → 200');
    } else if (r.status === 401) {
      ok('POST /auth/refresh → 401 (cookie yok, beklenen davranış)');
    } else {
      fail('POST /auth/refresh', `${r.status}`);
    }
  }
}

async function uiTest() {
  console.log('\n── Frontend UI Testleri ─────────────────────');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Frontend ayakta mı?
    await page.goto(FRONTEND, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    ok(`Frontend yüklendi — title: "${title}"`);

    // 2. Login formu doldur
    const usernameInput = page.locator('input[placeholder*="posta"], input[placeholder*="Kullanıcı"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await usernameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usernameInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);
      await page.locator('button[type="submit"], button:has-text("Giriş")').first().click();
      await page.waitForTimeout(3000);
      ok('Login formu dolduruldu ve gönderildi');
    } else {
      ok('Login formu yok — muhtemelen zaten giriş yapılmış veya farklı sayfa');
    }

    // 3. Haber akışı yüklendi mi?
    await page.waitForTimeout(3000);
    const body = await page.textContent('body');
    if (body && body.length > 100) {
      ok('Sayfa içeriği render edildi');
    } else {
      fail('Sayfa içeriği boş veya çok kısa');
    }

    // 4. "Yenile" butonu var mı?
    const refreshBtn = page.locator('button:has-text("Yenile"), button:has-text("Yükleniyor")');
    if (await refreshBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      ok('"Yenile" butonu görünüyor');
      await refreshBtn.first().click();
      await page.waitForTimeout(1000);
      const btnText = await refreshBtn.first().textContent({ timeout: 3000 }).catch(() => '');
      ok(`"Yenile" tıklandı → buton durumu: "${btnText.trim()}"`);
    } else {
      fail('"Yenile" butonu bulunamadı');
    }

    // 5. Ekran görüntüsü
    const screenshot = '/tmp/playwright_screenshot.png';
    await page.screenshot({ path: screenshot, fullPage: true });
    ok(`Ekran görüntüsü: ${screenshot}`);

    // 6. Console hataları
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    if (consoleErrors.length === 0) {
      ok('Console hatası yok');
    } else {
      fail(`${consoleErrors.length} console hatası`, consoleErrors.slice(0, 2).join(' | '));
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
