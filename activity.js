const ACTIONS = new Set(["toggleApplied", "toggleSaved", "toggleHidden", "setNote"]);

export function updateActivity(activity, request, job, now = new Date().toISOString()) {
  if (!ACTIONS.has(request.action)) throw new Error("Geçersiz işlem");
  const current = activity[request.url] || {};
  const next = {
    ...current,
    title: job?.title || current.title || "İlan",
    company: job?.company || current.company || "",
    source: job?.source || current.source || "",
    location: job?.location || current.location || ""
  };
  if (request.action === "toggleApplied") next.appliedAt = current.appliedAt ? null : now;
  if (request.action === "toggleSaved") next.saved = !current.saved;
  if (request.action === "toggleHidden") next.hidden = !current.hidden;
  if (request.action === "setNote") next.note = String(request.note || "").trim().slice(0, 500);
  const meaningful = next.appliedAt || next.saved || next.hidden || next.note;
  const result = { ...activity };
  if (meaningful) result[request.url] = next;
  else delete result[request.url];
  return result;
}

export function activityStats(activity) {
  const entries = Object.values(activity);
  return {
    applied: entries.filter((entry) => entry.appliedAt).length,
    saved: entries.filter((entry) => entry.saved).length,
    hidden: entries.filter((entry) => entry.hidden).length
  };
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function appliedCsv(activity) {
  const header = ["Başvuru tarihi", "Pozisyon", "Şirket", "Konum", "Kaynak", "Not", "İlan bağlantısı"];
  const rows = Object.entries(activity)
    .filter(([, entry]) => entry.appliedAt)
    .sort(([, a], [, b]) => String(b.appliedAt).localeCompare(String(a.appliedAt)))
    .map(([url, entry]) => [entry.appliedAt, entry.title, entry.company, entry.location, entry.source, entry.note || "", url]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
