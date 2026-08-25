/* BAKED Live Menu recovery patch
   Load AFTER app.js (the current index.html already does this).
   Repairs:
   - Surprise Me strain-level selection
   - Product image click-to-enlarge
   - Customer Suggest an Idea modal + submission
   - Admin Suggestions loading
*/
(function () {
  'use strict';

  function esc(value='') {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  /* ===================== SURPRISE ME ===================== */
  function surpriseMeWithStrains() {
    const budget = Number(document.querySelector('#surpriseBudget')?.value || 0);
    const result = document.querySelector('#surpriseResult');
    if (!result) return;

    if (!Number.isFinite(budget) || budget <= 0) {
      result.innerHTML = '<div class="surprise-empty">Enter a budget greater than R0.</div>';
      return;
    }

    const candidates = [];
    (window.products || products || []).forEach((p) => {
      if (p.active === false || Number(p.price) > budget) return;
      const strains = typeof parseStrainList === 'function' ? parseStrainList(p.description) : [];
      if (strains.length) {
        strains.filter(s => Number(s.qty) > 0).forEach((strain) => {
          candidates.push({
            product:p,
            strain,
            available:Number(strain.qty),
            displayName:`${p.name} — ${strain.name}`
          });
        });
      } else if (Number(p.stock) > 0) {
        candidates.push({
          product:p,
          strain:null,
          available:Number(p.stock),
          displayName:p.name
        });
      }
    });

    if (!candidates.length) {
      result.innerHTML = `<div class="surprise-empty"><strong>No match under ${money(budget)}</strong><br>Try a higher budget.</div>`;
      return;
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const pick = picked.product;
    const strain = picked.strain;
    const unitPrice = Number(pick.price || 0);
    const maxByBudget = unitPrice > 0 ? Math.floor(budget / unitPrice) : picked.available;
    const qty = Math.max(1, Math.min(picked.available, Math.max(1, maxByBudget)));
    const img = pick.image_url
      ? `<img src="${esc(pick.image_url)}" alt="${esc(picked.displayName)}">`
      : `<div class="surprise-placeholder">${typeof initials === 'function' ? initials(strain ? strain.name : pick.name) : 'B'}</div>`;
    const normalDescription = typeof splitProductDescription === 'function'
      ? (splitProductDescription(pick.description).description || 'Available now on the live menu.')
      : (pick.description || 'Available now on the live menu.');
    const categoryLabel = typeof displayCategory === 'function'
      ? (displayCategory(pick.category) || pick.group_name || 'Product')
      : (pick.category || pick.group_name || 'Product');

    result.innerHTML = `
      <div class="surprise-pick">
        <div class="surprise-image">${img}</div>
        <div class="surprise-copy">
          <div class="surprise-label">YOUR SURPRISE PICK</div>
          <h3>${esc(picked.displayName)}</h3>
          <p>${esc(normalDescription)}</p>
          <div class="surprise-meta"><span>${esc(categoryLabel)}</span><strong>${money(unitPrice)}</strong></div>
          ${strain ? `<div class="surprise-meta"><span>Strain stock</span><strong>${picked.available} available</strong></div>` : ''}
          <div class="surprise-actions">
            <button class="btn primary" id="surpriseAddOne" type="button">Add 1 to cart</button>
            ${qty > 1 ? `<button class="btn ghost" id="surpriseAddBudget" type="button">Add ${qty} (${money(qty * unitPrice)})</button>` : ''}
            <button class="btn ghost" id="surpriseAgain" type="button">Surprise me again</button>
          </div>
        </div>
      </div>`;

    document.querySelector('#surpriseAddOne').onclick = () => {
      if (strain && typeof addStrainToCart === 'function') addStrainToCart(pick, strain, 1);
      else if (typeof addToCart === 'function') addToCart(pick.id, 1);
    };
    const budgetButton = document.querySelector('#surpriseAddBudget');
    if (budgetButton) budgetButton.onclick = () => {
      if (strain && typeof addStrainToCart === 'function') addStrainToCart(pick, strain, qty);
      else if (typeof addToCart === 'function') addToCart(pick.id, qty);
    };
    document.querySelector('#surpriseAgain').onclick = surpriseMeWithStrains;
  }

  window.runSurpriseMe = surpriseMeWithStrains;
  const goButton = document.querySelector('#surpriseGo');
  if (goButton) goButton.onclick = surpriseMeWithStrains;

  /* ===================== IMAGE VIEWER ===================== */
  function ensureRecoveryViewer() {
    let viewer = document.getElementById('bakedRecoveryImageViewer');
    if (viewer) return viewer;

    viewer = document.createElement('div');
    viewer.id = 'bakedRecoveryImageViewer';
    viewer.setAttribute('aria-hidden','true');
    viewer.innerHTML = `
      <div class="baked-recovery-viewer-backdrop" data-recovery-image-close></div>
      <div class="baked-recovery-viewer-dialog" role="dialog" aria-modal="true" aria-label="Product image">
        <button type="button" class="baked-recovery-viewer-close" data-recovery-image-close aria-label="Close image">×</button>
        <img id="bakedRecoveryViewerImg" alt="Product image">
        <div id="bakedRecoveryViewerName"></div>
      </div>`;

    const style = document.createElement('style');
    style.textContent = `
      #bakedRecoveryImageViewer{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:18px;box-sizing:border-box}
      #bakedRecoveryImageViewer.open{display:flex!important}
      #bakedRecoveryImageViewer .baked-recovery-viewer-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.90)}
      #bakedRecoveryImageViewer .baked-recovery-viewer-dialog{position:relative;z-index:1;max-width:95vw;max-height:95vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
      #bakedRecoveryImageViewer img{display:block;max-width:94vw;max-height:82vh;width:auto;height:auto;object-fit:contain;background:#fff;border-radius:14px;box-shadow:0 18px 70px rgba(0,0,0,.5)}
      #bakedRecoveryImageViewer .baked-recovery-viewer-close{position:absolute;top:-18px;right:-18px;width:46px;height:46px;border:0;border-radius:50%;background:#fff;color:#111;font-size:32px;line-height:1;cursor:pointer;z-index:2;box-shadow:0 5px 20px rgba(0,0,0,.4)}
      #bakedRecoveryViewerName{color:#fff;font-weight:800;text-align:center;margin-top:12px;font-size:15px}
      .product-image img,.featured-card .product-image img,.surprise-image img{cursor:zoom-in!important}
      @media(max-width:600px){#bakedRecoveryImageViewer{padding:8px}#bakedRecoveryImageViewer img{max-width:96vw;max-height:78vh}.baked-recovery-viewer-close{top:6px!important;right:6px!important}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(viewer);
    viewer.querySelectorAll('[data-recovery-image-close]').forEach(el => el.addEventListener('click', closeRecoveryViewer));
    return viewer;
  }

  function openRecoveryViewer(img) {
    if (!img || !img.src) return;
    const viewer = ensureRecoveryViewer();
    const full = viewer.querySelector('#bakedRecoveryViewerImg');
    const name = viewer.querySelector('#bakedRecoveryViewerName');
    full.src = img.dataset.fullSrc || img.currentSrc || img.src;
    full.alt = img.dataset.productName || img.alt || 'Product image';
    name.textContent = img.dataset.productName || img.alt || '';
    viewer.classList.add('open');
    viewer.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }

  function closeRecoveryViewer() {
    const viewer = document.getElementById('bakedRecoveryImageViewer');
    if (!viewer) return;
    viewer.classList.remove('open');
    viewer.setAttribute('aria-hidden','true');
    const img = viewer.querySelector('#bakedRecoveryViewerImg');
    if (img) img.src='';
    document.body.style.overflow='';
  }

  // Window capture runs before the two conflicting document-level image handlers in app.js.
  window.addEventListener('click', function (event) {
    const target = event.target;
    if (!target || !target.closest) return;
    const img = target.closest('.product-image img, .featured-card .product-image img, .surprise-image img');
    if (!img) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    openRecoveryViewer(img);
  }, true);

  /* ===================== SUGGESTION BOX ===================== */
  function ensureSuggestionUi() {
    // Create customer button if an older index is missing it.
    if (!document.getElementById('openSuggestionBox')) {
      const store = document.getElementById('storeView');
      if (store) {
        const section = document.createElement('section');
        section.className='suggestion-cta';
        section.innerHTML='<div><p class="eyebrow accent">HELP US IMPROVE</p><h2>Got an idea for the menu?</h2><p>Suggest a product, feature or improvement you would like to see.</p></div><button id="openSuggestionBox" class="btn primary" type="button">💡 Suggest an idea</button>';
        store.appendChild(section);
      }
    }

    if (!document.getElementById('suggestionModal')) {
      const modal = document.createElement('div');
      modal.id='suggestionModal';
      modal.className='modal hidden';
      modal.setAttribute('aria-hidden','true');
      modal.innerHTML=`<div class="modal-card suggestion-modal-card">
        <button id="closeSuggestionBox" class="modal-close icon-button" type="button" aria-label="Close">×</button>
        <p class="eyebrow accent">BAKED SUGGESTION BOX</p>
        <h2>What should we add or improve?</h2>
        <p>Your ideas help us improve the live menu.</p>
        <form id="suggestionForm" class="form-stack">
          <label>Your name <span class="optional">(optional)</span><input id="suggestionName" type="text" maxlength="80" placeholder="Name"></label>
          <label>Your suggestion<textarea id="suggestionText" maxlength="1000" rows="5" placeholder="Tell us your idea…" required></textarea></label>
          <button class="btn primary wide" type="submit">Send suggestion</button>
        </form>
        <p id="suggestionMessage" class="form-message"></p>
      </div>`;
      document.body.appendChild(modal);
    }
  }

  function openSuggestionModal() {
    ensureSuggestionUi();
    const modal=document.getElementById('suggestionModal');
    const msg=document.getElementById('suggestionMessage');
    if (!modal) return;
    if (msg) msg.textContent='';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    setTimeout(()=>document.getElementById('suggestionText')?.focus(),50);
  }

  function closeSuggestionModal() {
    const modal=document.getElementById('suggestionModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }

  async function submitSuggestion(event) {
    event.preventDefault();
    const form=event.currentTarget;
    const customerName=document.getElementById('suggestionName')?.value.trim() || '';
    const suggestion=document.getElementById('suggestionText')?.value.trim() || '';
    const message=document.getElementById('suggestionMessage');
    const button=form.querySelector('button[type="submit"]');
    if (!suggestion) {
      if (message) message.textContent='Please enter your suggestion.';
      return;
    }
    if (button) button.disabled=true;
    if (message) message.textContent='Sending suggestion…';
    try {
      await api('/rest/v1/menu_suggestions', {
        method:'POST',
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({customer_name:customerName || null,suggestion})
      });
      form.reset();
      if (message) message.textContent='Thank you — your suggestion has been sent.';
      if (typeof toast === 'function') toast('Suggestion sent');
      setTimeout(closeSuggestionModal,900);
    } catch (err) {
      if (message) message.textContent=err?.message || 'Could not send suggestion.';
    } finally {
      if (button) button.disabled=false;
    }
  }

  async function loadSuggestionsAdmin() {
    const list=document.getElementById('adminSuggestions');
    const msg=document.getElementById('suggestionsAdminMessage');
    const count=document.getElementById('suggestionAdminCount');
    if (!list) return;
    list.innerHTML='<div class="empty-state"><p>Loading suggestions…</p></div>';
    if (msg) msg.textContent='';
    try {
      const rows=await api('/rest/v1/menu_suggestions?select=*&order=created_at.desc&limit=200',{auth:true});
      if (count) count.textContent=rows.length?`(${rows.length})`:'';
      list.innerHTML=rows.length ? rows.map(row=>`
        <article class="admin-row suggestion-admin-row">
          <div class="admin-row-main">
            <span class="admin-icon">💡</span>
            <div>
              <strong>${esc(row.customer_name || 'Anonymous')}</strong>
              <small>${new Date(row.created_at).toLocaleString('en-ZA')} · ${esc(row.status || 'New')}</small>
              <p style="margin:8px 0 0;white-space:pre-wrap">${esc(row.suggestion || '')}</p>
            </div>
          </div>
        </article>`).join('') : '<div class="empty-state"><h3>No suggestions yet</h3><p>Customer ideas will appear here.</p></div>';
    } catch (err) {
      list.innerHTML=`<div class="empty-state"><p>${esc(err?.message || 'Could not load suggestions.')}</p></div>`;
      if (msg) msg.textContent=err?.message || '';
    }
  }

  function bindRecoveryUi() {
    ensureSuggestionUi();

    const open=document.getElementById('openSuggestionBox');
    const close=document.getElementById('closeSuggestionBox');
    const modal=document.getElementById('suggestionModal');
    const form=document.getElementById('suggestionForm');
    const refresh=document.getElementById('refreshSuggestionsButton');
    const tab=document.querySelector('.admin-tab[data-tab="suggestions"]');

    if (open) open.onclick=openSuggestionModal;
    if (close) close.onclick=closeSuggestionModal;
    if (modal) modal.addEventListener('click',e=>{if(e.target===modal)closeSuggestionModal();});
    if (form) form.onsubmit=submitSuggestion;
    if (refresh) refresh.onclick=loadSuggestionsAdmin;
    if (tab) tab.addEventListener('click',()=>setTimeout(loadSuggestionsAdmin,0));

    // If admin suggestions UI is missing in an older index, create a usable panel.
    const dashboard=document.getElementById('adminDashboard');
    const tabs=document.querySelector('.admin-tabs');
    if (dashboard && tabs && !document.querySelector('.admin-tab[data-tab="suggestions"]')) {
      const btn=document.createElement('button');
      btn.className='admin-tab';
      btn.dataset.tab='suggestions';
      btn.innerHTML='Suggestions <span id="suggestionAdminCount"></span>';
      tabs.appendChild(btn);

      const panel=document.createElement('section');
      panel.id='suggestionsTab';
      panel.className='admin-tab-panel hidden';
      panel.innerHTML='<div class="admin-toolbar"><div><h3>Customer Suggestions</h3><p class="admin-help">Ideas submitted from the live menu.</p></div><button id="refreshSuggestionsButton" class="btn ghost" type="button">Refresh</button></div><div id="adminSuggestions" class="admin-list"></div><p id="suggestionsAdminMessage" class="form-message"></p>';
      dashboard.appendChild(panel);

      btn.onclick=()=>{
        document.querySelectorAll('.admin-tab').forEach(b=>b.classList.toggle('active',b===btn));
        document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.add('hidden'));
        panel.classList.remove('hidden');
        loadSuggestionsAdmin();
      };
      document.getElementById('refreshSuggestionsButton').onclick=loadSuggestionsAdmin;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindRecoveryUi);
  else bindRecoveryUi();

  document.addEventListener('keydown',e=>{
    if (e.key==='Escape') {
      closeRecoveryViewer();
      closeSuggestionModal();
    }
  });
})();
