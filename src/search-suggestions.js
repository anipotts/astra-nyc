export const SEARCH_HISTORY_KEY = "elsewhere-search-history-v1";
export function parseSearchHistory(raw) {
  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items.filter((item) => item && ["query", "listing"].includes(item.kind) &&
      typeof item.value === "string" && item.value.trim().length > 0 &&
      item.value.length <= 2048 && !/[\x00-\x1f\x7f]/.test(item.value)).slice(0, 6);
  } catch { return []; }
}
export function rememberSearch(history, item) {
  return [item, ...history.filter((old) => old.kind !== item.kind ||
    old.value.toLowerCase() !== item.value.toLowerCase())].slice(0, 6);
}
export function setupSearchSuggestions(input, examples, findMatches, onChoose, onQuery) {
  let history = [];
  try {
    history = parseSearchHistory(localStorage.getItem(SEARCH_HISTORY_KEY));
    const recent = localStorage.getItem("elsewhere-last-real-home");
    if (!history.length && examples.some((item) => item.id === recent))
      history = [{ kind: "listing", value: recent }];
  } catch {}
  const popup = document.createElement("div");
  popup.id = "search-suggestions";
  popup.className = "search-suggestions";
  popup.setAttribute("role", "listbox");
  popup.setAttribute("aria-label", "Recent searches and available listings");
  popup.hidden = true;
  input.closest("form").append(popup);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", popup.id);
  input.setAttribute("aria-expanded", "false");
  let actions = [], active = -1;
  function close() {
    popup.hidden = true;
    active = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  function remember(item) {
    history = rememberSearch(history, item);
    try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history)); } catch {}
  }
  function highlight(index) {
    active = index;
    const options = popup.querySelectorAll('[role="option"]');
    options.forEach((option, i) => option.setAttribute("aria-selected", String(i === active)));
    if (options[active]) {
      input.setAttribute("aria-activedescendant", options[active].id);
      options[active].scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }
  function open() {
    popup.replaceChildren(); actions = []; active = -1;
    input.removeAttribute("aria-activedescendant");
    const query = input.value.trim();
    const seen = new Set();
    function heading(text) {
      const title = document.createElement("div");
      title.className = "suggestion-heading";
      title.setAttribute("role", "presentation");
      title.textContent = text; popup.append(title);
    }
    function option(title, detail, action) {
      const row = document.createElement("div");
      const index = actions.length;
      row.id = `search-option-${index}`;
      row.className = "search-option";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", "false");
      const name = document.createElement("strong"); name.textContent = title;
      const note = document.createElement("small"); note.textContent = detail;
      row.append(name, note);
      row.onpointerdown = (event) => event.preventDefault();
      row.onclick = () => { close(); action(); };
      actions.push(action); popup.append(row);
    }
    let recentHeading = false;
    for (const item of history) {
      const listing = item.kind === "listing" ? examples.find((l) => l.id === item.value) : null;
      const label = listing?.name || (item.kind === "query" ? item.value : "");
      if (!label || (query && !label.toLowerCase().includes(query.toLowerCase()))) continue;
      if (!recentHeading) { heading("Recent searches"); recentHeading = true; }
      if (listing) {
        seen.add(listing.id);
        option(label, "Open again · " + (listing.mapAddress || listing.location), () => onChoose(listing));
      } else option(label, "Search again", () => {
        input.value = item.value; onQuery(); input.focus(); open();
      });
    }
    const matches = (query ? findMatches(query) : examples).filter((l) => !seen.has(l.id));
    if (matches.length) heading(query ? "Matching listings" : "Available listings");
    for (const listing of matches)
      option(listing.name, listing.mapAddress || listing.location, () => onChoose(listing));
    if (!actions.length) {
      const empty = document.createElement("p");
      empty.className = "suggestion-empty";
      empty.textContent = "No saved matches. Press Explore to search this address.";
      popup.append(empty);
    }
    popup.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  const field = input.closest(".entry-search-field");
  document.addEventListener("keydown", (event) => {
    if (["Tab", "ArrowDown", "ArrowUp"].includes(event.key)) field.classList.add("keyboard-focus");
  });
  document.addEventListener("pointerdown", () => field.classList.remove("keyboard-focus"));
  input.addEventListener("focus", open);
  input.addEventListener("click", open);
  input.addEventListener("input", open);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { close(); event.stopPropagation(); }
    else if (event.key === "Tab") close();
    else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (popup.hidden) open();
      if (actions.length) highlight(event.key === "ArrowDown"
        ? (active + 1) % actions.length : (active <= 0 ? actions.length : active) - 1);
    } else if (event.key === "Enter" && !popup.hidden && active >= 0) {
      event.preventDefault(); const action = actions[active]; close(); action();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!input.closest("form").contains(event.target)) close();
  });
  input.addEventListener("blur", () => { close(); });
  return { close, remember };
}
