const VALID_HOMES = ["current", "potential"];
export function validPlanState(value) {
  return (
    value &&
    typeof value === "object" &&
    ["largeBed", "unfurnished", "evening"].every(
      (k) => typeof value[k] === "boolean",
    ) &&
    Array.isArray(value.hiddenItems) &&
    value.hiddenItems.length <= 3 &&
    value.hiddenItems.every((k) => ["bed", "sofa", "table"].includes(k)) &&
    new Set(value.hiddenItems).size === value.hiddenItems.length
  );
}
export function cleanPlanState(value) {
  if (!validPlanState(value)) throw new Error("Invalid saved arrangement.");
  return {
    largeBed: value.largeBed,
    unfurnished: value.unfurnished,
    evening: value.evening,
    hiddenItems: [...value.hiddenItems].sort(),
  };
}
let database;
function openDatabase() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("elsewhere-plans", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("homes");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  return database;
}
export async function loadPlanHistory() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("homes", "readonly");
    const values = {};
    for (const home of VALID_HOMES) {
      const request = transaction.objectStore("homes").get(home);
      request.onsuccess = () => {
        const saved = request.result;
        if (!Array.isArray(saved)) return;
        values[home] = saved
          .filter(
            (r) =>
              r &&
              typeof r.id === "string" &&
              r.id.length < 100 &&
              typeof r.createdAt === "string" &&
              Number.isFinite(Date.parse(r.createdAt)) &&
              validPlanState(r.state),
          )
          .slice(-30)
          .map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            summary:
              typeof r.summary === "string" && r.summary.length < 160
                ? r.summary
                : "Saved arrangement",
            state: cleanPlanState(r.state),
            layout: r.layout && typeof r.layout === "object" ? r.layout : null,
          }));
      };
    }
    transaction.oncomplete = () => resolve(values);
    transaction.onerror = () => reject(transaction.error);
  });
}
export async function savePlanHistory(histories) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("homes", "readwrite");
    for (const home of VALID_HOMES)
      transaction
        .objectStore("homes")
        .put(structuredClone(histories[home] || []).slice(-30), home);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}
