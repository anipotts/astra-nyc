export const PRIORITY_KEY = "elsewhere-priorities-v1";
export const PRIORITIES = Object.freeze([
  "Work & study", "People & community", "Daily essentials", "Food & social",
  "Fitness & outdoors", "Care & services", "Getting around",
]);
export function parsePriorities(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.selected) ||
        value.selected.length > 3 || new Set(value.selected).size !== value.selected.length ||
        !value.selected.every((label) => PRIORITIES.includes(label))) return [];
    return value.selected;
  } catch { return []; }
}
export function createPriorities(getStorage) {
  let selected = [];
  let persisted = true;
  function reload() {
    try { selected = parsePriorities(getStorage().getItem(PRIORITY_KEY)); persisted = true; }
    catch { persisted = false; }
  }
  reload();
  return {
    get selected() { return [...selected]; },
    get persisted() { return persisted; },
    reload,
    toggle(label) {
      if (!PRIORITIES.includes(label)) return;
      if (selected.includes(label)) selected = selected.filter((item) => item !== label);
      else if (selected.length < 3) selected = [...selected, label];
      else return;
      try {
        getStorage().setItem(PRIORITY_KEY, JSON.stringify({ version: 1, selected }));
        persisted = true;
      } catch { persisted = false; }
    },
  };
}
export function setupPriorities(onChange = () => {}) {
  const preferences = createPriorities(() => window.localStorage);
  const choices = document.querySelector("#priority-choices");
  const buttons = PRIORITIES.map((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.onclick = () => { preferences.toggle(label); render(); };
    choices.append(button);
    return button;
  });
  function render() {
    const selected = preferences.selected;
    buttons.forEach((button) => {
      const active = selected.includes(button.textContent);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = !active && selected.length === 3;
    });
    document.querySelector("#priority-status").textContent = selected.length === 3
      ? "3/3 selected. Deselect to change."
      : `${selected.length}/3 selected.`;
    document.querySelector("#priority-storage").textContent = preferences.persisted
      ? "Saved here."
      : "Changes last for this visit; browser storage is unavailable.";
    onChange(selected);
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== PRIORITY_KEY) return;
    try { if (event.storageArea !== window.localStorage) return; } catch { return; }
    preferences.reload();
    render();
  });
  render();
  return preferences;
}
