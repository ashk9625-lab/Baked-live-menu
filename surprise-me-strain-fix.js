/* BAKED Live Menu - Surprise Me strain-level fix
   Load this AFTER app.js.
*/
(function () {
  function surpriseMeWithStrains() {
    const budget = Number(document.querySelector('#surpriseBudget')?.value || 0);
    const result = document.querySelector('#surpriseResult');
    if (!result) return;

    if (!Number.isFinite(budget) || budget <= 0) {
      result.innerHTML = '<div class="surprise-empty">Enter a budget greater than R0.</div>';
      return;
    }

    const candidates = [];

    products.forEach((p) => {
      if (p.active === false || Number(p.price) > budget) return;

      const strains = parseStrainList(p.description);

      if (strains.length) {
        strains
          .filter((strain) => Number(strain.qty) > 0)
          .forEach((strain) => {
            candidates.push({
              product: p,
              strain,
              available: Number(strain.qty),
              displayName: `${p.name} — ${strain.name}`
            });
          });
        return;
      }

      if (Number(p.stock) > 0) {
        candidates.push({
          product: p,
          strain: null,
          available: Number(p.stock),
          displayName: p.name
        });
      }
    });

    if (!candidates.length) {
      result.innerHTML =
        `<div class="surprise-empty"><strong>No match under ${money(budget)}</strong><br>Try a higher budget.</div>`;
      return;
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const pick = picked.product;
    const strain = picked.strain;
    const unitPrice = Number(pick.price || 0);
    const maxByBudget = unitPrice > 0 ? Math.floor(budget / unitPrice) : picked.available;
    const qty = Math.max(1, Math.min(picked.available, Math.max(1, maxByBudget)));

    const img = pick.image_url
      ? `<img src="${escapeHtml(pick.image_url)}" alt="${escapeHtml(picked.displayName)}">`
      : `<div class="surprise-placeholder">${initials(strain ? strain.name : pick.name)}</div>`;

    const normalDescription =
      splitProductDescription(pick.description).description ||
      'Available now on the live menu.';

    const categoryLabel =
      displayCategory(pick.category) || pick.group_name || 'Product';

    result.innerHTML = `
      <div class="surprise-pick">
        <div class="surprise-image">${img}</div>
        <div class="surprise-copy">
          <div class="surprise-label">YOUR SURPRISE PICK</div>
          <h3>${escapeHtml(picked.displayName)}</h3>
          <p>${escapeHtml(normalDescription)}</p>
          <div class="surprise-meta">
            <span>${escapeHtml(categoryLabel)}</span>
            <strong>${money(unitPrice)}</strong>
          </div>
          ${strain ? `<div class="surprise-meta"><span>Strain stock</span><strong>${picked.available} available</strong></div>` : ''}
          <div class="surprise-actions">
            <button class="btn primary" id="surpriseAddOne" type="button">Add 1 to cart</button>
            ${qty > 1 ? `<button class="btn ghost" id="surpriseAddBudget" type="button">Add ${qty} (${money(qty * unitPrice)})</button>` : ''}
            <button class="btn ghost" id="surpriseAgain" type="button">Surprise me again</button>
          </div>
        </div>
      </div>`;

    document.querySelector('#surpriseAddOne').onclick = () => {
      if (strain) addStrainToCart(pick, strain, 1);
      else addToCart(pick.id, 1);
    };

    const budgetButton = document.querySelector('#surpriseAddBudget');
    if (budgetButton) {
      budgetButton.onclick = () => {
        if (strain) addStrainToCart(pick, strain, qty);
        else addToCart(pick.id, qty);
      };
    }

    document.querySelector('#surpriseAgain').onclick = surpriseMeWithStrains;
  }

  window.runSurpriseMe = surpriseMeWithStrains;

  const goButton = document.querySelector('#surpriseGo');
  if (goButton) goButton.onclick = surpriseMeWithStrains;
})();
