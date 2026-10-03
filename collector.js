import { setTimeout as wait } from "node:timers/promises";

const decode = (value) => value.replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[\da-f]+|\d+);/gi, (entity) => {
  const named = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
  if (named[entity]) return named[entity];
  const number = entity[2].toLowerCase() === "x" ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10);
  return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : "";
});
const clean = (value = "") => value.replace(/\s+/g, " ").trim();
const text = (value = "") => clean(decode(value.replace(/<[^>]*>/g, " ")));
export const normalize = (value = "") => value.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
const numbered = (base, parameter, count) => [base, ...Array.from({ length: count - 1 }, (_, index) => `${base}?${parameter}=${index + 2}`)];
const linkedInKeywords = [
  "human resources intern", "recruitment intern", "corporate communication", "communications intern",
  "journalist", "reporter", "editor", "magazine editor", "social media intern", "content intern",
  "public relations intern", "digital marketing intern", "employer branding intern", "copywriter",
  "internship", "long term intern", "management trainee", "graduate program",
  "insan kaynakları stajyer", "kurumsal iletişim", "sosyal medya stajyer", "muhabir", "editör stajyer"
];

export function slugifyLocation(location) {
  return normalize(location).replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-");
}

export function createSources(location = "İstanbul") {
  const selected = clean(location) || "İstanbul";
  const allTurkey = /^(tüm türkiye|turkiye|türkiye)$/i.test(selected);
  const slug = slugifyLocation(selected);
  const youthallBase = allTurkey ? "https://www.youthall.com/tr/is-ilanlari/" : `https://www.youthall.com/tr/is-ilanlari/${slug}/`;
  const isinolsunBase = allTurkey ? "https://isinolsun.com/is-ilanlari" : `https://isinolsun.com/is-ilanlari/${slug}`;
  const kariyerBase = allTurkey ? "https://www.kariyer.net/is-ilanlari" : `https://www.kariyer.net/is-ilanlari/${slug}`;
  const linkedInLocation = allTurkey ? "Türkiye" : `${selected}, Türkiye`;
  return [
    { id: "youthall", name: "Youthall", url: youthallBase, urls: allTurkey ? [youthallBase, `${youthallBase}stajyer/`] : [youthallBase, `https://www.youthall.com/tr/is-ilanlari/${slug}-stajyer/`], host: "youthall.com", pattern: /^\/(tr|en)\/[^/]+\/[^/]+_\d+\/?$/ },
    { id: "isinolsun", name: "İşin Olsun", url: isinolsunBase, urls: numbered(isinolsunBase, "pn", 12), host: "isinolsun.com", pattern: /^\/is-ilani\/[^/]+/ },
    { id: "kariyer", name: "Kariyer.net", url: kariyerBase, urls: numbered(kariyerBase, "cp", 6), host: "kariyer.net", pattern: /^\/is-ilani\/[^/]+/ },
    { id: "linkedin", name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=internship&location=${encodeURIComponent(linkedInLocation)}`, urls: linkedInKeywords.map((keyword) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(linkedInLocation)}`), host: "linkedin.com", pattern: /^\/jobs\/view\/[^/]+/ }
  ];
}

export const sources = createSources("İstanbul");

function classify(title) {
  const value = normalize(title);
  const careerArea = /insan kaynak|ise alim|yetenek kazan|recruit|human resources|talent acquisition|kurumsal iletisim|iletisim|communication|halkla iliskiler|public relations|muhabir|gazeteci|journalist|reporter|editor|editorial|gazete|dergi|medya|media|sosyal medya|social media|icerik|content|metin yazar|copywriter|reklam|advertis|pazarlama|marketing|marka|brand|isveren marka|employer brand/.test(value);
  const generalProgram = /staj|stajyer|intern|internship|trainee|management trainee|graduate program|genc yetenek|young talent|uzun donem|long term/.test(value);
  const senior = /senior|director|manager|mudur|direktor|head of|\blead\b|yonetici|chief/.test(value);
  return (careerArea || generalProgram) && !senior;
}

function makeItem(source, values) {
  return { url: values.url, title: clean(values.title).slice(0, 220), description: clean(values.description).slice(0, 1200), company: clean(values.company), location: clean(values.location), source: source.name, sourceId: source.id, relevant: classify(values.title), seenAt: new Date().toISOString() };
}

function parseIsinOlsun(html, source) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) return [];
  try {
    const jobs = JSON.parse(match[1])?.props?.pageProps?.jobs;
    if (!Array.isArray(jobs)) return [];
    return jobs.flatMap((job) => {
      if (!job.shareUrl || !job.positionName) return [];
      let url;
      try { url = new URL(job.shareUrl, source.url); } catch { return []; }
      if (url.protocol !== "https:" || !(url.hostname === source.host || url.hostname.endsWith(`.${source.host}`)) || !source.pattern.test(url.pathname)) return [];
      url.search = ""; url.hash = "";
      return [makeItem(source, { url: url.href, title: job.positionName, company: job.companyName || "", location: job.shortAddress || [job.townName, job.cityName].filter(Boolean).join(", "), description: [job.positionName, job.companyName, job.shortAddress, job.durationDayText, job.isNew ? "Yeni" : ""].filter(Boolean).join(" · ") })];
    });
  } catch { return []; }
}

export function parse(html, source) {
  const found = new Map();
  if (source.id === "isinolsun") {
    for (const item of parseIsinOlsun(html, source)) found.set(item.url, item);
    if (found.size) return [...found.values()];
  }
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  for (const match of withoutScripts.matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)) {
    let url;
    try { url = new URL(decode(match[2]), source.url); } catch { continue; }
    if (url.protocol !== "https:" || !(url.hostname === source.host || url.hostname.endsWith(`.${source.host}`)) || !source.pattern.test(url.pathname)) continue;
    url.search = ""; url.hash = "";
    const body = match[4];
    const heading = body.match(/<h[23456]\b[^>]*>([\s\S]*?)<\/h[23456]>/i)?.[1] || body.match(/<span\b[^>]*data-test="ad-card-title"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
    const title = text(heading || body);
    if (title.length < 4) continue;
    const description = text(body);
    const company = text(body.match(/<span\b[^>]*data-test="subtitle"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || body.match(/alt=["']([^"']+) logo["']/i)?.[1] || "");
    const location = text(body.match(/<span\b[^>]*data-test="location"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || (normalize(description).includes("istanbul") ? "İstanbul" : ""));
    if (!found.has(url.href)) found.set(url.href, makeItem(source, { url: url.href, title, description, company, location }));
  }
  return [...found.values()];
}

async function fetchPage(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: "text/html,application/xhtml+xml", "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.7", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) { lastError = error; if (attempt < attempts) await wait(900 * attempt); }
  }
  throw lastError;
}

export async function collect(source) {
  const found = new Map();
  const errors = [];
  let pagesRead = 0;
  for (const url of source.urls || [source.url]) {
    try {
      const html = await fetchPage(url);
      pagesRead += 1;
      for (const item of parse(html, source)) found.set(item.url, item);
    } catch (error) { errors.push(error.message); }
    if ((source.urls?.length || 1) > 2) await wait(450);
  }
  const jobs = [...found.values()];
  if (!pagesRead) throw new Error("Kaynağa ulaşılamadı");
  if (!jobs.length) throw new Error("İlan bağlantısı okunamadı; sayfa yapısı değişmiş olabilir");
  return { jobs, pagesRead, pagesFailed: errors.length };
}
