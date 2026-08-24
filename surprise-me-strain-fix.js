/* BAKED Live Menu - Surprise Me strain-level fix + customer/admin enhancements
   Load this AFTER app.js.
   Upgrade pack: badges, favourites, compare, advanced filters, new arrivals,
   back-in-stock interest, analytics dashboard, stock UX and install UX.
   Multi-image gallery intentionally NOT included.
*/
(function () {
  const SESSION_KEY_NAME = 'baked-menu-session-key';
  const FAV_KEY = 'baked-favourites';
  const COMPARE_MAX = 3;

  function sessionKey(){
    let key=localStorage.getItem(SESSION_KEY_NAME);
    if(!key){
      key='s_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14);
      localStorage.setItem(SESSION_KEY_NAME,key);
    }
    return key;
  }
  function favourites(){
    try{return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||'[]').map(String));}catch{return new Set();}
  }
  function saveFavourites(set){localStorage.setItem(FAV_KEY,JSON.stringify([...set]));}
  function productById(id){return products.find(p=>String(p.id)===String(id));}
  function productIdFromCard(card){
    return card?.querySelector('.add-button')?.dataset.id || card?.querySelector('.view-strains')?.dataset.id || card?.dataset.strainCard || '';
  }
  function safeToast(msg){try{toast(msg);}catch{console.log(msg);}}

  async function trackEvent(eventType,productId=null){
    try{
      await api('/rest/v1/menu_analytics_events',{
        method:'POST',
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({event_type:eventType,product_id:productId||null,session_key:sessionKey()})
      });
    }catch(err){console.debug('Analytics event skipped',err?.message||err);}
  }

  function badgeList(p){
    const out=[];
    if(p.badge_recommended)out.push(['recommended','Recommended']);
    if(p.badge_best_seller)out.push(['best','Best Seller']);
    if(p.badge_popular)out.push(['popular','Popular']);
    const recent=p.created_at && (Date.now()-new Date(p.created_at).getTime()<=45*86400000);
    if(p.badge_new||recent)out.push(['new','New']);
    return out;
  }

  function injectStyles(){
    if(document.getElementById('bakedEnhancementStyles'))return;
    const style=document.createElement('style');
    style.id='bakedEnhancementStyles';
    style.textContent=`
      .enh-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:-2px 0 18px}.enh-toolbar select,.enh-toolbar button{min-height:42px}
      .enh-fav-toggle.active{background:#fff;color:#111;border-color:#fff}.enh-new-section{margin:6px 0 24px}.enh-new-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:12px}.enh-new-head h2{margin:2px 0 0}.enh-new-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.enh-new-card{border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.035);padding:10px;display:grid;grid-template-columns:54px 1fr;gap:10px;align-items:center;text-align:left;color:inherit;cursor:pointer}.enh-new-card img,.enh-new-card .enh-new-placeholder{width:54px;height:54px;border-radius:12px;object-fit:cover;background:#191d1b;display:grid;place-items:center;font-weight:800}.enh-new-card strong{display:block;font-size:14px}.enh-new-card small{display:block;opacity:.7;margin-top:3px}
      .enh-card-tools{position:absolute;top:10px;left:10px;display:flex;gap:6px;z-index:4}.enh-icon-btn{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(8,10,9,.82);color:#fff;display:grid;place-items:center;cursor:pointer;font-size:17px;backdrop-filter:blur(8px)}.enh-icon-btn.active{background:#fff;color:#111}.product-image{position:relative}.enh-badges{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 8px}.enh-tag{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.1)}.enh-tag.recommended{background:#fff;color:#111}.enh-tag.new{border-color:rgba(255,255,255,.35)}.enh-tag.best{font-weight:900}.enh-restock{width:100%;margin-top:8px}.enh-low-note{font-size:11px;font-weight:700;opacity:.8;margin-top:3px}
      .enh-compare-bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:70;background:#111;border:1px solid rgba(255,255,255,.18);box-shadow:0 18px 60px rgba(0,0,0,.42);border-radius:18px;padding:10px 12px;display:flex;gap:10px;align-items:center;max-width:min(92vw,720px)}.enh-compare-bar.hidden{display:none}.enh-compare-names{display:flex;gap:7px;flex-wrap:wrap;min-width:0}.enh-compare-chip{font-size:12px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.08);white-space:nowrap}.enh-compare-actions{display:flex;gap:7px;margin-left:auto}
      .enh-modal{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.76);display:grid;place-items:center;padding:18px}.enh-modal.hidden{display:none}.enh-modal-card{width:min(940px,96vw);max-height:88vh;overflow:auto;background:#101311;border:1px solid rgba(255,255,255,.15);border-radius:22px;padding:20px}.enh-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.enh-compare-table{width:100%;border-collapse:collapse}.enh-compare-table th,.enh-compare-table td{padding:12px;border-bottom:1px solid rgba(255,255,255,.1);vertical-align:top;text-align:left}.enh-compare-table th:first-child{width:130px;opacity:.7}.enh-compare-product img{width:90px;height:90px;object-fit:cover;border-radius:14px;margin-bottom:8px}.enh-compare-product strong{display:block}.enh-compare-product small{opacity:.7}.enh-admin-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.enh-admin-tag{font-size:11px;padding:5px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:inherit;cursor:pointer}.enh-admin-tag.active{background:#fff;color:#111}.enh-analytics-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 18px}.enh-kpi{padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.035)}.enh-kpi span{display:block;font-size:12px;opacity:.7}.enh-kpi strong{display:block;font-size:26px;margin-top:5px}.enh-analytics-table{width:100%;border-collapse:collapse}.enh-analytics-table th,.enh-analytics-table td{padding:11px;border-bottom:1px solid rgba(255,255,255,.09);text-align:left}.enh-install-note{font-size:12px;opacity:.72;margin-top:8px}.enh-hidden-by-filter{display:none!important}.enh-favourite-empty{padding:18px;border:1px dashed rgba(255,255,255,.15);border-radius:14px;text-align:center;opacity:.72}.enh-announcement-note{display:block;font-size:12px;opacity:.7;margin-top:5px}
      @media(max-width:700px){.enh-analytics-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.enh-compare-bar{left:10px;right:10px;transform:none;max-width:none}.enh-compare-names{display:none}.enh-compare-table{font-size:12px}.enh-compare-table th,.enh-compare-table td{padding:8px}.enh-new-strip{grid-template-columns:1fr 1fr}.enh-toolbar{display:grid;grid-template-columns:1fr 1fr}.enh-toolbar>*{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function injectAdvancedFilters(){
    const toolbar=document.querySelector('.toolbar');
    if(!toolbar||document.getElementById('enhToolbar'))return;
    const box=document.createElement('div');
    box.id='enhToolbar';box.className='enh-toolbar';
    box.innerHTML=`
      <select id="enhGroupFilter"><option value="all">All ranges</option></select>
      <select id="enhPriceFilter"><option value="all">Any price</option><option value="100">Up to R100</option><option value="200">Up to R200</option><option value="300">Up to R300</option><option value="500">Up to R500</option></select>
      <select id="enhBadgeFilter"><option value="all">All badges</option><option value="recommended">Recommended</option><option value="best">Best Seller</option><option value="popular">Popular</option><option value="new">New</option></select>
      <button id="enhFavOnly" class="btn ghost enh-fav-toggle" type="button">♡ Favourites only</button>`;
    toolbar.insertAdjacentElement('afterend',box);
    const group=document.getElementById('enhGroupFilter');
    const groups=[...new Set(products.map(p=>String(p.group_name||'').trim()).filter(Boolean))].sort();
    group.innerHTML='<option value="all">All ranges</option>'+groups.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
    ['enhGroupFilter','enhPriceFilter','enhBadgeFilter'].forEach(id=>document.getElementById(id).addEventListener('change',applyExtraFilters));
    document.getElementById('enhFavOnly').onclick=()=>{const b=document.getElementById('enhFavOnly');b.classList.toggle('active');b.textContent=b.classList.contains('active')?'♥ Favourites only':'♡ Favourites only';applyExtraFilters();};
  }

  function cardMatchesExtraFilters(card){
    const id=productIdFromCard(card),p=productById(id);if(!p)return true;
    const group=document.getElementById('enhGroupFilter')?.value||'all';
    const price=document.getElementById('enhPriceFilter')?.value||'all';
    const badge=document.getElementById('enhBadgeFilter')?.value||'all';
    const favOnly=document.getElementById('enhFavOnly')?.classList.contains('active');
    if(group!=='all'&&String(p.group_name||'')!==group)return false;
    if(price!=='all'&&Number(p.price)>Number(price))return false;
    if(favOnly&&!favourites().has(String(p.id)))return false;
    if(badge!=='all'){
      const bs=badgeList(p).map(x=>x[0]);
      if(!bs.includes(badge))return false;
    }
    return true;
  }
  function applyExtraFilters(){
    document.querySelectorAll('#productGrid .product-card').forEach(card=>card.classList.toggle('enh-hidden-by-filter',!cardMatchesExtraFilters(card)));
    const visible=[...document.querySelectorAll('#productGrid .product-card')].filter(c=>!c.classList.contains('enh-hidden-by-filter')).length;
    const status=document.getElementById('status');
    if(status&&document.getElementById('enhFavOnly')?.classList.contains('active'))status.textContent=`Showing ${visible} favourite product${visible===1?'':'s'}`;
    if(!visible&&document.getElementById('enhFavOnly')?.classList.contains('active')){
      if(!document.getElementById('enhFavEmpty')){
        const empty=document.createElement('div');empty.id='enhFavEmpty';empty.className='enh-favourite-empty';empty.textContent='No favourites match these filters yet.';document.getElementById('productGrid')?.appendChild(empty);
      }
    }else document.getElementById('enhFavEmpty')?.remove();
  }

  let compareSet=new Set();
  function ensureCompareUI(){
    if(document.getElementById('enhCompareBar'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="enhCompareBar" class="enh-compare-bar hidden"><div id="enhCompareNames" class="enh-compare-names"></div><div class="enh-compare-actions"><button id="enhCompareOpen" class="btn primary compact" type="button">Compare</button><button id="enhCompareClear" class="btn ghost compact" type="button">Clear</button></div></div><div id="enhCompareModal" class="enh-modal hidden"><div class="enh-modal-card"><div class="enh-modal-head"><div><p class="eyebrow accent">PRODUCT COMPARISON</p><h2>Compare products</h2></div><button id="enhCompareClose" class="icon-button" type="button">×</button></div><div id="enhCompareContent"></div></div></div>`);
    document.getElementById('enhCompareClear').onclick=()=>{compareSet.clear();refreshCompareUI();decorateProductCards();};
    document.getElementById('enhCompareOpen').onclick=openCompare;
    document.getElementById('enhCompareClose').onclick=()=>document.getElementById('enhCompareModal').classList.add('hidden');
    document.getElementById('enhCompareModal').onclick=e=>{if(e.target.id==='enhCompareModal')e.currentTarget.classList.add('hidden');};
  }
  function toggleCompare(id){
    id=String(id);
    if(compareSet.has(id))compareSet.delete(id);
    else if(compareSet.size<COMPARE_MAX)compareSet.add(id);
    else return safeToast('You can compare up to 3 products');
    refreshCompareUI();decorateProductCards();
  }
  function refreshCompareUI(){
    const bar=document.getElementById('enhCompareBar');if(!bar)return;
    bar.classList.toggle('hidden',compareSet.size<2);
    document.getElementById('enhCompareNames').innerHTML=[...compareSet].map(id=>`<span class="enh-compare-chip">${escapeHtml(productById(id)?.name||'Product')}</span>`).join('');
    document.getElementById('enhCompareOpen').textContent=`Compare ${compareSet.size}`;
  }
  function openCompare(){
    const chosen=[...compareSet].map(productById).filter(Boolean);if(chosen.length<2)return;
    const rows=[
      ['Product',p=>`<div class="enh-compare-product">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">`:''}<strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.group_name||p.category||'')}</small></div>`],
      ['Price',p=>money(p.price)],['Category',p=>escapeHtml(displayCategory(p.category)||'—')],['Range',p=>escapeHtml(p.group_name||'—')],['Strength',p=>escapeHtml(p.strength||'—')],['Availability',p=>escapeHtml(stockState(p)[1])],['Description',p=>escapeHtml(splitProductDescription(p.description).description||'—')]
    ];
    document.getElementById('enhCompareContent').innerHTML=`<table class="enh-compare-table"><tbody>${rows.map(([label,fn])=>`<tr><th>${label}</th>${chosen.map(p=>`<td>${fn(p)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    document.getElementById('enhCompareModal').classList.remove('hidden');
  }

  async function requestRestock(id,button){
    if(button.dataset.sent==='1')return;
    button.disabled=true;button.textContent='Saving interest…';
    try{
      await api('/rest/v1/back_in_stock_interest?on_conflict=product_id,session_key',{
        method:'POST',
        headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},
        body:JSON.stringify({product_id:id,session_key:sessionKey()})
      });
      button.dataset.sent='1';button.textContent='✓ Interest saved';safeToast('Thanks — your interest has been recorded');
    }catch(err){button.disabled=false;button.textContent='I want this back';safeToast('Could not save interest');}
  }

  function decorateProductCards(){
    document.querySelectorAll('#productGrid .product-card,#featuredGrid .product-card').forEach(card=>{
      const id=productIdFromCard(card),p=productById(id);if(!p)return;
      const image=card.querySelector('.product-image');
      if(image&&!image.querySelector('.enh-card-tools')){
        const tools=document.createElement('div');tools.className='enh-card-tools';
        tools.innerHTML=`<button class="enh-icon-btn enh-fav" type="button" title="Favourite">♡</button><button class="enh-icon-btn enh-compare" type="button" title="Compare">⇄</button>`;
        image.appendChild(tools);
        tools.querySelector('.enh-fav').onclick=e=>{e.stopPropagation();const set=favourites();set.has(String(id))?set.delete(String(id)):set.add(String(id));saveFavourites(set);trackEvent('favourite',id);decorateProductCards();applyExtraFilters();};
        tools.querySelector('.enh-compare').onclick=e=>{e.stopPropagation();toggleCompare(id);};
      }
      const fav=image?.querySelector('.enh-fav');if(fav){const on=favourites().has(String(id));fav.classList.toggle('active',on);fav.textContent=on?'♥':'♡';}
      const cmp=image?.querySelector('.enh-compare');if(cmp)cmp.classList.toggle('active',compareSet.has(String(id)));
      const body=card.querySelector('.product-body');
      if(body){
        body.querySelector('.enh-badges')?.remove();
        const badges=badgeList(p);
        if(badges.length){const el=document.createElement('div');el.className='enh-badges';el.innerHTML=badges.map(([cls,label])=>`<span class="enh-tag ${cls}">${label}</span>`).join('');body.insertBefore(el,body.firstChild);}
        body.querySelector('.enh-restock')?.remove();
        if(Number(p.stock)<=0){const b=document.createElement('button');b.className='btn ghost enh-restock';b.type='button';b.textContent='I want this back';b.onclick=e=>{e.stopPropagation();requestRestock(id,b);};body.appendChild(b);}
        body.querySelector('.enh-low-note')?.remove();
        if(Number(p.stock)>0&&Number(p.stock)<=Number(p.reorder_level||0)){const n=document.createElement('div');n.className='enh-low-note';n.textContent=`Only ${p.stock} left`;body.appendChild(n);}
      }
    });
    applyExtraFilters();refreshCompareUI();
  }

  function renderNewArrivals(){
    const chipAnchor=document.getElementById('categoryChips');if(!chipAnchor)return;
    let section=document.getElementById('enhNewArrivals');
    const fresh=products.filter(p=>p.active!==false&&(p.badge_new||(p.created_at&&Date.now()-new Date(p.created_at).getTime()<=45*86400000))).slice(0,8);
    if(!fresh.length){section?.remove();return;}
    if(!section){section=document.createElement('section');section.id='enhNewArrivals';section.className='enh-new-section';chipAnchor.insertAdjacentElement('beforebegin',section);}
    section.innerHTML=`<div class="enh-new-head"><div><p class="eyebrow accent">JUST ADDED</p><h2>New Arrivals</h2></div><button id="enhViewAllNew" class="btn ghost compact" type="button">View all new</button></div><div class="enh-new-strip">${fresh.map(p=>`<button class="enh-new-card" data-id="${p.id}" type="button">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="">`:`<div class="enh-new-placeholder">${initials(p.name)}</div>`}<span><strong>${escapeHtml(p.name)}</strong><small>${money(p.price)} · ${escapeHtml(stockState(p)[1])}</small></span></button>`).join('')}</div>`;
    section.querySelectorAll('.enh-new-card').forEach(b=>b.onclick=()=>{document.getElementById('searchInput').value=productById(b.dataset.id)?.name||'';renderProducts();document.querySelector('.toolbar')?.scrollIntoView({behavior:'smooth'});trackEvent('product_view',b.dataset.id);});
    document.getElementById('enhViewAllNew').onclick=()=>{const f=document.getElementById('enhBadgeFilter');if(f)f.value='new';applyExtraFilters();document.querySelector('.toolbar')?.scrollIntoView({behavior:'smooth'});};
  }

  async function toggleProductBadge(id,column,on,button){
    button.disabled=true;
    try{
      await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify({[column]:!on,updated_at:new Date().toISOString()})});
      await Promise.all([loadAdminProducts(),loadProducts()]);
      safeToast('Product badge updated');
    }catch(err){safeToast(err.message||'Could not update badge');button.disabled=false;}
  }
  function decorateAdminProducts(){
    document.querySelectorAll('#adminProducts .admin-row').forEach(row=>{
      if(row.querySelector('.enh-admin-tags'))return;
      const edit=row.querySelector('.edit-product');const id=edit?.dataset.id,p=productById(id);if(!id||!p)return;
      const holder=document.createElement('div');holder.className='enh-admin-tags';
      const defs=[['badge_recommended','Recommended'],['badge_best_seller','Best Seller'],['badge_popular','Popular'],['badge_new','New']];
      holder.innerHTML=defs.map(([col,label])=>`<button type="button" class="enh-admin-tag ${p[col]?'active':''}" data-col="${col}">${label}</button>`).join('');
      const main=row.querySelector('.admin-row-main > div')||row.querySelector('.admin-row-main');main?.appendChild(holder);
      holder.querySelectorAll('button').forEach(b=>b.onclick=()=>toggleProductBadge(id,b.dataset.col,!!p[b.dataset.col],b));
    });
  }

  function injectAnalyticsAdmin(){
    const tabs=document.querySelector('#adminDashboard .admin-tabs');if(!tabs||document.getElementById('enhAnalyticsTabButton'))return;
    const button=document.createElement('button');button.id='enhAnalyticsTabButton';button.className='admin-tab';button.type='button';button.textContent='Menu Analytics';button.dataset.tab='menuanalytics';tabs.appendChild(button);
    const dashboard=document.getElementById('adminDashboard');
    const panel=document.createElement('section');panel.id='menuanalyticsTab';panel.className='admin-tab-panel hidden';
    panel.innerHTML=`<div class="admin-toolbar"><div><h3>Menu Analytics</h3><p class="admin-help">Customer interest and menu interaction from the last 30 days.</p></div><button id="enhRefreshAnalytics" class="btn ghost" type="button">Refresh</button></div><div class="enh-analytics-kpis"><div class="enh-kpi"><span>Product views</span><strong id="enhViews">0</strong></div><div class="enh-kpi"><span>Favourites</span><strong id="enhFavs">0</strong></div><div class="enh-kpi"><span>Add to cart</span><strong id="enhAdds">0</strong></div><div class="enh-kpi"><span>Restock interest</span><strong id="enhRestocks">0</strong></div></div><div class="sales-table-wrap"><table class="enh-analytics-table"><thead><tr><th>Product</th><th>Views</th><th>Image opens</th><th>Favourites</th><th>Adds</th><th>Restock interest</th></tr></thead><tbody id="enhAnalyticsBody"><tr><td colspan="6">Open this tab to load analytics.</td></tr></tbody></table></div>`;
    dashboard.appendChild(panel);
    button.onclick=()=>{
      document.querySelectorAll('#adminDashboard .admin-tab').forEach(x=>x.classList.remove('active'));button.classList.add('active');
      document.querySelectorAll('#adminDashboard .admin-tab-panel').forEach(x=>x.classList.add('hidden'));panel.classList.remove('hidden');loadMenuAnalytics();
    };
    document.getElementById('enhRefreshAnalytics').onclick=loadMenuAnalytics;
  }

  async function loadMenuAnalytics(){
    const body=document.getElementById('enhAnalyticsBody');if(!body)return;body.innerHTML='<tr><td colspan="6">Loading analytics…</td></tr>';
    try{
      const since=new Date(Date.now()-30*86400000).toISOString();
      const [events,interest]=await Promise.all([
        api(`/rest/v1/menu_analytics_events?select=event_type,product_id,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=5000`,{auth:true}),
        api('/rest/v1/back_in_stock_interest?select=product_id,created_at&order=created_at.desc&limit=5000',{auth:true})
      ]);
      const map=new Map();
      const rowFor=id=>{id=String(id||'unknown');if(!map.has(id))map.set(id,{views:0,image:0,fav:0,adds:0,restock:0});return map.get(id);};
      events.forEach(e=>{const r=rowFor(e.product_id);if(e.event_type==='product_view')r.views++;if(e.event_type==='image_enlarge')r.image++;if(e.event_type==='favourite')r.fav++;if(e.event_type==='add_to_cart')r.adds++;});
      interest.forEach(e=>rowFor(e.product_id).restock++);
      document.getElementById('enhViews').textContent=events.filter(e=>e.event_type==='product_view').length;
      document.getElementById('enhFavs').textContent=events.filter(e=>e.event_type==='favourite').length;
      document.getElementById('enhAdds').textContent=events.filter(e=>e.event_type==='add_to_cart').length;
      document.getElementById('enhRestocks').textContent=interest.length;
      const rows=[...map.entries()].map(([id,r])=>({id,...r,total:r.views+r.image+r.fav+r.adds+r.restock})).sort((a,b)=>b.total-a.total);
      body.innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(productById(r.id)?.name||'Deleted/unknown product')}</td><td>${r.views}</td><td>${r.image}</td><td>${r.fav}</td><td>${r.adds}</td><td>${r.restock}</td></tr>`).join(''):'<tr><td colspan="6">No analytics yet.</td></tr>';
    }catch(err){body.innerHTML=`<tr><td colspan="6">${escapeHtml(err.message||'Could not load analytics')}</td></tr>`;}
  }

  function enhanceAnnouncementSettings(){
    const input=document.getElementById('settingBannerText');if(!input)return;
    const label=input.closest('label');if(label&&!label.dataset.enhanced){label.dataset.enhanced='1';const text=[...label.childNodes].find(n=>n.nodeType===3);if(text)text.textContent='Admin announcement / customer banner';const note=document.createElement('small');note.className='enh-announcement-note';note.textContent='This message appears at the top of the customer menu. Use it for stock notices, hours or important updates.';label.appendChild(note);}
  }

  function enhanceInstallExperience(){
    const floating=document.getElementById('installBakedButton');
    const settings=document.getElementById('installAppButton');
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
    if(standalone){if(floating)floating.style.display='none';if(settings){settings.disabled=true;settings.textContent='Installed';}}
    const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
    if(isiOS&&!standalone&&settings&&!document.getElementById('enhInstallNote')){const n=document.createElement('div');n.id='enhInstallNote';n.className='enh-install-note';n.textContent='On iPhone/iPad: tap Share, then “Add to Home Screen”.';settings.parentElement?.appendChild(n);}
  }

  function bindAnalyticsClicks(){
    if(document.body.dataset.enhAnalyticsBound)return;document.body.dataset.enhAnalyticsBound='1';
    document.addEventListener('click',e=>{
      const card=e.target.closest('.product-card');const id=productIdFromCard(card);
      if(id&&e.target.closest('.product-image img')){trackEvent('image_enlarge',id);trackEvent('product_view',id);}
      if(id&&e.target.closest('.view-strains'))trackEvent('product_view',id);
      const add=e.target.closest('.add-button,.strain-add');if(add?.dataset.id)trackEvent('add_to_cart',add.dataset.id);
    },true);
  }

  function observeUI(){
    const obs=new MutationObserver(()=>{
      injectAdvancedFilters();ensureCompareUI();decorateProductCards();renderNewArrivals();decorateAdminProducts();injectAnalyticsAdmin();enhanceAnnouncementSettings();enhanceInstallExperience();
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

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
        strains.filter((strain) => Number(strain.qty) > 0).forEach((strain) => candidates.push({product:p,strain,available:Number(strain.qty),displayName:`${p.name} — ${strain.name}`}));
        return;
      }
      if (Number(p.stock) > 0) candidates.push({product:p,strain:null,available:Number(p.stock),displayName:p.name});
    });

    if (!candidates.length) {
      result.innerHTML = `<div class="surprise-empty"><strong>No match under ${money(budget)}</strong><br>Try a higher budget.</div>`;
      return;
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    const pick = picked.product, strain = picked.strain, unitPrice = Number(pick.price || 0);
    const maxByBudget = unitPrice > 0 ? Math.floor(budget / unitPrice) : picked.available;
    const qty = Math.max(1, Math.min(picked.available, Math.max(1, maxByBudget)));
    trackEvent('surprise_pick',pick.id);
    trackEvent('product_view',pick.id);

    const img = pick.image_url ? `<img src="${escapeHtml(pick.image_url)}" alt="${escapeHtml(picked.displayName)}">` : `<div class="surprise-placeholder">${initials(strain ? strain.name : pick.name)}</div>`;
    const normalDescription = splitProductDescription(pick.description).description || 'Available now on the live menu.';
    const categoryLabel = displayCategory(pick.category) || pick.group_name || 'Product';

    result.innerHTML = `<div class="surprise-pick"><div class="surprise-image">${img}</div><div class="surprise-copy"><div class="surprise-label">YOUR SURPRISE PICK</div><h3>${escapeHtml(picked.displayName)}</h3><p>${escapeHtml(normalDescription)}</p><div class="surprise-meta"><span>${escapeHtml(categoryLabel)}</span><strong>${money(unitPrice)}</strong></div>${strain ? `<div class="surprise-meta"><span>Strain stock</span><strong>${picked.available} available</strong></div>` : ''}<div class="surprise-actions"><button class="btn primary" id="surpriseAddOne" type="button">Add 1 to cart</button>${qty > 1 ? `<button class="btn ghost" id="surpriseAddBudget" type="button">Add ${qty} (${money(qty * unitPrice)})</button>` : ''}<button class="btn ghost" id="surpriseAgain" type="button">Surprise me again</button></div></div></div>`;

    document.querySelector('#surpriseAddOne').onclick = () => {trackEvent('add_to_cart',pick.id); if (strain) addStrainToCart(pick, strain, 1); else addToCart(pick.id, 1);};
    const budgetButton = document.querySelector('#surpriseAddBudget');
    if (budgetButton) budgetButton.onclick = () => {trackEvent('add_to_cart',pick.id); if (strain) addStrainToCart(pick, strain, qty); else addToCart(pick.id, qty);};
    document.querySelector('#surpriseAgain').onclick = surpriseMeWithStrains;
  }

  // Replace Surprise Me with the strain-aware version.
  window.runSurpriseMe = surpriseMeWithStrains;
  const goButton = document.querySelector('#surpriseGo');
  if (goButton) goButton.onclick = surpriseMeWithStrains;

  injectStyles();injectAdvancedFilters();ensureCompareUI();decorateProductCards();renderNewArrivals();decorateAdminProducts();injectAnalyticsAdmin();enhanceAnnouncementSettings();enhanceInstallExperience();bindAnalyticsClicks();observeUI();
})();
