const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 120;
let state = { jobs: [], sources: [], activity: {}, activityStats: { applied: 0, saved: 0, hidden: 0 } };
let visibleLimit = PAGE_SIZE;
let lastDataSignature = "";
const locations = ["Tüm Türkiye", "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"];

const node = (tag, content, className) => {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
};

function activityFor(job) {
  return state.activity?.[job.url] || {};
}

function filteredJobs() {
  const selectedSource = $("source").value;
  const selectedStatus = $("status").value;
  const query = $("search").value.toLocaleLowerCase("tr-TR");
  return state.jobs
    .filter((job) => {
      const activity = activityFor(job);
      const statusMatches = selectedStatus === "saved" ? activity.saved
        : selectedStatus === "applied" ? activity.appliedAt
          : selectedStatus === "unapplied" ? !activity.appliedAt && !activity.hidden
            : selectedStatus === "hidden" ? activity.hidden
              : !activity.hidden;
      return statusMatches
        && (!selectedSource || job.sourceId === selectedSource)
        && (!$("relevant").checked || job.relevant)
        && `${job.title} ${job.company}`.toLocaleLowerCase("tr-TR").includes(query);
    })
    .sort((a, b) => Number(b.relevant) - Number(a.relevant)
      || Number(Boolean(activityFor(b).saved)) - Number(Boolean(activityFor(a).saved))
      || String(a.title).localeCompare(String(b.title), "tr-TR"));
}

async function updateJobActivity(job, action, note) {
  try {
    const response = await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: job.url, action, note })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "İşlem kaydedilemedi");
    if (result.entry) state.activity[job.url] = result.entry;
    else delete state.activity[job.url];
    state.activityStats = result.stats;
    lastDataSignature = "";
    $("message").textContent = action === "toggleApplied" ? "Başvuru durumu kaydedildi." : "İlan durumu kaydedildi.";
    render();
  } catch (error) {
    $("message").textContent = error.message;
  }
}

function actionButton(label, action, job, active = false, className = "") {
  const button = node("button", label, `${active ? "active " : ""}${className}`.trim());
  button.type = "button";
  button.addEventListener("click", () => updateJobActivity(job, action));
  return button;
}

function renderJob(job) {
  const activity = activityFor(job);
  const classes = ["job", activity.appliedAt && "applied", activity.saved && "saved"].filter(Boolean).join(" ");
  const card = node("article", "", classes);
  const tags = node("div", "", "job-tags");
  tags.append(node("span", job.source, "tag"));
  if (activity.saved) tags.append(node("span", "Kaydedildi", "state-tag saved-tag"));
  if (activity.appliedAt) tags.append(node("span", "Başvuruldu", "state-tag applied-tag"));
  card.append(tags, node("h3", job.title), node("p", job.company || "Şirket bilgisi ilan sayfasında"), node("small", job.location || "Konum bilgisi ilan detayında"));
  if (job.relevant) card.append(node("span", "Profilinle eşleşiyor", "match"));
  if (activity.note) card.append(node("p", `Not: ${activity.note}`, "activity-note"));

  const actions = node("div", "", "job-actions");
  const link = node("a", "İlanı incele ↗", "primary-link");
  try {
    const url = new URL(job.url);
    if (url.protocol === "https:") link.href = url.href;
  } catch { link.removeAttribute("href"); }
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  actions.append(
    link,
    actionButton(activity.saved ? "★ Kaydedildi" : "☆ Kaydet", "toggleSaved", job, activity.saved),
    actionButton(activity.appliedAt ? "✓ Başvuru yapıldı" : "✓ Başvurdum", "toggleApplied", job, Boolean(activity.appliedAt))
  );
  const noteButton = node("button", activity.note ? "Notu düzenle" : "Not ekle");
  noteButton.type = "button";
  noteButton.addEventListener("click", () => {
    const note = window.prompt("Bu ilan için notun (en fazla 500 karakter):", activity.note || "");
    if (note !== null) updateJobActivity(job, "setNote", note);
  });
  actions.append(noteButton, actionButton(activity.hidden ? "Geri al" : "Gizle", "toggleHidden", job, false, "danger"));
  card.append(actions);
  return card;
}

function render() {
  const location = state.location || "İstanbul";
  $("radar-title").textContent = `${location.toLocaleUpperCase("tr-TR")} · KARİYER RADARI`;
  if (document.activeElement !== $("location")) $("location").value = location;
  $("count").textContent = state.jobs.length;
  $("matched-count").textContent = state.jobs.filter((job) => job.relevant).length;
  $("saved-count").textContent = state.activityStats?.saved || 0;
  $("applied-count").textContent = state.activityStats?.applied || 0;
  $("last").textContent = state.lastScan ? `Son tarama ${new Date(state.lastScan).toLocaleString("tr-TR")}` : "İlk tarama sürüyor";
  $("scan").disabled = state.scanning;
  $("apply-location").disabled = state.scanning;
  if (state.scanning) $("message").textContent = "Kaynaklar taranıyor…";

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
  $("jobs").replaceChildren(...shown.map(renderJob));
  if (!jobs.length) $("jobs").append(node("p", state.scanning ? "İlk sonuçlar hazırlanıyor…" : "Bu görünümde ilan yok. Filtreleri kontrol et.", "empty"));
  $("more").hidden = shown.length >= jobs.length;
  $("more").textContent = `Daha fazla ilan göster (${shown.length}/${jobs.length})`;
}

async function refresh() {
  try {
    const response = await fetch("/api/state");
    if (!response.ok) throw new Error();
    const nextState = await response.json();
    const signature = `${nextState.location}|${nextState.lastScan}|${nextState.scanning}|${nextState.jobs.length}|${nextState.sources.map((source) => `${source.id}:${source.count}`).join(",")}|${JSON.stringify(nextState.activity)}`;
    if (signature !== lastDataSignature) {
      state = nextState;
      lastDataSignature = signature;
      render();
    }
  } catch {
    $("message").textContent = "Sunucuya ulaşılamıyor. Baslat.cmd dosyasını çalıştır.";
  }
}

for (const id of ["search", "source", "status", "relevant"]) {
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
