import { normalizeSourceUrl } from '../source-policy.js';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './style.css';
import { MAX_SOURCE_PLAN_BYTES, validateSourcePlanBytes, validateSourcePlanPages } from './limits.js';

const MAX_BYTES = MAX_SOURCE_PLAN_BYTES;
let pdfLibrary;
async function library() {
  pdfLibrary ||= import('pdfjs-dist/build/pdf.mjs').then((pdf) => { pdf.GlobalWorkerOptions.workerSrc = workerUrl; return pdf; });
  return pdfLibrary;
}

export function mountSourcePlan(container, { fetchFn = fetch, compact = false, onSource } = {}) {
  const root = document.createElement('section'); root.className = 'source-plan-viewer';
  root.innerHTML = '<div class="sp-toolbar"><a target="_blank" rel="noopener noreferrer">Open publisher plan ↗</a><span class="sp-pages"></span><button class="ui-button" type="button" data-step="-1">Previous</button><button class="ui-button" type="button" data-step="1">Next</button><button class="ui-button" type="button" data-fit="true">Fit page</button><button class="ui-button" type="button" data-zoom="-1" aria-label="Zoom out of source plan">−</button><button class="ui-button" type="button" data-zoom="1" aria-label="Zoom into source plan">+</button></div><p class="sp-status" role="status" aria-live="polite"></p><div class="sp-scroll"><canvas role="img"></canvas></div><small class="sp-provenance"></small>';
  container.append(root);
  const $ = (selector) => root.querySelector(selector);
  const canvas = $('canvas'), status = $('.sp-status'), provenance = $('.sp-provenance');
  provenance.hidden = compact;
  let selected = null, active = true, destroyed = false, generation = 0, controller, task, pdfDocument, renderTask, page = 1, zoom = 1, ready = false;
  const listeners = new AbortController();
  function clear() {
    ready = false; canvas.width = 0; canvas.height = 0; canvas.hidden = true;
    $('.sp-pages').textContent = ''; provenance.textContent = '';
    for (const button of root.querySelectorAll('button')) {
      button.disabled = true;
      if (button.dataset.step) button.hidden = true;
    }
  }
  async function cancel() {
    const version = ++generation; controller?.abort(); renderTask?.cancel();
    const previous = task; task = null; pdfDocument = null;
    if (previous) await previous.destroy().catch(() => {});
    return version;
  }
  async function render(version = generation) {
    if (!pdfDocument || !active || destroyed) return;
    ready = false;
    renderTask?.cancel();
    const previous = renderTask;
    if (previous) await previous.promise.catch(() => {});
    if (version !== generation || !active || !pdfDocument) return;
    const pdfPage = await pdfDocument.getPage(page);
    if (version !== generation || !active) return;
    const base = pdfPage.getViewport({ scale: 1 });
    const width = Math.max(250, Math.min(1400, container.clientWidth - 32));
    const height = Math.max(160, $('.sp-scroll').clientHeight - 4);
    const scale = Math.min(Math.min(width / base.width, height / base.height) * zoom, 2400 / base.width, 2400 / base.height);
    const viewport = pdfPage.getViewport({ scale });
    if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width < 1 || viewport.height < 1) throw new Error('The page dimensions cannot be previewed.');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${canvas.width}px`; canvas.style.height = `${canvas.height}px`;
    canvas.setAttribute('aria-label', `${selected.title || 'Publisher plan'}, page ${page}. Original source artwork; no verified geometry inferred.`);
    renderTask = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport, annotationMode: 0 });
    await renderTask.promise;
    if (version !== generation || !active) return;
    ready = true; canvas.hidden = false;
    status.textContent = compact ? '' : 'Original publisher plan · nominal dimensions; current unit conditions unverified.';
    $('.sp-pages').textContent = `Page ${page} of ${pdfDocument.numPages}`;
    for (const button of root.querySelectorAll('button')) {
      if (button.dataset.step) button.hidden = pdfDocument.numPages === 1;
      button.disabled = button.dataset.step === '-1' ? page === 1 : button.dataset.step === '1' ? page === pdfDocument.numPages : false;
    }
  }
  async function load() {
    const version = await cancel();
    if (version !== generation) return;
    clear();
    if (!selected || !active || destroyed) return;
    status.textContent = 'Loading the original publisher PDF…';
    controller = new AbortController();
    const timer = setTimeout(() => { if (version === generation) { controller.abort(); task?.destroy().catch(() => {}); status.textContent = 'Preview timed out. Open the publisher plan above.'; } }, 30000);
    try {
      const response = await fetchFn('/api/plans/source', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceUrl: selected.sourceUrl }), signal: controller.signal });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Source preview unavailable.'); }
      if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('This source exceeds the 4 MB preview limit.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      validateSourcePlanBytes(bytes);
      if (version !== generation || !active) return;
      const pdf = await library();
      if (version !== generation || !active || controller.signal.aborted) return;
      task = pdf.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true, disableAutoFetch: true, disableStream: true, maxImageSize: 4000000, stopAtErrors: true });
      task.onPassword = () => { task.destroy(); };
      const loadedDocument = await task.promise;
      if (version !== generation || !active) { await loadedDocument.destroy().catch(() => {}); return; }
      pdfDocument = loadedDocument;
      validateSourcePlanPages(pdfDocument.numPages);
      const source = normalizeSourceUrl(response.headers.get('x-plan-source') || selected.sourceUrl);
      provenance.textContent = `Source: ${new URL(source).hostname} · retrieved ${response.headers.get('x-plan-fetched-at') || 'just now'} · original document, not reconstructed geometry`;
      onSource?.({ sourceUrl: source, fetchedAt: response.headers.get('x-plan-fetched-at') || null, sha256: response.headers.get('x-plan-sha256') || null });
      await render(version);
    } catch (error) {
      if (version === generation && active && !destroyed) {
        clear(); status.textContent = `${error.name === 'AbortError' ? 'Preview timed out or was cancelled.' : error.message} Open the publisher plan above.`;
        const failed = task; task = null; pdfDocument = null; failed?.destroy().catch(() => {});
      }
    } finally { clearTimeout(timer); }
  }
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button || !active || !ready || button.disabled) return;
    if (button.dataset.step) page = Math.max(1, Math.min(pdfDocument.numPages, page + Number(button.dataset.step)));
    if (button.dataset.fit) zoom = 1;
    if (button.dataset.zoom) zoom = Math.max(0.6, Math.min(2, zoom + Number(button.dataset.zoom) * 0.2));
    const version = generation;
    try { await render(version); } catch (error) { if (version === generation && active && error.name !== 'RenderingCancelledException') status.textContent = 'Rendering failed. Open the publisher plan above.'; }
  }, { signal: listeners.signal });
  const observer = new ResizeObserver(() => { if (active && ready && !destroyed) void render().catch(() => {}); });
  observer.observe(container);
  clear();
  return {
    async update(context = {}) {
      if (destroyed) return;
      let sourceUrl;
      try { sourceUrl = normalizeSourceUrl(context.sourceUrl); } catch {
        selected = null; clear(); $('a').removeAttribute('href'); status.textContent = 'No supported source plan is selected.'; await cancel(); return;
      }
      const same = selected?.sourceUrl === sourceUrl;
      selected = { sourceUrl, title: context.title || 'Publisher plan' };
      $('a').href = sourceUrl; active = context.active !== false; root.inert = !active;
      if (!active) { clear(); await cancel(); return; }
      if (same && ready) return;
      page = 1; zoom = 1;
      return load();
    },
    setActive(value) { active = Boolean(value); root.inert = !active; if (!active) { void cancel(); clear(); } },
    destroy() { destroyed = true; active = false; listeners.abort(); observer.disconnect(); void cancel(); root.remove(); },
  };
}
