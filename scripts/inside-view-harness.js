import { mountInsideView } from '../src/inside-view/index.js';
import { listings } from '../src/listings.js';
import { inspectedPlans } from '../src/inspected-plan-records.js';
import { acceptInspectedRegion } from '../src/inspected-plan.js';
const select = document.querySelector('#listing');
const receipt = document.querySelector('#receipt');
for (const listing of listings) select.add(new Option(listing.name, listing.id));
const view = mountInsideView(document.querySelector('#inside'), {
  onInspectPlan: ({ listing }) => { receipt.textContent = `Inspection callback: ${listing.id}`; },
  onOpenPlans: ({ listing }) => { receipt.textContent = `Plans callback: ${listing.id}`; },
  onAction: (action) => { receipt.textContent = `Local ${action.type}: ${action.listingId}`; },
});
function regionFor(listing) {
  for (const record of inspectedPlans) {
    try { return acceptInspectedRegion(record, listing.identity); } catch {}
  }
  return null;
}
function update(stale = false) {
  receipt.textContent = "";
  const selectedListing = listings.find((item) => item.id === select.value);
  view.update({ selectedListing, acceptedRegion: regionFor(stale ? listings.find((item) => item.id === 'charles345') : selectedListing), priorities: [] });
}
select.value = 'charles345';
select.addEventListener('change', () => update());
document.querySelector('#stale').onclick = () => { select.value = 'wall2308'; update(true); };
document.querySelector('#clear').onclick = () => view.update({ selectedListing: null, acceptedRegion: null });
document.querySelector('#refresh').onclick = () => update();
update();

document.querySelector("#pause").onclick = () => view.deactivate();
document.querySelector("#resume").onclick = () => view.setActive(true);
document.querySelector("#agent").onclick = () => {
  try { view.dispatch({ type: "zoom", listingId: select.value, factor: 1.2 }); }
  catch (error) { receipt.textContent = error.message; }
};
