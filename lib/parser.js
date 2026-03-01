const SAMPLE_ITEMS = [
  { name: 'Vintage Tee', price: 'RM35', status: 'AVAILABLE' },
  { name: 'Denim Jacket', price: 'RM80', status: 'SOLD' },
  { name: 'Canvas Tote', price: 'RM25', status: 'AVAILABLE' },
];

export function isValidThreadsUrl(input) {
  try {
    const url = new URL(input);
    const validHosts = new Set(['threads.net', 'www.threads.net']);
    return (url.protocol === 'https:' || url.protocol === 'http:') && validHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function normalizePrice(raw) {
  if (!raw) return 'Price not found';
  const clean = raw.replace(/\s+/g, '').toUpperCase();

  if (/^(RM|MYR)\d+(\.\d{1,2})?$/.test(clean)) {
    return clean.startsWith('MYR') ? `RM${clean.slice(3)}` : clean;
  }

  if (/^\d+(\.\d{1,2})?$/.test(clean)) {
    return `RM${clean}`;
  }

  return raw.trim();
}

function inferStatus(text) {
  const t = text.toLowerCase();
  if (/\b(sold|taken|booked|out)\b/.test(t)) return 'SOLD';
  return 'AVAILABLE';
}

function parseItemsFromText(text) {
  const lines = text
    .split(/\n|•|\u2022|\||;/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  const priceRegex = /((?:RM|MYR)\s?\d+(?:\.\d{1,2})?|\b\d+(?:\.\d{1,2})?\b)/i;

  for (const line of lines) {
    const priceMatch = line.match(priceRegex);
    if (!priceMatch) continue;

    const priceRaw = priceMatch[1];
    const name = line
      .replace(priceRaw, '')
      .replace(/[-,:()]/g, ' ')
      .replace(/\b(available|sold|rm|myr)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name || name.length < 2) continue;

    items.push({
      name,
      price: normalizePrice(priceRaw),
      status: inferStatus(line),
    });

    if (items.length >= 20) break;
  }

  return items;
}

function extractTextFromHtml(html) {
  const metaDescription = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';

  return [metaDescription, ogDescription, title].filter(Boolean).join('\n');
}

export async function parseThreadsPost(url) {
  const warnings = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SayajualBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!response.ok) {
      warnings.push(`Unable to fetch post content (${response.status}).`);
      return { items: SAMPLE_ITEMS, warnings, usedSample: true };
    }

    const html = await response.text();
    const extractedText = extractTextFromHtml(html);

    if (!extractedText) {
      warnings.push('No readable post text found. Showing a sample preview.');
      return { items: SAMPLE_ITEMS, warnings, usedSample: true };
    }

    const parsedItems = parseItemsFromText(extractedText);

    if (!parsedItems.length) {
      warnings.push('Could not detect item + price pairs. Showing a sample preview.');
      return { items: SAMPLE_ITEMS, warnings, usedSample: true };
    }

    return { items: parsedItems, warnings, usedSample: false };
  } catch {
    warnings.push('Post fetch failed. Showing a sample preview.');
    return { items: SAMPLE_ITEMS, warnings, usedSample: true };
  }
}
