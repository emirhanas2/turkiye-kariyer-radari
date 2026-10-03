const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 120;
let state = { jobs: [], sources: [] };
let visibleLimit = PAGE_SIZE;
let lastDataSignature = "";
const locations = ["Tüm Türkiye", "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"];

const node = (tag, content, className) => {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
};

function filteredJobs() {
  const selected = $("source").value;
  const query = $("search").value.toLocaleLowerCase("tr");
  return state.jobs
    .filter((job) => (!selected || job.sourceId === selected)
      && (!$("relevant").checked || job.relevant)
      && `${job.title} ${job.company}`.toLocaleLowerCase("tr").includes(query))
    .sort((a, b) => Number(b.relevant) - Number(a.relevant));
}

function render() {
  const location = state.location || "İstanbul";
  $("radar-title").textContent = `${location.toLocaleUpperCase("tr-TR")} · KARİYER RADARI`;
  if (document.activeElement !== $("location")) $("location").value = location;
  $("count").textContent = state.jobs.length;
  $("last").textContent = state.lastScan ? `Son tarama ${new Date(state.lastScan).toLocaleString("tr-TR")}` : "İlk tarama sürüyor";
  $("scan").disabled = state.scanning;
  $("apply-location").disabled = state.scanning;
  $("message").textContent = state.scanning ? "Kaynaklar taranıyor…" : "";

  $("sources").replaceChildren(...state.sources.map((source) => {
    const card = node("div", "", "source");
    card.append(node("strong", source.name), node("span", source.ok ? "● Bağlandı" : "● Erişim sorunu", source.ok ? "ok" : "error"), node("small", source.message));
    if (!source.ok && source.count) card.append(node("small", `Önceki taramadan ${source.count} ilan gösteriliyor.`));
    return card;
  }));

  const selected = $("source").value;
  $("source").replaceChildren(new Option("Tüm kaynaklar", ""), ...state.sources.map((source) => new Option(source.name, source.id)));
  $("source").value = selected;

  const jobs = filteredJobs();
  const shown = jobs.slice(0, visibleLimit);
  $("visible").textContent = `(${jobs.length})`;
  $("jobs").replaceChildren(...shown.map((job) => {
    const card = node("article", "", "job");
    card.append(node("span", job.source, "tag"), node("h3", job.title), node("p", job.company || "Şirket bilgisi ilan sayfasında"), node("small", job.location || "Konum bilgisi ilan detayında"));
    if (job.relevant) card.append(node("span", "Profilinle eşleşiyor", "match"));
    const link = node("a", "İlanı incele ↗");
    const url = new URL(job.url);
    if (url.protocol === "https:") link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    card.append(link);
    return card;
  }));
  if (!jobs.length) $("jobs").append(node("p", state.scanning ? "İlk sonuçlar hazırlanıyor…" : "Bu görünümde ilan yok. Filtreleri kontrol et.", "empty"));
  $("more").hidden = shown.length >= jobs.length;
  $("more").textContent = `Daha fazla ilan göster (${shown.length}/${jobs.length})`;
}

async function refresh() {
  try {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error();
    const nextState = await response.json();
    const signature = `${nextState.location}|${nextState.lastScan}|${nextState.scanning}|${nextState.jobs.length}|${nextState.sources.map((source) => `${source.id}:${source.count}`).join(",")}`;
    if (signature !== lastDataSignature) {
      state = nextState;
      lastDataSignature = signature;
      render();
    }
  } catch {
    $("message").textContent = "Sunucuya ulaşılamıyor. Baslat.cmd dosyasını çalıştır.";
  }
}

for (const id of ["search", "source", "relevant"]) {
  $(id).addEventListener("input", () => { visibleLimit = PAGE_SIZE; render(); });
}
$("more").addEventListener("click", () => { visibleLimit += PAGE_SIZE; render(); });
$("city-options").replaceChildren(...locations.map((location) => new Option(location)));
$("apply-location").addEventListener("click", async () => {
  const location = $("location").value.trim();
  if (!location) { $("message").textContent = "Bir şehir veya Tüm Türkiye yazın."; return; }
  try {
    const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Konum değiştirilemedi");
    visibleLimit = PAGE_SIZE;
    lastDataSignature = "";
    await refresh();
  } catch (error) { $("message").textContent = error.message; }
});
$("location").addEventListener("keydown", (event) => { if (event.key === "Enter") $("apply-location").click(); });
$("scan").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/scan", { method: "POST" });
    if (!response.ok) throw new Error();
    lastDataSignature = "";
    await refresh();
  } catch { $("message").textContent = "Tarama başlatılamadı"; }
});

await refresh();
setInterval(refresh, 3000);
