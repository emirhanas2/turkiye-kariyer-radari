import test from "node:test";
import assert from "node:assert/strict";
import { activityStats, appliedCsv, updateActivity } from "./activity.js";

const url = "https://example.com/job/1";
const job = { title: "İletişim Stajyeri", company: "Örnek", source: "Test", location: "Ankara" };

test("başvuru, kayıt, not ve gizleme durumları kalıcı modele işlenir", () => {
  let activity = updateActivity({}, { url, action: "toggleApplied" }, job, "2026-10-03T12:00:00.000Z");
  activity = updateActivity(activity, { url, action: "toggleSaved" }, job);
  activity = updateActivity(activity, { url, action: "toggleHidden" }, job);
  activity = updateActivity(activity, { url, action: "setNote", note: "İK görüşmesi bekleniyor" }, job);
  assert.deepEqual(activityStats(activity), { applied: 1, saved: 1, hidden: 1 });
  assert.match(appliedCsv(activity), /İK görüşmesi bekleniyor/);
});

test("başvuru işlemi ikinci kez seçilince geri alınır", () => {
  let activity = updateActivity({}, { url, action: "toggleApplied" }, job);
  activity = updateActivity(activity, { url, action: "toggleApplied" }, job);
  assert.equal(activity[url], undefined);
});
