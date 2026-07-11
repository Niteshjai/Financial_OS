const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// HD Bank Logo Downloader — Direct CDN URLs
// Uses known high-quality logo sources for Indian banks
// ═══════════════════════════════════════════════════════════════

const dir = path.join(__dirname, 'assetmap/frontend/public/logos');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Direct URLs to known HD logo sources
const logos = {
  'hdfc':     [
    'https://companieslogo.com/img/orig/HDB-bb6320df.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/200px-HDFC_Bank_Logo.svg.png',
    'https://cdn.iconscout.com/icon/free/png-256/free-hdfc-bank-logo-icon-download-in-svg-png-gif-file-formats--banking-finance-indian-banks-logos-icons-pack-business-2249013.png',
  ],
  'sbi':      [
    'https://companieslogo.com/img/orig/SBIN.NS-7292a727.png',
    'https://cdn.iconscout.com/icon/free/png-256/free-state-bank-of-india-logo-icon-download-in-svg-png-gif-file-formats--sbi-banking-finance-indian-banks-logos-icons-pack-business-2249006.png',
  ],
  'icici':    [
    'https://companieslogo.com/img/orig/IBN-83ad118b.png',
    'https://cdn.iconscout.com/icon/free/png-256/free-icici-bank-logo-icon-download-in-svg-png-gif-file-formats--banking-finance-indian-banks-logos-icons-pack-business-2249016.png',
  ],
  'axis':     [
    'https://companieslogo.com/img/orig/AXISBANK.NS-20e1e904.png',
    'https://cdn.iconscout.com/icon/free/png-256/free-axis-bank-logo-icon-download-in-svg-png-gif-file-formats--banking-finance-indian-banks-logos-icons-pack-business-2249019.png',
  ],
  'kotak':    [
    'https://companieslogo.com/img/orig/KOTAKBANK.NS-d947d0d6.png',
    'https://cdn.iconscout.com/icon/free/png-256/free-kotak-mahindra-bank-logo-icon-download-in-svg-png-gif-file-formats--banking-finance-indian-banks-logos-icons-pack-business-2249015.png',
  ],
  'yes':      [
    'https://companieslogo.com/img/orig/YESBANK.NS-de0e119b.png',
    'https://cdn.iconscout.com/icon/free/png-256/free-yes-bank-logo-icon-download-in-svg-png-gif-file-formats--banking-finance-indian-banks-logos-icons-pack-business-2249010.png',
  ],
  'indusind': [
    'https://companieslogo.com/img/orig/INDUSINDBK.NS-92ef89e0.png',
  ],
  'pnb':      [
    'https://companieslogo.com/img/orig/PNB.NS-1e3e1e05.png',
  ],
  'zerodha':  [
    'https://companieslogo.com/img/orig/Zerodha-9e57fe5c.png',
    'https://cdn.iconscout.com/icon/free/png-256/free-zerodha-logo-icon-download-in-svg-png-gif-file-formats--broking-brokerage-trading-indian-financial-companies-logos-icons-pack-business-2249001.png',
  ],
  'groww':    [
    'https://companieslogo.com/img/orig/groww-44eb00a7.png',
  ],
  'lic':      [
    'https://companieslogo.com/img/orig/LICI.NS-045dc846.png',
  ],
  'goldman':  [
    'https://companieslogo.com/img/orig/GS-17b542d7.png',
  ],
  'hsbc':     [
    'https://companieslogo.com/img/orig/HSBC-3056b7c8.png',
  ],
};

const MIN_SIZE = 2000;

function download(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) { reject(new Error('Too many redirects')); return; }

    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/png,image/*,*/*',
      },
      timeout: 15000,
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        const loc = response.headers.location;
        if (loc) {
          const nextUrl = loc.startsWith('http') ? loc : new URL(loc, url).href;
          download(nextUrl, dest, maxRedirects - 1).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < MIN_SIZE) {
          reject(new Error(`Too small: ${buffer.length} bytes`));
          return;
        }
        fs.writeFileSync(dest, buffer);
        resolve(buffer.length);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function downloadLogo(name, urls) {
  const dest = path.join(dir, `${name}.png`);

  // Check if we already have a good logo
  if (fs.existsSync(dest)) {
    const stats = fs.statSync(dest);
    if (stats.size >= MIN_SIZE) {
      console.log(`⏩ ${name} — Already have HD logo (${stats.size} bytes)`);
      return;
    }
  }

  for (const url of urls) {
    try {
      const size = await download(url, dest);
      console.log(`✅ ${name} — Downloaded (${size} bytes)`);
      return;
    } catch (e) {
      console.log(`   ${name} — ${e.message} — ${url.substring(0, 60)}...`);
    }
  }

  // Final fallback: Google Favicon API
  const googleUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${name}.com&size=256`;
  try {
    const size = await download(googleUrl, dest);
    console.log(`✅ ${name} — Google Favicon fallback (${size} bytes)`);
    return;
  } catch (e) {
    // ignore
  }

  console.log(`❌ ${name} — ALL SOURCES FAILED`);
}

async function main() {
  console.log('\n🏦 Downloading HD logos...\n');

  for (const [name, urls] of Object.entries(logos)) {
    await downloadLogo(name, urls);
  }

  console.log('\n📊 Final file sizes:\n');
  const files = fs.readdirSync(dir);
  for (const f of files.sort()) {
    const stats = fs.statSync(path.join(dir, f));
    const icon = stats.size >= MIN_SIZE ? '✅' : '⚠️ ';
    console.log(`  ${icon} ${f}: ${(stats.size / 1024).toFixed(1)} KB`);
  }
}

main().catch(console.error);
