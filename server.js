import http from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createSources, collect } from "./collector.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataDir = join(root, "data");
const listingsFile = join(dataDir, "listings.json");
const settingsFile = join(dataDir, "settings.json");
await mkdir(dataDir, { recursive: true });

let settings = { location: "İstanbul" };
try { settings = { ...settings, ...JSON.parse(await readFile(settingsFile, "utf8")) }; } catch (error) { if (error.code !== "ENOENT") console.error("Ayarlar okunamadı:", error.message); }
let state = { jobs: [], sources: [], lastScan: null, scanning: false, location: settings.location };
try {
  const saved = JSON.parse(await readFile(listingsFile, "utf8"));
  if (saved.location === settings.location) state = { ...state, ...saved, scanning: false };
} catch (error) { if (error.code !== "ENOENT") console.error("Kayıt okunamadı:", error.message); }

let pending;
async function persistState() {
  await writeFile(join(dataDir, "listings.tmp"), JSON.stringify(state, null, 2));
  await rename(join(dataDir, "listings.tmp"), listingsFile);
}

function scan() {
  if (pending) return pending;
  pending = (async () => {
    state.scanning = true;
    const scanLocation = settings.location;
    const scanSources = createSources(scanLocation);
    const activeSourceIds = new Set(scanSources.map((source) => source.id));
    state.jobs = state.jobs.filter((job) => activeSourceIds.has(job.sourceId));
    state.sources = state.sources.filter((source) => activeSourceIds.has(source.id));
    await Promise.all(scanSources.map(async (source) => {
      let status = { id: source.id, name: source.name, url: source.url, checkedAt: new Date().toISOString() };
      try {
        const { jobs, pagesRead, pagesFailed } = await collect(source);
        const previous = state.jobs.filter((job) => job.sourceId === source.id);
        const sourceJobs = pagesFailed ? [...new Map([...jobs, ...previous].map((job) => [job.url, job])).values()] : jobs;
        state.jobs = [...state.jobs.filter((job) => job.sourceId !== source.id), ...sourceJobs];
        status = { ...status, ok: true, count: sourceJobs.length, message: `${sourceJobs.length} ilan · ${pagesRead} sayfa${pagesFailed ? ` · ${pagesFailed} sayfa alınamadı, önceki kayıtlar korundu` : ""}` };
      } catch (error) {
        status = { ...status, ok: false, count: state.jobs.filter((job) => job.sourceId === source.id).length, message: error.message };
      }
      state.sources = [...state.sources.filter((item) => item.id !== source.id), status];
    }));
    state.location = scanLocation;
    state.lastScan = new Date().toISOString();
    state.scanning = false;
    await persistState();
    console.log(`${scanLocation}: ${state.jobs.length} ilan; ${state.sources.map((source) => `${source.name}: ${source.message}`).join(" | ")}`);
  })().catch((error) => { state.scanning = false; console.error(error); }).finally(() => { pending = null; });
  return pending;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; if (body.length > 4096) reject(new Error("İstek çok büyük")); });
    request.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Geçersiz JSON")); } });
    request.on("error", reject);
  });
}

function validLocation(value) {
  return typeof value === "string" && /^[\p{L}\s'-]{2,60}$/u.test(value.trim());
}

const files = { "/": ["index.html", "text/html"], "/app.js": ["app.js", "text/javascript"], "/style.css": ["style.css", "text/css"], "/icon.svg": ["../icon.svg", "image/svg+xml"] };
const server = http.createServer(async (request, response) => {
  const origin = `http://${request.headers.host}`;
  if (!/^127\.0\.0\.1:4310$|^localhost:4310$/.test(request.headers.host || "")) { response.writeHead(403).end(); return; }
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  const path = new URL(request.url, origin).pathname;

  if (request.method === "GET" && path === "/api/state") {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(state));
    return;
  }
  if (request.method === "POST" && path === "/api/scan") {
    if (request.headers.origin !== origin) { response.writeHead(403).end(); return; }
    scan();
    response.writeHead(202, { "Content-Type": "application/json" }).end('{"started":true}');
    return;
  }
  if (request.method === "POST" && path === "/api/settings") {
    if (request.headers.origin !== origin) { response.writeHead(403).end(); return; }
    if (state.scanning) { response.writeHead(409, { "Content-Type": "application/json" }).end('{"error":"Tarama sürerken konum değiştirilemez"}'); return; }
    try {
      const body = await readJsonBody(request);
      if (!validLocation(body.location)) throw new Error("Geçerli bir şehir veya Tüm Türkiye yazın");
      settings.location = body.location.trim().replace(/\s+/g, " ");
      await writeFile(settingsFile, JSON.stringify(settings, null, 2));
      state = { jobs: [], sources: [], lastScan: null, scanning: false, location: settings.location };
      scan();
      response.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify({ location: settings.location, started: true }));
    } catch (error) {
      response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  if (request.method === "GET" && files[path]) {
    try {
      response.setHeader("Content-Type", `${files[path][1]}; charset=utf-8`);
      response.end(await readFile(join(root, "web", files[path][0])));
    } catch { response.writeHead(500).end("Sayfa okunamadı"); }
    return;
  }
  response.writeHead(404).end();
});

server.listen(4310, "127.0.0.1", () => { console.log("Site hazır: http://127.0.0.1:4310"); scan(); });
setInterval(scan, 15 * 60 * 1000).unref();
