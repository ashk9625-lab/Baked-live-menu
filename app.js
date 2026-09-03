const SUPABASE_URL = 'https://jtahitryhtrjgboqnimz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KeEZVzifnm7OT-hA1h7ueg_1QWL1wCh';
const LOCKED_ORDER_CONTACT_NUMBER = "27678454691";
const LOCKED_WHATSAPP_NUMBERS = ["27678454691","27720456823","27676604465"];
const FALLBACK_PRODUCTS = [
  {id:'demo-1',sku:'PRE-BBC',name:'Blueberry Cheesecake',group_name:'Platinum',category:'Pre-Rolls',strength:'1g',price:120,stock:24,reorder_level:5,description:'Smooth dessert-inspired pre-roll.',image_url:null,active:true},
  {id:'demo-2',sku:'EDI-CD25',name:'Cookie Dough',group_name:'Edibles',category:'Edibles',strength:'25mg',price:65,stock:30,reorder_level:6,description:'Soft cookie dough edible.',image_url:null,active:true},
  {id:'demo-3',sku:'FLW-PW',name:'Platinum Wreck',group_name:'Platinum',category:'Flower',strength:'1g',price:180,stock:18,reorder_level:5,description:'Premium platinum-range product.',image_url:null,active:true},
  {id:'demo-4',sku:'PRE-DSS',name:'Double Stuffed Sorbet',group_name:'Silver',category:'Pre-Rolls',strength:'1g',price:130,stock:20,reorder_level:5,description:'Bold, fruity pre-roll.',image_url:null,active:true},
  {id:'demo-5',sku:'EDI-EC25',name:'Eye Candy',group_name:'Edibles',category:'Edibles',strength:'25mg',price:70,stock:4,reorder_level:6,description:'Colourful premium edible.',image_url:null,active:true},
  {id:'demo-6',sku:'VAP-DISP',name:'Baked Disposable Vape',group_name:'Vapes',category:'Disposable Vapes',strength:'1ml',price:350,stock:0,reorder_level:4,description:'Distillate disposable vape.',image_url:null,active:true}
];

let products = [], cart = JSON.parse(localStorage.getItem('baked-cart') || '[]'), accessToken = localStorage.getItem('baked-access-token') || '';
let activeVaultFilter='all';
let siteSettings={store_open:true,auto_hours:false,opening_time:'09:00',closing_time:'18:00',banner_text:''};
let deferredInstallPrompt=null;
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const money = (v) => new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(v||0));
const initials = (name) => name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const stockState = (p) => p.stock <= 0 ? ['out','Out of stock'] : p.stock <= p.reorder_level ? ['low','Low stock'] : ['in','In stock'];
const headers = (auth=false) => ({apikey:SUPABASE_KEY,Authorization:`Bearer ${auth && accessToken ? accessToken : SUPABASE_KEY}`,'Content-Type':'application/json'});

async function api(path, options={}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {...options, headers:{...headers(options.auth),...(options.headers||{})}});
  if (!response.ok) {
    const body = await response.text();
    let msg = `Request failed (${response.status})`;
    try { const j = JSON.parse(body); msg = j.message || j.error_description || j.hint || msg; } catch {}
    throw new Error(msg);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.remove('hidden');
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>el.classList.add('hidden'),2600);
}
function persistCart(){ localStorage.setItem('baked-cart',JSON.stringify(cart)); updateCart(); }
function updateStats(){
  $('#productCount').textContent=products.length;
  $('#inStockCount').textContent=products.filter(p=>p.stock>0).length;
  $('#categoryCount').textContent=new Set(products.map(p=>displayCategory(p.category)).filter(Boolean)).size;
}
function displayCategory(category){
  const c=String(category||'').trim();
  if(/^(oil|oils|capsule|capsules|oils\s*&\s*capsules)$/i.test(c)) return 'Oils & Capsules';
  return c;
}
function buildFilters(){
  const selected=$('#categoryFilter').value;
  const cats=[...new Set(products.map(p=>displayCategory(p.category)).filter(Boolean))].sort();
  $('#categoryFilter').innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  $('#categoryFilter').value=cats.includes(selected)?selected:'all';
  $('#categoryChips').innerHTML=['all',...cats].map(c=>`<button class="chip ${c===$('#categoryFilter').value?'active':''}" data-category="${escapeHtml(c)}">${c==='all'?'All products':escapeHtml(c)}</button>`).join('');
  $$('#categoryChips .chip').forEach(b=>b.onclick=()=>{ $('#categoryFilter').value=b.dataset.category; buildFilters(); renderProducts(); });
}
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
const LEGACY_NAMES=['baked alaska','exodus cheese','candy pavé','candy pave',"baker's delight",'bakers delight'];
const vaultLabels={new:'New Drops',legacy:'Legacy Strains',platinum:'Platinum Collection',staff:'Staff Picks',limited:'Limited Edition',trending:'Trending This Week'};
function isVaultProduct(p,type){
  const text=`${p.name||''} ${p.group_name||''} ${p.category||''} ${p.description||''}`.toLowerCase();
  if(type==='new'){const d=p.created_at||p.updated_at;return d?Date.now()-new Date(d).getTime()<=1000*60*60*24*45:false;}
  if(type==='legacy')return LEGACY_NAMES.includes(String(p.name||'').toLowerCase())||text.includes('legacy');
  if(type==='platinum')return String(p.group_name||'').toLowerCase().includes('platinum');
  if(type==='staff')return !!p.featured;
  if(type==='limited')return (p.stock>0&&p.stock<=Math.max(Number(p.reorder_level||0),5))||text.includes('limited');
  if(type==='trending')return !!p.featured||text.includes('trending')||text.includes('best seller')||text.includes('popular');
  return true;
}
function updateVault(){
  const types=['new','legacy','platinum','staff','limited','trending'];
  const ids={new:'vaultCountNew',legacy:'vaultCountLegacy',platinum:'vaultCountPlatinum',staff:'vaultCountStaff',limited:'vaultCountLimited',trending:'vaultCountTrending'};
  types.forEach(type=>{const el=$('#'+ids[type]);if(el)el.textContent=`${products.filter(p=>isVaultProduct(p,type)).length} products`;});
  $$('#vaultGrid .vault-card').forEach(card=>card.classList.toggle('active',card.dataset.vault===activeVaultFilter));
  const label=$('#vaultActiveLabel'),clear=$('#clearVaultFilter');
  if(activeVaultFilter==='all'){label?.classList.add('hidden');clear?.classList.add('hidden');}
  else{if(label){label.textContent=`Viewing The Baked Vault: ${vaultLabels[activeVaultFilter]}`;label.classList.remove('hidden')}clear?.classList.remove('hidden');}
}
function setVaultFilter(type){activeVaultFilter=type;$('#categoryFilter').value='all';$('#stockFilter').value='all';$('#searchInput').value='';buildFilters();updateVault();renderProducts();document.querySelector('.toolbar')?.scrollIntoView({behavior:'smooth',block:'start'});}

function splitProductDescription(raw=''){
  const text=String(raw||'');
  const marker='[[STRAINS]]';
  const at=text.indexOf(marker);
  if(at<0)return {description:text.trim(),strainText:''};
  return {description:text.slice(0,at).trim(),strainText:text.slice(at+marker.length).trim()};
}
function parseStrainLines(text=''){
  const items=[];
  String(text||'').split(/\r?\n/).forEach(rawLine=>{
    let line=String(rawLine||'').trim(); if(!line)return;

    // Flower pack-size format entered in Admin, e.g.:
    // DARK STAR(I)=60X1G
    // DARK STAR(I)=40X3G
    let v=line.match(/^(.+?)\s*=\s*(\d+(?:\.\d+)?)\s*[x×]\s*(1|2|3|5)\s*g\s*$/i);
    if(v){
      const name=String(v[1]||'').trim();
      const qty=Number(v[2]);
      const weightGrams=Number(v[3]);
      if(name&&Number.isFinite(qty)&&qty>=0)items.push({name,qty,weightGrams,backendName:`${name} [${weightGrams}G]`});
      return;
    }

    // Also support pack size before the strain name, e.g. 1G DARK STAR(I)=25
    v=line.match(/^\s*(1|2|3|5)\s*g\s+(.+?)\s*(?:=|:|-)\s*(\d+(?:\.\d+)?)\s*$/i);
    if(v){
      const weightGrams=Number(v[1]);
      const name=String(v[2]||'').trim();
      const qty=Number(v[3]);
      if(name&&Number.isFinite(qty)&&qty>=0)items.push({name,qty,weightGrams,backendName:`${name} [${weightGrams}G]`});
      return;
    }

    // Internal stored format used so the order RPC can deduct the exact size:
    // DARK STAR(I) [1G] = 60
    v=line.match(/^(.+?)\s*\[(1|2|3|5)\s*g\]\s*=\s*(\d+(?:\.\d+)?)\s*$/i);
    if(v){
      const name=String(v[1]||'').trim();
      const weightGrams=Number(v[2]);
      const qty=Number(v[3]);
      if(name&&Number.isFinite(qty)&&qty>=0)items.push({name,qty,weightGrams,backendName:`${name} [${weightGrams}G]`});
      return;
    }

    // Standard strain stock formats.
    let m=line.match(/^(.+?)\s*(?:=|:|-)\s*(\d+(?:\.\d+)?)\s*g?\s*$/i);
    if(!m){
      const x=line.match(/^(\d+(?:\.\d+)?)\s*g?\s*[x×]\s*(.+?)\s*$/i);
      if(x)m=[null,x[2],x[1]];
    }
    if(!m){
      const x=line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*g\s*$/i);
      if(x)m=[null,x[1],x[2]];
    }
    if(m){
      const name=String(m[1]||'').trim().replace(/[,:;=-]+$/,'').trim();
      const qty=Number(m[2]);
      if(name&&Number.isFinite(qty)&&qty>=0)items.push({name,qty,weightGrams:null,backendName:name});
    }
  });
  return items;
}
function parseStrainList(description=''){
  const parts=splitProductDescription(description);
  let items=parseStrainLines(parts.strainText);
  if(items.length)return items;
  const text=String(parts.description||'').replace(/[,\n;|]+/g,' ').replace(/\s+/g,' ').trim();
  if(!text)return [];
  const re=/(\d+)\s*[x×]\s*(.+?)(?=\s+\d+\s*[x×]\s+|$)/gi;
  let m;
  while((m=re.exec(text))){
    const qty=Number(m[1]);
    const name=String(m[2]||'').trim().replace(/[.,;:-]+$/,'');
    if(qty>=0&&name)items.push({qty,name,weightGrams:null,backendName:name});
  }
  return items;
}
function formatStrainsForAdmin(description=''){
  return parseStrainList(description).map(s=>s.weightGrams?`${s.name}=${s.qty}X${s.weightGrams}G`:`${s.name} = ${s.qty}`).join('\n');
}
function composeProductDescription(normalDescription='',strainText=''){
  const cleanDesc=String(normalDescription||'').trim();
  const strains=parseStrainLines(strainText);
  if(!strains.length)return cleanDesc;
  const stored=strains.map(s=>s.weightGrams?`${s.backendName} = ${s.qty}`:`${s.name} = ${s.qty}`).join('\n');
  return `${cleanDesc}${cleanDesc?'\n\n':''}[[STRAINS]]\n${stored}`;
}
function isFlowerProduct(p){
  return String(p?.category||'').toLowerCase().replace(/[^a-z]/g,'').includes('flower');
}
const FLOWER_WEIGHTS=[1,2,3,5];
function openStrainModal(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  const strains=parseStrainList(p.description);
  if(!strains.length)return;
  const flower=isFlowerProduct(p);
  const sizedFlower=flower&&strains.some(s=>s.weightGrams);

  $('#strainModalTitle').textContent=p.name;
  $('#strainModalSubtitle').textContent=sizedFlower?'Choose a strain and available gram size':flower?'Choose a strain, then select 1G, 2G, 3G or 5G':'Choose a strain and quantity';

  if(sizedFlower){
    // EVERY Flower pack-size entry is displayed as its own clean row:
    // STRAIN NAME | size | quantity | Add to cart
    const variants=strains.filter(s=>s.weightGrams);
    $('#strainModalList').innerHTML=variants.map((s,i)=>`<div class="strain-row flower-variant-row">
      <div class="strain-info">
        <strong>${escapeHtml(s.name)}</strong>
        <small>${s.weightGrams}G: ${s.qty} available</small>
      </div>
      <div class="flower-single-size">${s.weightGrams}G</div>
      <input class="strain-quantity flower-variant-quantity" data-index="${i}" type="number" min="1" max="${Math.max(1,Number(s.qty||0))}" value="1" inputmode="numeric" ${Number(s.qty)<=0?'disabled':''}>
      <button class="btn primary flower-variant-add" data-index="${i}" ${Number(s.qty)<=0?'disabled':''}>Add to cart</button>
    </div>`).join('');

    $$('.flower-variant-add').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.index);
      const s=variants[i];
      const row=btn.closest('.flower-variant-row');
      const qty=Number(row?.querySelector('.flower-variant-quantity')?.value||1);
      addStrainToCart(p,s,qty,s.weightGrams);
    });
  }else{
    $('#strainModalList').innerHTML=strains.map((s,i)=>`<div class="strain-row">
      <div class="strain-info"><strong>${escapeHtml(s.name)}</strong><small>${s.qty} available</small></div>
      ${flower?`<div class="flower-weight-picker" data-row="${i}">${FLOWER_WEIGHTS.map(w=>`<button type="button" class="flower-weight-btn ${w===1?'active':''}" data-weight="${w}" ${s.qty<w?'disabled':''}>${w}G</button>`).join('')}</div>`:''}
      <input class="strain-quantity" data-index="${i}" type="number" min="1" max="${flower?Math.max(1,Math.floor(s.qty/(FLOWER_WEIGHTS.find(w=>s.qty>=w)||1))):s.qty}" value="1" inputmode="numeric">
      <button class="btn primary strain-add" data-index="${i}" ${s.qty<=0?'disabled':''}>Add to cart</button>
    </div>`).join('');

    if(flower){
      $$('.flower-weight-picker').forEach(picker=>{
        picker.querySelectorAll('.flower-weight-btn').forEach(btn=>btn.onclick=()=>{
          picker.querySelectorAll('.flower-weight-btn').forEach(x=>x.classList.remove('active'));
          btn.classList.add('active');
          const row=picker.closest('.strain-row'),input=row.querySelector('.strain-quantity'),s=strains[Number(picker.dataset.row)],w=Number(btn.dataset.weight||1);
          input.max=Math.max(1,Math.floor(Number(s.qty||0)/w));
          if(Number(input.value)>Number(input.max))input.value=input.max;
        });
      });
    }
    $$('.strain-add').forEach(btn=>btn.onclick=()=>{
      const i=Number(btn.dataset.index),s=strains[i],row=btn.closest('.strain-row');
      const qty=Number(row.querySelector('.strain-quantity')?.value||1);
      const weight=flower?Number(row.querySelector('.flower-weight-btn.active')?.dataset.weight||1):null;
      addStrainToCart(p,s,qty,weight);
    });
  }

  $('#strainModal').classList.remove('hidden');
  $('#strainModal').setAttribute('aria-hidden','false');
  $('#drawerBackdrop').classList.remove('hidden');
}

function addStrainToCart(p,strain,requestedQuantity=1,weight=1){
  const packs=Math.max(1,Math.floor(Number(requestedQuantity)||1));
  const grams=isFlowerProduct(p)?FLOWER_WEIGHTS.includes(Number(weight))?Number(weight):1:1;
  const required=packs*grams;
  if(required>strain.qty)return toast(`Only ${strain.qty}g ${strain.name} available`);
  const key=`${p.id}::${strain.name}::${grams}g`;
  const item=cart.find(x=>String(x.cartKey||x.id)===key);
  const existingGrams=item?item.quantity*grams:0;
  if(existingGrams+required>strain.qty)return toast(`Only ${Math.max(0,strain.qty-existingGrams)}g more ${strain.name} available`);
  if(item)item.quantity+=packs;
  else cart.push({id:p.id,cartKey:key,name:isFlowerProduct(p)?`${p.name} — ${strain.name} — ${grams}G`:`${p.name} — ${strain.name}`,parentName:p.name,strain:strain.name,weightGrams:grams,price:Number(p.price)*grams,quantity:packs,stock:Math.floor(strain.qty/grams),strainStockGrams:strain.qty});
  persistCart();
  toast(`${packs} × ${grams}G ${strain.name} added to cart`);
}
function renderProducts(){
  const term=$('#searchInput').value.trim().toLowerCase(), cat=$('#categoryFilter').value, filter=$('#stockFilter').value;
  const shown=products.filter(p=>{
    const state=stockState(p)[0], hay=`${p.name} ${p.sku} ${p.group_name} ${p.category} ${p.description}`.toLowerCase();
    return (!term||hay.includes(term))&&(cat==='all'||displayCategory(p.category)===cat)&&(filter==='all'||filter===state)&&(activeVaultFilter==='all'||isVaultProduct(p,activeVaultFilter));
  });
  $('#status').textContent=activeVaultFilter==='all'?`Showing ${shown.length} of ${products.length} products`:`${vaultLabels[activeVaultFilter]} · ${shown.length} products`;
  $('#productGrid').innerHTML=shown.length?shown.map(p=>{
    const [state,label]=stockState(p), img=p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`:`<div class="placeholder">${initials(p.name)}</div>`;
    const strains=parseStrainList(p.description);
    const strainSummary=strains.length?`<button type="button" class="view-strains" data-id="${p.id}"><span>View ${strains.length} strain${strains.length===1?'':'s'}</span><strong>Open →</strong></button>`:`<p>${escapeHtml(splitProductDescription(p.description).description||'Current live menu item.')}</p>`;
    return `<article class="product-card ${strains.length?'has-strains':''}" ${strains.length?`data-strain-card="${p.id}"`:''}><div class="product-image">${img}<span class="badge ${state}">${label}</span></div><div class="product-body"><div class="product-meta"><span>${escapeHtml(p.group_name||displayCategory(p.category)||'Product')}</span><span>${escapeHtml(p.strength||'')}</span></div><h3>${escapeHtml(p.name)}</h3>${strainSummary}<div class="product-footer"><div><strong>${money(p.price)}</strong><small>${p.stock} available</small></div><div class="product-order-controls"><input class="product-quantity" data-id="${p.id}" type="number" min="1" max="${p.stock}" value="1" inputmode="numeric" aria-label="Quantity for ${escapeHtml(p.name)}" ${(p.stock<=0||!orderingAllowed())?'disabled':''}><button class="btn ${p.stock>0?'primary':'disabled'} add-button" data-id="${p.id}" ${(p.stock<=0||!orderingAllowed())?'disabled':''}>${orderingAllowed()?(p.stock>0?'Add to cart':'Unavailable'):'Store closed'}</button></div></div></div></article>`;
  }).join(''):`<div class="empty-state wide"><h3>No matching products</h3><p>Try another category or search term.</p></div>`;
  $$('.add-button').forEach(b=>b.onclick=e=>{e.stopPropagation(); const p=products.find(x=>String(x.id)===String(b.dataset.id)); if(p&&parseStrainList(p.description).length)return openStrainModal(p.id); const input=document.querySelector(`.product-quantity[data-id="${b.dataset.id}"]`); addToCart(b.dataset.id,Number(input?.value||1));});
  $$('.product-quantity').forEach(i=>i.onclick=e=>e.stopPropagation());
  $$('.view-strains').forEach(b=>b.onclick=e=>{e.stopPropagation();openStrainModal(b.dataset.id);});
  $$('.product-card.has-strains').forEach(card=>card.onclick=()=>openStrainModal(card.dataset.strainCard));
}
async function loadProducts(){
  try{
    const data=await api('/rest/v1/products?select=*&active=eq.true&order=group_name.asc,name.asc');
    products=data;
    $('#status').textContent=data.length?'Connected to live inventory':'No products are currently available';
  }catch(e){ products=[]; $('#status').textContent='Could not load the live inventory'; }
  updateStats(); buildFilters(); updateVault(); renderProducts(); renderFeaturedProducts(); updateCart();
}
function addToCart(id,requestedQuantity=1){
  const p=products.find(x=>String(x.id)===String(id)); if(!p||p.stock<=0)return;
  const amount=Math.max(1,Math.floor(Number(requestedQuantity)||1));
  const item=cart.find(x=>String(x.id)===String(id));
  const existing=item?item.quantity:0;
  if(existing+amount>p.stock)return toast(`Only ${p.stock-existing} more available`);
  if(item)item.quantity+=amount;
  else cart.push({id:p.id,name:p.name,price:Number(p.price),quantity:amount,stock:p.stock});
  persistCart(); toast(`${amount} × ${p.name} added to cart`);
}
function removeCartItem(key){
  cart=cart.filter(x=>String(x.cartKey||x.id)!==String(key));
  localStorage.setItem('baked-cart',JSON.stringify(cart));
  updateCart();
  toast('Item removed from cart');
}
function setCartQty(key,value){
  const item=cart.find(x=>String(x.cartKey||x.id)===String(key)); if(!item)return;
  const max=Math.max(1,Number(item.stock||1));
  let qty=parseInt(value,10);
  if(!Number.isFinite(qty)) qty=item.quantity;
  qty=Math.max(1,Math.min(max,qty));
  item.quantity=qty;
  localStorage.setItem('baked-cart',JSON.stringify(cart));
  updateCart();
}
function updateCart(){
  const count=cart.reduce((a,b)=>a+b.quantity,0);
  const total=cart.reduce((a,b)=>a+b.quantity*b.price,0);
  $('#cartCount').textContent=count;
  $('#cartTotal').textContent=money(total);

  $('#cartItems').innerHTML=cart.map(i=>`<div class="cart-item">
    <div class="cart-item-info">
      <strong>${escapeHtml(i.name)}</strong>
      <small>${money(i.price)} each · ${i.stock} available</small>
    </div>
    <div class="cart-item-actions">
      <div class="cart-direct-qty">
        <label>Qty</label>
        <input class="cart-qty-input" data-id="${escapeHtml(i.cartKey||i.id)}" type="number" min="1" max="${i.stock}" value="${i.quantity}" inputmode="numeric" pattern="[0-9]*">
      </div>
      <button type="button" class="btn danger compact cart-remove-item" data-id="${escapeHtml(i.cartKey||i.id)}">Remove</button>
    </div>
  </div>`).join('');

  $('#cartEmpty').classList.toggle('hidden',!!cart.length);
  $('#checkoutArea').classList.toggle('hidden',!cart.length);

  $$('.cart-qty-input').forEach(input=>{
    input.onfocus=()=>input.select();
    input.onblur=()=>setCartQty(input.dataset.id,input.value);
    input.onchange=()=>setCartQty(input.dataset.id,input.value);
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}};
  });

  $$('.cart-remove-item').forEach(button=>{
    button.onclick=()=>removeCartItem(button.dataset.id);
  });
}
function clearCart(){
  if(!cart.length)return;
  if(!confirm('Clear all items from your cart?'))return;
  cart=[];
  localStorage.setItem('baked-cart',JSON.stringify(cart));
  updateCart();
  toast('Cart cleared');
}
function openDrawer(){ $('#cartDrawer').classList.add('open'); $('#drawerBackdrop').classList.remove('hidden'); $('#cartDrawer').setAttribute('aria-hidden','false'); }
function closeOverlays(){ $$('.drawer').forEach(x=>x.classList.remove('open')); $$('.modal').forEach(x=>x.classList.add('hidden')); $('#drawerBackdrop').classList.add('hidden'); }
function closeStrainModal(){
  const modal=$('#strainModal');
  if(modal)modal.classList.add('hidden');
  const backdrop=$('#drawerBackdrop');
  if(backdrop && !document.querySelector('.drawer.open'))backdrop.classList.add('hidden');
}

const WHATSAPP_ORDER_NUMBER = LOCKED_WHATSAPP_NUMBERS[0];


function sendOrderToLockedWhatsApps(message, firstWindow=null){
  const encoded=encodeURIComponent(message);
  LOCKED_WHATSAPP_NUMBERS.forEach((number,index)=>{
    const url=`https://wa.me/${number}?text=${encoded}`;
    if(index===0 && firstWindow){
      firstWindow.location.href=url;
    }else{
      setTimeout(()=>window.open(url,'_blank'),index*350);
    }
  });
}

function buildWhatsAppOrderMessage(orderNo, customerName, customerPhone, note, orderedItems) {
  const total = orderedItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const itemLines = orderedItems.map(item =>
    `${item.quantity} x ${item.name} - ${money(Number(item.price) * Number(item.quantity))}`
  );

  return [
    '*NEW BAKED LIVE MENU ORDER*',
    '',
    `Order: ${orderNo}`,
    `Customer: ${customerName}`,
    `Phone: ${customerPhone}`,
    '',
    '*Items:*',
    ...itemLines,
    '',
    `*Total: ${money(total)}*`,
    note ? `Note: ${note}` : '',
    '',
    'Please confirm availability and collection/delivery details.'
  ].filter(Boolean).join('\n');
}

let lastOrderForInvoice=null;

function printInvoice(order=lastOrderForInvoice){
  if(!order) return toast('No invoice is available yet');
  const rows=order.items.map(item=>`<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${money(item.price)}</td><td>${money(item.price*item.quantity)}</td></tr>`).join('');
  const total=order.items.reduce((sum,item)=>sum+item.price*item.quantity,0);
  const invoiceWindow=window.open('','_blank','width=900,height=750');
  if(!invoiceWindow) return toast('Allow pop-ups to print the invoice');
  invoiceWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(order.orderNo)}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:40px;max-width:850px;margin:auto}.head{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:20px;margin-bottom:25px}.brand{font-size:28px;font-weight:800}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:25px}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f3f3}.total{font-size:20px;font-weight:800;text-align:right;margin-top:25px}.note{margin-top:25px;padding:15px;background:#f7f7f7}@media print{button{display:none}}</style></head><body><div class="head"><div><div class="brand">BAKED AFRICA</div><div class="muted">Live Menu Order Invoice</div></div><div><strong>Invoice ${escapeHtml(order.orderNo)}</strong><br><span class="muted">${new Date(order.createdAt).toLocaleString('en-ZA')}</span></div></div><p><strong>Customer:</strong> ${escapeHtml(order.customerName)}<br><strong>Cellphone:</strong> ${escapeHtml(order.customerPhone)}</p><table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${money(total)}</div>${order.note?`<div class="note"><strong>Order note:</strong><br>${escapeHtml(order.note)}</div>`:''}<p class="muted" style="margin-top:35px">Thank you for your order. This invoice confirms the order request and is subject to final stock confirmation.</p><button onclick="window.print()">Print invoice</button></body></html>`);
  invoiceWindow.document.close();
  invoiceWindow.focus();
  setTimeout(()=>invoiceWindow.print(),300);
}

async function placeOrder(e){
  e.preventDefault();

  const btn=$('#placeOrderButton');
  const customerName=$('#customerName').value.trim();
  const customerPhone=LOCKED_ORDER_CONTACT_NUMBER;
  const note=$('#customerNote').value.trim();
  const orderedItems=cart.map(item=>({...item}));

  // Open a blank tab immediately so browsers do not block WhatsApp after the database request.
  const whatsappWindow=window.open('about:blank','_blank');

  btn.disabled=true;
  $('#checkoutMessage').textContent='Submitting order…';

  try{
    if(cart.some(i=>String(i.id).startsWith('demo-'))) throw new Error('The live database has no products yet. Add products in Admin before accepting orders.');

    const orderNo=await api('/rest/v1/rpc/place_order',{
      method:'POST',
      body:JSON.stringify({
        p_customer_name:customerName,
        p_customer_phone:customerPhone,
        p_note:note,
        p_items:orderedItems.map(i=>({product_id:i.id,quantity:i.packSizeStock?i.quantity:(i.weightGrams?i.quantity*i.weightGrams:i.quantity),strain:i.strainBackend||i.strain||null}))
      })
    });

    const message=buildWhatsAppOrderMessage(orderNo,customerName,customerPhone,note,orderedItems);
    const whatsappUrl=`https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(message)}`;

    lastOrderForInvoice={orderNo,customerName,customerPhone,note,items:orderedItems,createdAt:new Date().toISOString()};
    const creditUsed=Number(sessionStorage.getItem('baked-credit-use')||0);if(creditUsed>0){const mm=ensureMemberDefaults(getMember());if(mm){mm.storeCredit=Math.max(0,mm.storeCredit-creditUsed);saveMember(mm);}clearMemberCreditUse();}

    cart=[];
    persistCart();
    e.target.reset();
    $('#checkoutMessage').innerHTML=`Order ${escapeHtml(orderNo)} submitted successfully. <button type="button" class="text-button" id="printInvoiceButton">Print invoice</button>`;
    $('#printInvoiceButton').onclick=()=>printInvoice();
    toast(`Order ${orderNo} received`);

    sendOrderToLockedWhatsApps(message,whatsappWindow);

    await loadProducts();
  }catch(err){
    if(whatsappWindow) whatsappWindow.close();
    $('#checkoutMessage').textContent=err.message;
  }

  btn.disabled=false;
}

function showStore(){ $('#storeView').classList.remove('hidden'); $('#adminView').classList.add('hidden'); }
async function showAdmin(){ $('#storeView').classList.add('hidden'); $('#adminView').classList.remove('hidden'); if(accessToken) await verifyAdmin(); }
async function login(e){
  e.preventDefault(); $('#loginMessage').textContent='Signing in…';
  try{
    const data=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value})});
    accessToken=data.access_token; localStorage.setItem('baked-access-token',accessToken); await verifyAdmin(true);
  }catch(err){ $('#loginMessage').textContent=err.message; }
}
async function signupStaff(e){
  e.preventDefault();
  const email=$('#signupEmail').value.trim(), password=$('#signupPassword').value;
  $('#loginMessage').textContent='Creating account…';
  try{
    await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
    $('#loginMessage').textContent='Account created. Confirm the email if requested, then ask an existing admin to approve this email.';
    $('#signupForm').reset();
  }catch(err){$('#loginMessage').textContent=err.message;}
}
async function verifyAdmin(showClaim=false){
  try{
    const isAdmin=await api('/rest/v1/rpc/is_current_user_admin',{method:'POST',auth:true,body:'{}'});
    if(isAdmin){ $('#adminLogin').classList.add('hidden'); $('#adminDashboard').classList.remove('hidden'); await Promise.all([loadAdminProducts(),loadOrders(),loadInventory(),loadSiteSettings(true),loadAdminUsers()]); await updateAdminAlerts(); }
    else { $('#adminLogin').classList.remove('hidden'); $('#adminDashboard').classList.add('hidden'); $('#loginMessage').textContent='This account is signed in but is not yet an admin.'; $('#claimAdminButton').classList.toggle('hidden',!showClaim); }
  }catch{ logout(); }
}
async function claimAdmin(){
  try{ const ok=await api('/rest/v1/rpc/claim_first_admin',{method:'POST',auth:true,body:'{}'}); if(ok){toast('Admin access activated');await verifyAdmin();}else $('#loginMessage').textContent='An admin account already exists.'; }catch(err){$('#loginMessage').textContent=err.message;}
}
function logout(){ accessToken=''; localStorage.removeItem('baked-access-token'); $('#adminLogin').classList.remove('hidden'); $('#adminDashboard').classList.add('hidden'); $('#loginMessage').textContent=''; }
async function loadAdminProducts(){
  try{ const data=await api('/rest/v1/products?select=*&active=eq.true&order=group_name.asc,name.asc',{auth:true}); renderAdminProducts(data); }catch(err){ $('#adminProducts').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`; }
}
function renderAdminProducts(data){
  $('#adminProducts').innerHTML=data.length?data.map(p=>`<article class="admin-row"><div class="admin-row-main"><span class="admin-icon">${initials(p.name)}</span><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.sku)} · ${escapeHtml(p.group_name||p.category)} · ${money(p.price)}</small></div></div><div class="admin-row-data"><span class="stock-number ${p.stock<=p.reorder_level?'warning':''}">${p.stock} units</span><span class="visibility ${p.active?'active':'inactive'}">${p.active?'Visible':'Hidden'}</span><button class="btn ghost compact feature-product" data-id="${p.id}">${p.featured?'★ Featured':'☆ Feature'}</button><button class="btn ghost compact edit-product" data-id="${p.id}">Edit</button><button class="btn ghost compact stock-product" data-id="${p.id}" data-name="${escapeHtml(p.name)}">Stock</button><button class="btn danger compact delete-product" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-sku="${escapeHtml(p.sku||'')}">Delete</button></div></article>`).join(''):'<div class="empty-state"><h3>No products yet</h3><p>Add your first live menu product.</p></div>';
  $$('.edit-product').forEach(b=>b.onclick=()=>openProductModal(data.find(p=>String(p.id)===String(b.dataset.id))));
  $$('.stock-product').forEach(b=>b.onclick=()=>openStockModal(b.dataset.id,b.dataset.name));
  $$('.delete-product').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.id,b.dataset.name,b,b.dataset.sku));
  $$('.feature-product').forEach(b=>b.onclick=()=>toggleFeatured(b.dataset.id,data.find(p=>String(p.id)===String(b.dataset.id))?.featured));
}
async function deleteProduct(id,name,button,sku=''){
  const label=sku?`${name} (${sku})`:name;
  if(!confirm(`Permanently delete "${label}"?\n\nThis deletes this exact product record from the live menu and cannot be undone.`)) return;
  const originalText=button.textContent;
  button.disabled=true;
  button.textContent='Deleting…';
  try{
    // Try the admin delete RPC first. If an older database does not have it
    // or it refuses this record, fall back to a direct authenticated DELETE.
    try{
      await api('/rest/v1/rpc/delete_product_admin',{
        method:'POST',
        auth:true,
        body:JSON.stringify({p_product_id:id})
      });
    }catch(rpcErr){
      console.warn('Admin delete RPC failed, trying direct delete',rpcErr);
      await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{
        method:'DELETE',
        auth:true,
        headers:{Prefer:'return=minimal'}
      });
    }

    let verify=await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id`,{auth:true});
    if(Array.isArray(verify)&&verify.length){
      // One final direct-delete attempt for stubborn/legacy records.
      await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{
        method:'DELETE',
        auth:true,
        headers:{Prefer:'return=minimal'}
      });
      verify=await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id`,{auth:true});
    }
    if(Array.isArray(verify)&&verify.length){
      throw new Error('The database still contains this exact product record');
    }

    cart=cart.filter(item=>String(item.id)!==String(id));
    persistCart();

    const sameName=await api(`/rest/v1/products?name=eq.${encodeURIComponent(name)}&select=id,name,sku,active`,{auth:true});
    const duplicates=Array.isArray(sameName)?sameName.filter(p=>String(p.id)!==String(id)):[];
    if(duplicates.length){
      toast(`${label} deleted. Another product with the same name still exists.`);
    }else{
      toast(`${label} permanently deleted`);
    }

    await Promise.all([loadAdminProducts(),loadInventory(),loadProducts()]);
  }catch(err){
    console.error('Product delete failed',err);
    toast(`Delete failed: ${err.message}`);
    button.disabled=false;
    button.textContent=originalText;
  }
}

function openProductModal(p=null){
  $('#productModalTitle').textContent=p?'Edit product':'Add product'; $('#productForm').reset(); $('#productActive').checked=true; $('#productFeatured').checked=false; $('#productId').value=p?.id||'';
  if(p){ const parts=splitProductDescription(p.description); $('#productName').value=p.name;$('#productSku').value=p.sku;$('#productCategory').value=p.category;$('#productGroup').value=p.group_name;$('#productStrength').value=p.strength||'';$('#productPrice').value=p.price;$('#productStock').value=p.stock;$('#productReorder').value=p.reorder_level;$('#productImage').value=p.image_url||'';$('#productDescription').value=parts.description;$('#productStrains').value=formatStrainsForAdmin(p.description);$('#productActive').checked=p.active;$('#productFeatured').checked=!!p.featured; }
  $('#productModal').classList.remove('hidden'); $('#drawerBackdrop').classList.remove('hidden'); $('#productFormMessage').textContent='';
}
async function saveProduct(e){
  e.preventDefault(); const id=$('#productId').value, payload={name:$('#productName').value.trim(),sku:$('#productSku').value.trim(),category:$('#productCategory').value.trim(),group_name:$('#productGroup').value.trim(),strength:$('#productStrength').value.trim(),price:Number($('#productPrice').value),stock:Number($('#productStock').value),reorder_level:Number($('#productReorder').value),image_url:$('#productImage').value.trim()||null,description:composeProductDescription($('#productDescription').value,$('#productStrains').value),active:$('#productActive').checked,featured:$('#productFeatured').checked,updated_at:new Date().toISOString()};
  $('#productFormMessage').textContent='Saving…';
  try{ await api(`/rest/v1/products${id?`?id=eq.${id}`:''}`,{method:id?'PATCH':'POST',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)}); closeOverlays(); toast(id?'Product updated':'Product added'); await Promise.all([loadAdminProducts(),loadProducts()]); }catch(err){ $('#productFormMessage').textContent=err.message; }
}
function openStockModal(id,name){ $('#stockProductId').value=id;$('#stockProductName').textContent=name;$('#stockForm').reset();$('#stockModal').classList.remove('hidden');$('#drawerBackdrop').classList.remove('hidden');$('#stockFormMessage').textContent=''; }
async function adjustStock(e){
  e.preventDefault(); $('#stockFormMessage').textContent='Updating…';
  try{ await api('/rest/v1/rpc/adjust_stock',{method:'POST',auth:true,body:JSON.stringify({p_product_id:$('#stockProductId').value,p_quantity:Number($('#stockQuantity').value),p_reference:$('#stockReference').value.trim()})}); closeOverlays();toast('Stock updated');await Promise.all([loadAdminProducts(),loadInventory(),loadProducts()]); }catch(err){ $('#stockFormMessage').textContent=err.message; }
}
let adminOrdersCache=[];

async function loadOrders(){
  try{
    const orders=await api('/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=100',{auth:true});
    adminOrdersCache=orders||[];
    $('#adminOrders').innerHTML=orders.length?orders.map(o=>`<article class="order-card"><div class="order-top"><div><strong>${escapeHtml(o.order_number)}</strong><small>${new Date(o.created_at).toLocaleString('en-ZA')}</small></div><select class="order-status" data-id="${o.id}">${['Pending','Confirmed','Ready','Completed','Cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="customer-line"><strong>${escapeHtml(o.customer_name)}</strong><span>${escapeHtml(o.customer_phone)}</span></div><ul>${(o.order_items||[]).map(i=>`<li><span>${i.quantity} × ${escapeHtml(i.product_name)}</span><strong>${money(i.line_total)}</strong></li>`).join('')}</ul>${o.note?`<p class="order-note">${escapeHtml(o.note)}</p>`:''}<div class="order-total"><span>Total</span><strong>${money(o.total)}</strong></div><div class="order-actions"><button class="btn primary compact view-order-detail" data-id="${o.id}">View / Packing Slip</button><button class="btn danger compact delete-order" data-id="${o.id}" data-number="${escapeHtml(o.order_number)}">Delete order</button></div></article>`).join(''):'<div class="empty-state"><h3>No orders yet</h3><p>New customer orders will appear here.</p></div>';
    $$('.order-status').forEach(s=>s.onchange=()=>setOrderStatus(s.dataset.id,s.value));
    $$('.view-order-detail').forEach(b=>b.onclick=()=>openOrderDetail(b.dataset.id));
    $$('.delete-order').forEach(b=>b.onclick=()=>deleteOrder(b.dataset.id,b.dataset.number));
    updateAdminAlerts();
  }catch(err){$('#adminOrders').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
}


let selectedOrderDetail=null;

function openOrderDetail(id){
  const order=adminOrdersCache.find(o=>String(o.id)===String(id));
  if(!order)return toast('Order could not be found');
  selectedOrderDetail=order;
  $('#orderDetailTitle').textContent=order.order_number;
  const items=order.order_items||[];
  $('#orderDetailContent').innerHTML=`
    <div class="order-detail-meta">
      <div><span>Customer</span><strong>${escapeHtml(order.customer_name||'')}</strong></div>
      <div><span>Contact</span><strong>${escapeHtml(order.customer_phone||'')}</strong></div>
      <div><span>Date</span><strong>${new Date(order.created_at).toLocaleString('en-ZA')}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(order.status||'Pending')}</strong></div>
    </div>
    <div class="order-detail-table-wrap">
      <table class="order-detail-table">
        <thead><tr><th>Product / Strain</th><th>Order Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
        <tbody>${items.map(i=>`<tr><td>${escapeHtml(i.product_name)}</td><td>${Number(i.quantity||0)}</td><td>${money(i.unit_price)}</td><td>${money(i.line_total)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    ${order.note?`<div class="order-detail-note"><strong>Order Notes</strong><p>${escapeHtml(order.note)}</p></div>`:''}
    <div class="order-detail-total"><span>Order Total</span><strong>${money(order.total)}</strong></div>`;
  $('#orderDetailModal').classList.remove('hidden');
  $('#orderDetailModal').setAttribute('aria-hidden','false');
  $('#drawerBackdrop').classList.remove('hidden');
}

function printPackingSlip(order=selectedOrderDetail){
  if(!order)return toast('Open an order first');
  const items=order.order_items||[];
  const rows=items.map(i=>`<tr><td>${escapeHtml(i.product_name)}</td><td>${Number(i.quantity||0)}</td><td class="packing-box"></td></tr>`).join('');
  const w=window.open('','_blank','width=900,height=800');
  if(!w)return toast('Allow pop-ups to print the packing slip');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Packing Slip ${escapeHtml(order.order_number)}</title>
  <style>
  body{font-family:Arial,sans-serif;color:#111;padding:35px;max-width:900px;margin:auto}
  .head{display:flex;justify-content:space-between;gap:30px;border-bottom:3px solid #111;padding-bottom:18px;margin-bottom:22px}
  .brand{font-size:27px;font-weight:900}.sub{color:#666;font-size:12px;margin-top:4px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:8px 30px;margin:20px 0}.info div{border-bottom:1px solid #ddd;padding:8px 0}
  table{width:100%;border-collapse:collapse;margin-top:22px}th,td{border:1px solid #bbb;padding:13px;text-align:left}th{background:#f1f1f1}
  th:nth-child(2),td:nth-child(2){width:110px;text-align:center}th:nth-child(3),td:nth-child(3){width:150px;text-align:center}
  .packing-box{height:34px}.notes{margin-top:20px;border:1px solid #ccc;padding:14px;min-height:55px}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:55px}.line{border-top:1px solid #111;padding-top:7px;font-size:12px}
  button{margin-top:25px;padding:10px 18px}@media print{button{display:none}body{padding:5px}}
  </style></head><body>
  <div class="head"><div><div class="brand">BAKED AFRICA</div><div class="sub">ORDER & PACKING SHEET</div></div><div><strong>${escapeHtml(order.order_number)}</strong><div class="sub">${new Date(order.created_at).toLocaleString('en-ZA')}</div></div></div>
  <div class="info"><div><strong>Customer:</strong> ${escapeHtml(order.customer_name||'')}</div><div><strong>Status:</strong> ${escapeHtml(order.status||'Pending')}</div><div><strong>Contact:</strong> ${escapeHtml(order.customer_phone||'')}</div><div><strong>Number of Packages:</strong> __________</div><div><strong>Complete Order:</strong> Yes ☐ &nbsp;&nbsp; No ☐</div><div><strong>Dispatch Date:</strong> __________</div></div>
  <table><thead><tr><th>Product / Strain</th><th>Order Qty</th><th>Packing Qty</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="notes"><strong>Order Notes:</strong><br>${escapeHtml(order.note||'')}</div>
  <div class="sign"><div class="line">Packed by / Signature</div><div class="line">Checked by / Signature</div></div>
  <button onclick="window.print()">Print Packing Slip</button>
  </body></html>`);
  w.document.close();w.focus();setTimeout(()=>w.print(),250);
}

async function updateAdminAlerts(){
  if(!accessToken)return;
  try{
    if(!adminOrdersCache.length){
      try{adminOrdersCache=await api('/rest/v1/orders?select=id,order_number,customer_name,status,total,created_at&order=created_at.desc&limit=100',{auth:true})||[]}catch{}
    }
    let alertProducts=products;
    if(!alertProducts?.length){
      try{alertProducts=await api('/rest/v1/products?select=id,name,stock,reorder_level,description,active&active=eq.true',{auth:true})||[]}catch{alertProducts=[]}
    }
    const pending=adminOrdersCache.filter(o=>String(o.status||'Pending')==='Pending');
    const rows=stockDashFlatten(alertProducts||[]);
    const out=rows.filter(r=>r.qty<=0);
    const low=rows.filter(r=>r.qty>0&&r.qty<=r.reorder);
    const total=pending.length+out.length+low.length;
    const badge=$('#adminAlertCount');
    if(badge){badge.textContent=total;badge.classList.toggle('hidden',total===0)}
    if($('#alertNewOrders'))$('#alertNewOrders').textContent=pending.length;
    if($('#alertLowStock'))$('#alertLowStock').textContent=low.length;
    if($('#alertOutStock'))$('#alertOutStock').textContent=out.length;
    const alerts=[];
    pending.slice(0,10).forEach(o=>alerts.push({type:'order',level:'order',title:`New order ${o.order_number}`,text:`${o.customer_name||'Customer'} · ${money(o.total||0)}`}));
    out.slice(0,15).forEach(r=>alerts.push({type:'stock',level:'out',title:'Out of stock',text:r.name}));
    low.slice(0,15).forEach(r=>alerts.push({type:'stock',level:'low',title:'Low stock',text:`${r.name} · ${r.qty} remaining`}));
    const list=$('#adminAlertsList');
    if(list)list.innerHTML=alerts.length?alerts.map(a=>`<article class="admin-alert-item ${a.level}"><span class="admin-alert-dot"></span><div><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.text)}</small></div></article>`).join(''):'<div class="alerts-clear"><strong>All clear</strong><span>No active order or stock alerts.</span></div>';
  }catch(e){console.warn('Could not update admin alerts',e)}
}

function openAdminAlerts(){
  updateAdminAlerts();
  $('#adminAlertsModal').classList.remove('hidden');
  $('#adminAlertsModal').setAttribute('aria-hidden','false');
  $('#drawerBackdrop').classList.remove('hidden');
}

async function setOrderStatus(id,status){ try{await api('/rest/v1/rpc/set_order_status',{method:'POST',auth:true,body:JSON.stringify({p_order_id:id,p_status:status})});toast('Order status updated');await Promise.all([loadOrders(),loadAdminProducts(),loadInventory(),loadProducts()]);}catch(err){toast(err.message);await loadOrders();} }
async function deleteOrder(id,number){
  if(!confirm(`Permanently delete order ${number}?\n\nThis cannot be undone and will not change current stock.`))return;
  try{await api('/rest/v1/rpc/delete_order_admin',{method:'POST',auth:true,body:JSON.stringify({p_order_id:id})});toast(`Order ${number} deleted`);await loadOrders();}catch(err){toast(err.message);}
}
async function deleteOldCompletedOrders(){
  const days=Number($('#oldOrderDays').value||30);
  if(!confirm(`Delete every Completed or Cancelled order older than ${days} days?\n\nThis cannot be undone.`))return;
  try{
    const before=new Date(Date.now()-days*86400000).toISOString();
    const rows=await api(`/rest/v1/orders?select=id,order_number&created_at=lt.${encodeURIComponent(before)}&status=in.(Completed,Cancelled)`,{auth:true});
    if(!rows.length)return toast('No matching old orders found');
    for(const row of rows)await api('/rest/v1/rpc/delete_order_admin',{method:'POST',auth:true,body:JSON.stringify({p_order_id:row.id})});
    toast(`${rows.length} old order${rows.length===1?'':'s'} deleted`);await loadOrders();
  }catch(err){toast(err.message);}
}
async function loadAdminUsers(){
  if(!$('#adminUsersList'))return;
  try{
    const rows=await api('/rest/v1/rpc/list_admin_users',{method:'POST',auth:true,body:'{}'});
    $('#adminUsersList').innerHTML=rows.length?rows.map(u=>`<article class="admin-row"><div class="admin-row-main"><span class="admin-icon">A</span><div><strong class="admin-email">${escapeHtml(u.email)}</strong><small>Admin since ${new Date(u.created_at).toLocaleDateString('en-ZA')}</small></div></div><button class="btn danger compact remove-admin" data-id="${u.user_id}" data-email="${escapeHtml(u.email)}">Remove</button></article>`).join(''):'<div class="empty-state"><p>No administrators found.</p></div>';
    $$('.remove-admin').forEach(b=>b.onclick=()=>removeAdmin(b.dataset.id,b.dataset.email));
  }catch(err){$('#adminUsersList').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
}
async function addAdmin(e){
  e.preventDefault();const email=$('#newAdminEmail').value.trim();$('#adminUsersMessage').textContent='Adding…';
  try{await api('/rest/v1/rpc/add_admin_by_email',{method:'POST',auth:true,body:JSON.stringify({p_email:email})});$('#newAdminEmail').value='';$('#adminUsersMessage').textContent='Admin access added.';toast(`${email} is now an admin`);await loadAdminUsers();}catch(err){$('#adminUsersMessage').textContent=err.message;}
}
async function removeAdmin(id,email){
  if(!confirm(`Remove admin access for ${email}?`))return;
  try{await api('/rest/v1/rpc/remove_admin_user',{method:'POST',auth:true,body:JSON.stringify({p_user_id:id})});toast('Admin access removed');await loadAdminUsers();}catch(err){toast(err.message);}
}



let fastStockProducts=[];
function renderFastStock(){
  const box=$('#fastStockList');if(!box)return;
  const q=($('#fastStockSearch')?.value||'').trim().toLowerCase();
  const groups=[];
  fastStockProducts.forEach(p=>{
    const strains=parseStrainList(p.description);
    if(!strains.length)return;
    const visible=strains.map((s,i)=>({s,i})).filter(x=>{
      const size=x.s.weightGrams?`${x.s.weightGrams}g`:'';
      return !q||`${p.name} ${p.sku||''} ${x.s.name} ${size}`.toLowerCase().includes(q);
    });
    if(!visible.length)return;
    groups.push(`<div class="fast-stock-group">
      <div class="fast-stock-title">
        <div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.sku||'')}</small></div>
        <span class="quick-stock-product-total">${strains.reduce((a,s)=>a+Number(s.qty||0),0)} total</span>
      </div>
      ${visible.map(({s,i})=>{
        const size=s.weightGrams?`<b class="quick-size-badge">${s.weightGrams}G</b>`:'';
        return `<div class="fast-stock-row quick-stock-row">
          <div class="quick-stock-name"><span>${escapeHtml(s.name)}</span>${size}</div>
          <div class="quick-stock-controls">
            <small>Current <b>${s.qty}</b></small>
            <span class="quick-plus">+</span>
            <input class="fast-stock-input quick-stock-add" data-product="${p.id}" data-index="${i}" data-current="${s.qty}" type="number" min="0" step="1" value="" placeholder="0" inputmode="numeric" aria-label="Add stock">
            <small class="quick-new-total">New <b>${s.qty}</b></small>
          </div>
        </div>`;
      }).join('')}
    </div>`);
  });
  box.innerHTML=groups.length?groups.join(''):'<div class="empty-state"><p>No strain stock found.</p></div>';

  $$('.quick-stock-add').forEach(input=>{
    input.oninput=()=>{
      const current=Number(input.dataset.current||0);
      const add=Math.max(0,Number(input.value||0));
      const row=input.closest('.quick-stock-row');
      const total=row?.querySelector('.quick-new-total b');
      if(total)total.textContent=current+add;
      input.classList.toggle('has-change',add>0);
    };
  });
}
async function loadFastStock(){
  try{
    fastStockProducts=await api('/rest/v1/products?select=id,sku,name,category,description&order=name.asc',{auth:true});
    renderFastStock();
  }catch(err){const b=$('#fastStockList');if(b)b.innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
}
async function saveFastStock(){
  const inputs=$$('.quick-stock-add');
  const byProduct=new Map();

  inputs.forEach(input=>{
    const add=Number(input.value||0);
    if(!Number.isInteger(add)||add<=0)return;
    const p=fastStockProducts.find(x=>String(x.id)===String(input.dataset.product));if(!p)return;
    const strains=parseStrainList(p.description);
    const i=Number(input.dataset.index);
    if(!strains[i])return;
    strains[i].qty=Number(strains[i].qty||0)+add;
    byProduct.set(String(p.id),{p,strains});
  });

  if(!byProduct.size){toast('Enter stock to add first');return;}
  const btn=$('#saveFastStockButton'),msg=$('#fastStockMessage');
  btn.disabled=true;
  msg.textContent=`Adding stock to ${byProduct.size} product${byProduct.size===1?'':'s'}…`;
  let saved=0;
  try{
    for(const {p,strains} of byProduct.values()){
      const normal=splitProductDescription(p.description).description;
      // Preserve Flower gram-size variants exactly.
      const strainText=strains.map(s=>s.weightGrams?`${s.name}=${s.qty}X${s.weightGrams}G`:`${s.name} = ${s.qty}`).join('\n');
      const description=composeProductDescription(normal,strainText);
      await api(`/rest/v1/products?id=eq.${encodeURIComponent(p.id)}`,{
        method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},
        body:JSON.stringify({description,updated_at:new Date().toISOString()})
      });
      saved++;
    }
    toast('Stock added');
    msg.textContent=`Stock added successfully to ${saved} product${saved===1?'':'s'}.`;
    await Promise.all([loadFastStock(),loadAdminProducts(),loadInventory(),loadProducts()]);
    if(typeof updateAdminAlerts==='function')updateAdminAlerts();
  }catch(err){
    msg.textContent=`Saved ${saved} before an error: ${err.message}`;
    toast('Some stock could not be added');
  }finally{btn.disabled=false;}
}

let stockCsvChanges = [];

function csvEscape(v){
  v=String(v??'');
  return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
}
function normalizeCsvKey(v){
  return String(v??'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9()]+/g,' ').trim();
}
function normalizePackSize(v){
  const m=String(v??'').trim().toUpperCase().match(/^(1|2|3|5)\s*G?$/);
  return m?Number(m[1]):null;
}
function csvBool(v, fallback=false){
  const x=String(v??'').trim().toLowerCase();
  if(!x)return fallback;
  return ['1','true','yes','y','on','active'].includes(x);
}
function normalizeCsvAction(v){
  const x=String(v??'').trim().toUpperCase().replace(/[^A-Z]/g,'');
  if(['ADD','NEW','CREATE','ADDPRODUCT','ADDSTRAIN'].includes(x))return 'ADD';
  return 'UPDATE';
}
async function downloadStockCsvTemplate(){
  try{
    const rows=await api('/rest/v1/products?select=sku,name,category,group_name,strength,price,description,image_url,stock,reorder_level,active,featured&order=group_name.asc,name.asc',{auth:true});
    const data=[['Action','SKU','Product Name','Category','Range','Strain','Pack Size','Strength','Price','Description','Image URL','New Stock Quantity','Active','Featured','Reorder Level']];
    rows.forEach(p=>{
      const strains=parseStrainList(p.description), normal=splitProductDescription(p.description).description;
      if(strains.length){
        strains.forEach(s=>data.push(['UPDATE',p.sku||'',p.name||'',p.category||'',p.group_name||'',s.name||'',s.weightGrams?`${s.weightGrams}G`:'',p.strength||'',Number(p.price||0),normal,p.image_url||'',Number(s.qty||0),p.active!==false?'TRUE':'FALSE',p.featured?'TRUE':'FALSE',Number(p.reorder_level||0)]));
      }else{
        data.push(['UPDATE',p.sku||'',p.name||'',p.category||'',p.group_name||'','','',p.strength||'',Number(p.price||0),normal,p.image_url||'',Number(p.stock||0),p.active!==false?'TRUE':'FALSE',p.featured?'TRUE':'FALSE',Number(p.reorder_level||0)]);
      }
    });
    // Blank ADD row makes the required format obvious without creating anything.
    data.push(['ADD','','','','','','','','','','','0','TRUE','FALSE','0']);
    const csv='\ufeff'+data.map(r=>r.map(csvEscape).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BAKED-PRODUCTS-AND-STOCK-MASTER.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch(err){toast(err.message);}
}
function parseCsv(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  // Excel in some regional settings exports semicolon-delimited CSVs. Detect either format.
  const firstLine=(text.split(/\r?\n/,1)[0]||'');
  const delimiter=(firstLine.split(';').length>firstLine.split(',').length)?';':',';
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(ch===delimiter&&!quoted){row.push(cell.trim());cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);return rows;
}
async function previewStockCsv(){
  const file=$('#stockCsvFile')?.files?.[0];if(!file){toast('Choose a CSV file first');return;}
  const msg=$('#stockCsvMessage'),box=$('#stockCsvPreview'),btn=$('#applyStockCsvButton');
  msg.textContent='Checking CSV…';box.innerHTML='';btn.disabled=true;stockCsvChanges=[];
  try{
    const rows=parseCsv(await file.text());if(rows.length<2)throw new Error('CSV has no product or stock rows.');
    const h=rows[0].map(x=>String(x||'').replace(/^\uFEFF/,'').toLowerCase().replace(/[^a-z0-9]/g,''));
    const ix=(...names)=>h.findIndex(x=>names.includes(x));
    const actionI=ix('action'),skuI=ix('sku'),nameI=ix('productname','product','name'),categoryI=ix('category'),groupI=ix('range','group','groupname'),strainI=ix('strain','strainname'),sizeI=ix('packsize','size','grams','gramsize'),strengthI=ix('strength'),priceI=ix('price'),descI=ix('description','productdescription'),imageI=ix('imageurl','image'),stockI=ix('newstockquantity','stockquantity','stock','quantity','qty'),activeI=ix('active'),featuredI=ix('featured'),reorderI=ix('reorderlevel','reorder');
    if(skuI<0||nameI<0||stockI<0)throw new Error('CSV needs SKU, Product Name and New Stock Quantity columns.');

    const products=await api('/rest/v1/products?select=id,sku,name,category,group_name,strength,price,description,image_url,stock,reorder_level,active,featured&order=name.asc',{auth:true});
    const bySku=new Map(products.filter(p=>p.sku).map(p=>[String(p.sku).trim().toLowerCase(),p]));
    const working=new Map();
    const preview=[];
    const newProducts=new Map();

    for(const r of rows.slice(1)){
      const action=normalizeCsvAction(actionI>=0?r[actionI]:'UPDATE');
      const sku=String(r[skuI]||'').trim(),csvName=String(r[nameI]||'').trim(),strain=String(strainI>=0?r[strainI]||'':'').trim(),sizeRaw=String(sizeI>=0?r[sizeI]||'':'').trim(),raw=String(r[stockI]||'').trim();
      if(!sku&&!csvName&&!strain&&!raw)continue;
      const target=Number(raw), p=sku?bySku.get(sku.toLowerCase()):null;
      if(!sku||!csvName||!Number.isInteger(target)||target<0){preview.push({sku,name:csvName,item:strain||'Product',current:'—',target:raw,status:'Invalid row'});continue;}

      if(!p){
        if(action!=='ADD'){preview.push({sku,name:csvName,item:strain||'Product',current:'—',target,status:'Product not found — use ADD'});continue;}
        if(!newProducts.has(sku.toLowerCase())){
          const category=String(categoryI>=0?r[categoryI]||'':'').trim();
          const price=Number(priceI>=0?r[priceI]||'':NaN);
          if(!category||!Number.isFinite(price)||price<0){preview.push({sku,name:csvName,item:strain||'Product',current:'—',target,status:'ADD needs Category and Price'});continue;}
          newProducts.set(sku.toLowerCase(),{
            sku,name:csvName,category,
            group_name:String(groupI>=0?r[groupI]||'':'').trim(),
            strength:String(strengthI>=0?r[strengthI]||'':'').trim(),
            price, description:String(descI>=0?r[descI]||'':'').trim(), image_url:String(imageI>=0?r[imageI]||'':'').trim()||null,
            reorder_level:Number(reorderI>=0&&String(r[reorderI]||'').trim()!==''?r[reorderI]:0)||0,
            active:csvBool(activeI>=0?r[activeI]:'TRUE',true), featured:csvBool(featuredI>=0?r[featuredI]:'FALSE',false),
            stock:0,strains:[]
          });
        }
        const np=newProducts.get(sku.toLowerCase());
        if(normalizeCsvKey(np.name)!==normalizeCsvKey(csvName)){preview.push({sku,name:csvName,item:strain||'Product',current:'—',target,status:'Same new SKU has different product name'});continue;}
        if(strain){
          const pack=normalizePackSize(sizeRaw);
          if(sizeRaw&&pack===null){preview.push({sku,name:csvName,item:`${strain} ${sizeRaw}`,current:'—',target,status:'Invalid pack size'});continue;}
          if(np.strains.some(s=>normalizeCsvKey(s.name)===normalizeCsvKey(strain)&&Number(s.weightGrams||0)===Number(pack||0))){preview.push({sku,name:csvName,item:strain,current:'—',target,status:'Duplicate ADD row'});continue;}
          np.strains.push({name:strain,qty:target,weightGrams:pack,backendName:pack?`${strain} [${pack}G]`:strain});
          preview.push({sku,name:csvName,item:`${strain}${pack?` ${pack}G`:''}`,current:'NEW',target,status:'Add new product / strain'});
        }else{
          np.stock=target;
          preview.push({sku,name:csvName,item:'Product stock',current:'NEW',target,status:'Add new product'});
        }
        continue;
      }

      if(normalizeCsvKey(csvName)!==normalizeCsvKey(p.name)){preview.push({sku,name:csvName,item:strain||'Product',current:'—',target,status:'Product name does not match SKU'});continue;}
      if(!working.has(String(p.id)))working.set(String(p.id),{p,strains:parseStrainList(p.description).map(s=>({...s})),normal:splitProductDescription(p.description).description,productTarget:null,changed:false});
      const w=working.get(String(p.id));

      if(strain){
        const pack=normalizePackSize(sizeRaw), wanted=normalizeCsvKey(strain);
        if(sizeRaw&&pack===null){preview.push({sku,name:p.name,item:`${strain} ${sizeRaw}`,current:'—',target,status:'Invalid pack size'});continue;}
        const matches=w.strains.map((s,i)=>({s,i})).filter(x=>normalizeCsvKey(x.s.name)===wanted && (pack===null ? x.s.weightGrams===null : Number(x.s.weightGrams)===pack));
        if(matches.length===1){
          const {s,i}=matches[0],current=Number(s.qty||0);
          preview.push({sku,name:p.name,item:`${s.name}${s.weightGrams?` ${s.weightGrams}G`:''}`,current,target,status:current===target?'No change':'Update'});
          if(current!==target){w.strains[i].qty=target;w.changed=true;}
        }else if(matches.length===0&&action==='ADD'){
          w.strains.push({name:strain,qty:target,weightGrams:pack,backendName:pack?`${strain} [${pack}G]`:strain});w.changed=true;
          preview.push({sku,name:p.name,item:`${strain}${pack?` ${pack}G`:''}`,current:'NEW',target,status:'Add strain'});
        }else{
          preview.push({sku,name:p.name,item:`${strain}${sizeRaw?` ${sizeRaw}`:''}`,current:'—',target,status:matches.length?'Duplicate strain match':'Strain / pack size not found — use ADD'});
        }
      }else if(w.strains.length){
        preview.push({sku,name:p.name,item:'—',current:'—',target,status:'Strain required for this product'});
      }else{
        const current=Number(p.stock||0);
        preview.push({sku,name:p.name,item:'Product stock',current,target,status:current===target?'No change':'Update'});
        if(current!==target){w.productTarget=target;w.changed=true;}
      }
    }

    for(const w of working.values()){
      if(!w.changed)continue;
      if(w.strains.length){
        const strainText=w.strains.map(s=>s.weightGrams?`${s.name}=${s.qty}X${s.weightGrams}G`:`${s.name} = ${s.qty}`).join('\n');
        const description=composeProductDescription(w.normal,strainText), totalStock=w.strains.reduce((a,s)=>a+Number(s.qty||0),0);
        stockCsvChanges.push({type:'update',id:w.p.id,sku:w.p.sku,name:w.p.name,description,targetStock:totalStock,currentStock:Number(w.p.stock||0),kind:'strains'});
      }else if(w.productTarget!==null){
        stockCsvChanges.push({type:'update',id:w.p.id,sku:w.p.sku,name:w.p.name,targetStock:w.productTarget,currentStock:Number(w.p.stock||0),kind:'product'});
      }
    }
    for(const np of newProducts.values()){
      if(np.strains.length){
        const strainText=np.strains.map(s=>s.weightGrams?`${s.name}=${s.qty}X${s.weightGrams}G`:`${s.name} = ${s.qty}`).join('\n');
        np.description=composeProductDescription(np.description,strainText);
        np.stock=np.strains.reduce((a,s)=>a+Number(s.qty||0),0);
      }
      stockCsvChanges.push({type:'add',payload:np,sku:np.sku,name:np.name});
    }

    box.innerHTML=preview.length?`<div class="csv-table"><div class="csv-head"><span>SKU</span><span>Product / Strain</span><span>Current</span><span>New</span><span>Action</span></div>${preview.map(x=>`<div class="csv-line"><span>${escapeHtml(x.sku)}</span><span>${escapeHtml(`${x.name}${x.item?` — ${x.item}`:''}`)}</span><span>${escapeHtml(x.current)}</span><span>${escapeHtml(x.target)}</span><span>${escapeHtml(x.status)}</span></div>`).join('')}</div>`:'<div class="empty-state"><p>No rows found.</p></div>';
    const updates=stockCsvChanges.filter(x=>x.type==='update').length, adds=stockCsvChanges.filter(x=>x.type==='add').length;
    msg.textContent=stockCsvChanges.length?`${updates} existing product${updates===1?'':'s'} to update · ${adds} new product${adds===1?'':'s'} to add.`:'No changes found.';
    btn.disabled=!stockCsvChanges.length;
  }catch(err){msg.textContent=err.message;box.innerHTML='';btn.disabled=true;stockCsvChanges=[];}
}
async function applyStockCsv(){
  if(!stockCsvChanges.length)return;
  const btn=$('#applyStockCsvButton'),msg=$('#stockCsvMessage');btn.disabled=true;msg.textContent=`Applying ${stockCsvChanges.length} CSV change${stockCsvChanges.length===1?'':'s'}…`;let done=0;
  try{
    for(const c of stockCsvChanges){
      if(c.type==='add'){
        const p=c.payload;
        await api('/rest/v1/products',{method:'POST',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify({sku:p.sku,name:p.name,category:p.category,group_name:p.group_name,strength:p.strength,price:p.price,stock:p.stock,reorder_level:p.reorder_level,image_url:p.image_url,description:p.description,active:p.active,featured:p.featured,updated_at:new Date().toISOString()})});
      }else{
        if(c.kind==='strains')await api(`/rest/v1/products?id=eq.${encodeURIComponent(c.id)}`,{method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify({description:c.description,updated_at:new Date().toISOString()})});
        const diff=Number(c.targetStock)-Number(c.currentStock);
        if(diff!==0)await api('/rest/v1/rpc/adjust_stock',{method:'POST',auth:true,body:JSON.stringify({p_product_id:c.id,p_quantity:diff,p_reference:'CSV Products & Stock Upload'})});
      }
      done++;
    }
    toast(`${done} CSV change${done===1?'':'s'} applied`);
    msg.textContent=`Done: ${done} change${done===1?'':'s'} applied. Live menu refreshed.`;
    stockCsvChanges=[];$('#stockCsvPreview').innerHTML='';$('#stockCsvFile').value='';
    await Promise.all([loadFastStock(),loadAdminProducts(),loadInventory(),loadProducts()]);
    if(typeof updateAdminAlerts==='function')updateAdminAlerts();
  }catch(err){msg.textContent=`Completed ${done} change${done===1?'':'s'} before an error: ${err.message}`;toast('CSV import stopped because of an error');}
  finally{btn.disabled=!stockCsvChanges.length;}
}

async function loadInventory(){
  try{ const rows=await api('/rest/v1/stock_movements?select=*,products(name)&order=created_at.desc&limit=100',{auth:true}); $('#stockHistory').innerHTML=rows.length?rows.map(r=>`<article class="admin-row"><div class="admin-row-main"><span class="movement ${r.quantity>=0?'positive':'negative'}">${r.quantity>=0?'+':''}${r.quantity}</span><div><strong>${escapeHtml(r.products?.name||'Product')}</strong><small>${escapeHtml(r.movement_type)} · ${escapeHtml(r.reference||'No reference')}</small></div></div><time>${new Date(r.created_at).toLocaleString('en-ZA')}</time></article>`).join(''):'<div class="empty-state"><h3>No stock history yet</h3></div>'; }catch(err){$('#stockHistory').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
}

function timeToMinutes(value='00:00'){const [h,m]=String(value).slice(0,5).split(':').map(Number);return (h||0)*60+(m||0)}
function orderingAllowed(){
  if(!siteSettings.store_open)return false;
  if(!siteSettings.auto_hours)return true;
  const now=new Date(), current=now.getHours()*60+now.getMinutes(), open=timeToMinutes(siteSettings.opening_time), close=timeToMinutes(siteSettings.closing_time);
  return open<=close ? current>=open&&current<close : current>=open||current<close;
}
async function loadSiteSettings(forAdmin=false){
  try{const rows=await api('/rest/v1/site_settings?select=*&id=eq.1');if(rows?.[0])siteSettings=rows[0];}catch(e){console.warn('Settings unavailable',e)}
  applySiteSettings();
  if(forAdmin){$('#settingStoreOpen').checked=!!siteSettings.store_open;$('#settingAutoHours').checked=!!siteSettings.auto_hours;$('#settingOpeningTime').value=String(siteSettings.opening_time||'09:00').slice(0,5);$('#settingClosingTime').value=String(siteSettings.closing_time||'18:00').slice(0,5);$('#settingBannerText').value=siteSettings.banner_text||'';}
}
function applySiteSettings(){
  const banner=$('#storeBanner'), closed=$('#storeClosedNotice');
  if(siteSettings.banner_text){banner.textContent=siteSettings.banner_text;banner.classList.remove('hidden')}else banner.classList.add('hidden');
  closed.classList.toggle('hidden',orderingAllowed());
  const place=$('#placeOrderButton');if(place){place.disabled=!orderingAllowed();place.textContent=orderingAllowed()?'Place order':'Store closed';}
}
async function saveSiteSettings(e){
  e.preventDefault(); const payload={store_open:$('#settingStoreOpen').checked,auto_hours:$('#settingAutoHours').checked,opening_time:$('#settingOpeningTime').value||'09:00',closing_time:$('#settingClosingTime').value||'18:00',banner_text:$('#settingBannerText').value.trim(),updated_at:new Date().toISOString()};
  $('#settingsStatus').textContent='Saving…';
  try{await api('/rest/v1/site_settings?id=eq.1',{method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});siteSettings={...siteSettings,...payload};applySiteSettings();renderProducts();renderFeaturedProducts();$('#settingsStatus').textContent='Saved';toast('Store settings saved')}catch(err){$('#settingsStatus').textContent=err.message}
}
function renderFeaturedProducts(){
  const section=$('#featuredSection'),grid=$('#featuredGrid'); if(!section||!grid)return;
  const featured=products.filter(p=>p.featured&&p.active);
  section.classList.toggle('hidden',featured.length===0);
  grid.innerHTML=featured.map(p=>{const [state,label]=stockState(p),img=p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">`:`<div class="placeholder">${initials(p.name)}</div>`;return `<article class="product-card featured-card"><div class="product-image">${img}<span class="badge ${state}">${label}</span></div><div class="product-body"><p class="eyebrow accent">FEATURED</p><h3>${escapeHtml(p.name)}</h3><div class="product-footer"><div><strong>${money(p.price)}</strong><small>${p.stock} available</small></div><div class="product-order-controls"><input class="product-quantity featured-quantity" data-id="${p.id}" type="number" min="1" max="${p.stock}" value="1" ${p.stock<=0||!orderingAllowed()?'disabled':''}><button class="btn primary featured-add" data-id="${p.id}" ${p.stock<=0||!orderingAllowed()?'disabled':''}>${orderingAllowed()?'Add':'Closed'}</button></div></div></div></article>`}).join('');
  $$('.featured-add').forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===String(b.dataset.id));if(p&&parseStrainList(p.description).length)return openStrainModal(p.id);addToCart(b.dataset.id,Number(document.querySelector(`.featured-quantity[data-id="${b.dataset.id}"]`)?.value||1));});
}
async function toggleFeatured(id,current){try{await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify({featured:!current,updated_at:new Date().toISOString()})});toast(!current?'Product featured':'Product unfeatured');await Promise.all([loadAdminProducts(),loadProducts()])}catch(err){toast(err.message)}}
function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=900,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78))};img.src=reader.result};reader.readAsDataURL(file)})}



let stockDashboardRows=[];
let stockDashboardMovements=[];
function stockDashParseStrains(product){
  const d=String(product.description||'');if(!d.includes('[[STRAINS]]'))return [];
  return d.split('[[STRAINS]]')[1].split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const i=line.lastIndexOf('=');if(i<1)return null;const name=line.slice(0,i).trim(),qty=Number(line.slice(i+1).trim());return Number.isFinite(qty)?{name,qty}:null}).filter(Boolean);
}
function stockDashFlatten(products){
  const rows=[];(products||[]).forEach(p=>{const strains=stockDashParseStrains(p);if(strains.length){strains.forEach(s=>rows.push({productId:p.id,product:p.name,name:`${p.name} — ${s.name}`,strain:s.name,qty:s.qty,price:Number(p.price||0),reorder:Number(p.reorder_level||5),isStrain:true}))}else rows.push({productId:p.id,product:p.name,name:p.name,strain:'',qty:Number(p.stock||0),price:Number(p.price||0),reorder:Number(p.reorder_level||5),isStrain:false})});return rows;
}
function stockDashStatus(r){return r.qty<=0?'out':r.qty<=r.reorder?'low':'ok'}
function stockDashStatusLabel(r){const s=stockDashStatus(r);return s==='out'?'OUT OF STOCK':s==='low'?'LOW STOCK':'IN STOCK'}
async function loadStockDashboard(){
 const msg=$('#stockDashboardMessage');if(msg)msg.textContent='Loading stock…';
 try{
  const [products,movements]=await Promise.all([api('/rest/v1/products?select=id,name,price,stock,reorder_level,description,active&active=eq.true&order=name.asc',{auth:true}),api('/rest/v1/stock_movements?select=id,product_id,movement_type,quantity,reference,created_at,products(name)&order=created_at.desc&limit=100',{auth:true})]);
  stockDashboardRows=stockDashFlatten(products);stockDashboardMovements=movements||[];renderStockDashboard();if(msg)msg.textContent='';
 }catch(err){if(msg)msg.textContent=err.message;$('#stockDashboardBody').innerHTML=`<tr><td colspan="7">${escapeHtml(err.message)}</td></tr>`}
}
function renderStockDashboard(){
 const q=($('#sdSearch')?.value||'').trim().toLowerCase(),filter=$('#sdStatus')?.value||'all';
 const rows=stockDashboardRows.filter(r=>(!q||r.name.toLowerCase().includes(q))&&(filter==='all'||stockDashStatus(r)===filter));
 $('#sdTotalUnits').textContent=stockDashboardRows.reduce((s,r)=>s+r.qty,0);
 $('#sdLowStock').textContent=stockDashboardRows.filter(r=>stockDashStatus(r)==='low').length;
 $('#sdOutStock').textContent=stockDashboardRows.filter(r=>stockDashStatus(r)==='out').length;
 $('#sdStockValue').textContent=money(stockDashboardRows.reduce((s,r)=>s+r.qty*r.price,0));
 $('#stockDashboardBody').innerHTML=rows.length?rows.map((r,i)=>`<tr data-sd-index="${stockDashboardRows.indexOf(r)}"><td><strong>${escapeHtml(r.name)}</strong>${r.isStrain?'<small class="sd-sub">Strain stock</small>':''}</td><td>${money(r.price)}</td><td><strong>${r.qty}</strong></td><td><span class="sd-badge ${stockDashStatus(r)}">${stockDashStatusLabel(r)}</span></td><td><input class="sd-count" type="number" min="0" placeholder="Count" data-sd-count="${stockDashboardRows.indexOf(r)}"></td><td><strong class="sd-diff" data-sd-diff="${stockDashboardRows.indexOf(r)}">—</strong></td><td><button class="btn ghost sd-apply" type="button" data-sd-apply="${stockDashboardRows.indexOf(r)}">Apply count</button></td></tr>`).join(''):'<tr><td colspan="7">No stock matches this filter.</td></tr>';
 $$('.sd-count').forEach(el=>el.oninput=()=>{const r=stockDashboardRows[Number(el.dataset.sdCount)],v=el.value===''?null:Number(el.value),d=$(`[data-sd-diff="${el.dataset.sdCount}"]`);d.textContent=v===null?'—':`${v-r.qty>=0?'+':''}${v-r.qty}`});
 $$('.sd-apply').forEach(b=>b.onclick=()=>applyPhysicalCount(Number(b.dataset.sdApply)));
 $('#stockDashboardHistory').innerHTML=stockDashboardMovements.length?stockDashboardMovements.slice(0,30).map(m=>`<article class="sales-recent-row"><div><strong>${escapeHtml(m.products?.name||'Product')}</strong><small>${new Date(m.created_at).toLocaleString('en-ZA')} · ${escapeHtml(m.movement_type||'ADJUSTMENT')}</small></div><div><strong>${Number(m.quantity)>=0?'+':''}${Number(m.quantity||0)}</strong><small>${escapeHtml(m.reference||'No reference')}</small></div></article>`).join(''):'<div class="empty-state"><h3>No stock movements yet</h3></div>';
}
async function applyPhysicalCount(i){
 const r=stockDashboardRows[i],input=$(`[data-sd-count="${i}"]`);if(!r||!input||input.value==='')return toast('Enter the physical count first');const count=Number(input.value);if(!Number.isInteger(count)||count<0)return toast('Enter a valid whole-number count');
 if(!confirm(`Set ${r.name} stock from ${r.qty} to ${count}?`))return;
 const msg=$('#stockDashboardMessage');msg.textContent='Applying stock count…';
 try{
  if(r.isStrain){await api('/rest/v1/rpc/stocktake_strain_admin',{method:'POST',auth:true,body:{p_product_id:r.productId,p_strain:r.strain,p_count:count,p_reference:'Physical Stock Count'}})}
  else{const diff=count-r.qty;if(diff!==0)await adjustStockDirect(r.productId,diff,'Physical Stock Count')}
  toast('Stock count applied');await Promise.all([loadStockDashboard(),loadInventory(),loadProducts()]);
 }catch(err){msg.textContent=err.message;toast('Stock count failed')}
}
function exportStockDashboardCsv(){
 const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`,lines=[['Product / Strain','Price','System Stock','Reorder Level','Status','Retail Stock Value'].map(esc).join(',')];stockDashboardRows.forEach(r=>lines.push([r.name,r.price.toFixed(2),r.qty,r.reorder,stockDashStatusLabel(r),(r.qty*r.price).toFixed(2)].map(esc).join(',')));const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`baked-stock-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

let salesOrdersCache=[];
let salesRowsCache=[];

function salesPeriodStart(period){
  const now=new Date();
  if(period==='all')return null;
  if(period==='today'){
    const d=new Date(now);d.setHours(0,0,0,0);return d;
  }
  const days=Math.max(1,Number(period)||7);
  return new Date(now.getTime()-(days*24*60*60*1000));
}
function salesOrderIncluded(order){
  const status=$('#salesStatus')?.value||'active';
  if(status==='active')return String(order.status||'Pending').toLowerCase()!=='cancelled';
  return String(order.status||'Pending')===status;
}
function salesTextMatch(value){
  const q=($('#salesSearch')?.value||'').trim().toLowerCase();
  return !q||String(value||'').toLowerCase().includes(q);
}
function buildSalesRows(orders){
  const map=new Map();
  orders.forEach(order=>{
    (order.order_items||[]).forEach(item=>{
      const name=String(item.product_name||'Product').trim();
      if(!salesTextMatch(name))return;
      const key=name.toLowerCase();
      const qty=Number(item.quantity||0);
      const value=Number(item.line_total||0);
      if(!map.has(key))map.set(key,{name,qty:0,value:0,orders:new Set()});
      const row=map.get(key);row.qty+=qty;row.value+=value;row.orders.add(order.id);
    });
  });
  return [...map.values()].map(r=>({...r,orderCount:r.orders.size})).sort((a,b)=>b.qty-a.qty||b.value-a.value);
}
async function loadSales(){
  const msg=$('#salesMessage');if(msg)msg.textContent='Loading sales…';
  try{
    const period=$('#salesPeriod')?.value||'7';
    const start=salesPeriodStart(period);
    let path='/rest/v1/orders?select=id,order_number,customer_name,status,total,created_at,order_items(id,product_name,quantity,unit_price,line_total)&order=created_at.desc&limit=1000';
    if(start)path+=`&created_at=gte.${encodeURIComponent(start.toISOString())}`;
    const orders=await api(path,{auth:true});
    salesOrdersCache=(orders||[]).filter(salesOrderIncluded);
    salesRowsCache=buildSalesRows(salesOrdersCache);
    renderSalesDashboard();
    if(msg)msg.textContent='';
  }catch(err){
    if(msg)msg.textContent=err.message;
    $('#salesProductsBody').innerHTML=`<tr><td colspan="4">${escapeHtml(err.message)}</td></tr>`;
  }
}
function renderSalesDashboard(){
  const rows=salesRowsCache;
  const visibleOrders=salesOrdersCache.filter(order=>{
    if(!salesTextMatch(order.order_number)&&!salesTextMatch(order.customer_name)){
      return (order.order_items||[]).some(i=>salesTextMatch(i.product_name));
    }
    return true;
  });
  const revenue=visibleOrders.reduce((sum,o)=>sum+Number(o.total||0),0);
  const units=rows.reduce((sum,r)=>sum+r.qty,0);
  const top=rows[0];
  $('#salesRevenue').textContent=money(revenue);
  $('#salesOrderCount').textContent=visibleOrders.length;
  $('#salesUnits').textContent=units;
  $('#salesTopProduct').textContent=top?top.name:'—';
  $('#salesTopProductQty').textContent=top?`${top.qty} unit${top.qty===1?'':'s'} sold`:'No sales yet';
  $('#salesProductsBody').innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${escapeHtml(r.name)}</strong></td><td>${r.qty}</td><td>${money(r.value)}</td><td>${r.orderCount}</td></tr>`).join(''):'<tr><td colspan="4">No matching sales in this period.</td></tr>';
  $('#salesRecent').innerHTML=visibleOrders.length?visibleOrders.slice(0,20).map(o=>{
    const units=(o.order_items||[]).reduce((s,i)=>s+Number(i.quantity||0),0);
    return `<article class="sales-recent-row"><div><strong>${escapeHtml(o.order_number)}</strong><small>${new Date(o.created_at).toLocaleString('en-ZA')} · ${escapeHtml(o.customer_name||'Customer')}</small></div><div><span class="sales-status">${escapeHtml(o.status||'Pending')}</span><strong>${units} unit${units===1?'':'s'} · ${money(o.total)}</strong></div></article>`;
  }).join(''):'<div class="empty-state"><h3>No sales yet</h3><p>Orders in the selected period will appear here.</p></div>';
}
function exportSalesCsv(){
  if(!salesRowsCache.length)return toast('No sales to export');
  const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const lines=[['Product / Strain','Quantity Sold','Sales Value','Orders'].map(esc).join(',')];
  salesRowsCache.forEach(r=>lines.push([r.name,r.qty,r.value.toFixed(2),r.orderCount].map(esc).join(',')));
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`baked-sales-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function switchAdminTab(tab){ $$('.admin-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $$('.admin-tab-panel').forEach(p=>p.classList.add('hidden')); $(`#${tab}Tab`).classList.remove('hidden'); if(tab==='suggestions')loadSuggestions(); if(tab==='sales')loadSales(); if(tab==='stockdashboard')loadStockDashboard(); }

function luhnValidSouthAfricanId(idNumber){
  if(!/^\d{13}$/.test(idNumber)) return false;
  let oddSum=0;
  for(let i=0;i<12;i+=2) oddSum+=Number(idNumber[i]);
  const evenNumber=Number(idNumber.slice(1,12).split('').filter((_,i)=>i%2===0).join(''))*2;
  const evenSum=String(evenNumber).split('').reduce((sum,d)=>sum+Number(d),0);
  const check=(10-((oddSum+evenSum)%10))%10;
  return check===Number(idNumber[12]);
}
function birthDateFromSouthAfricanId(idNumber){
  const yy=Number(idNumber.slice(0,2));
  const mm=Number(idNumber.slice(2,4));
  const dd=Number(idNumber.slice(4,6));
  const today=new Date();
  const currentYY=today.getFullYear()%100;
  const year=yy<=currentYY?2000+yy:1900+yy;
  const birthDate=new Date(year,mm-1,dd);
  if(birthDate.getFullYear()!==year||birthDate.getMonth()!==mm-1||birthDate.getDate()!==dd||birthDate>today) return null;
  return birthDate;
}
function ageOnDate(birthDate,today=new Date()){
  let age=today.getFullYear()-birthDate.getFullYear();
  const beforeBirthday=today.getMonth()<birthDate.getMonth()||(today.getMonth()===birthDate.getMonth()&&today.getDate()<birthDate.getDate());
  if(beforeBirthday) age--;
  return age;
}
function verifyCustomerAge(event){
  event.preventDefault();
  const input=$('#customerIdNumber');
  const message=$('#ageCheckMessage');
  const idNumber=input.value.replace(/\s+/g,'');
  input.value=idNumber;
  message.textContent='';
  if(!/^\d{13}$/.test(idNumber)){
    message.textContent='Please enter a valid 13-digit South African ID number.';
    input.focus();
    return;
  }
  const birthDate=birthDateFromSouthAfricanId(idNumber);
  if(!birthDate||!luhnValidSouthAfricanId(idNumber)){
    message.textContent='This ID number is not valid. Please check it and try again.';
    input.focus();
    return;
  }
  if(ageOnDate(birthDate)<18){
    message.textContent='Access denied. You must be 18 or older to enter this site.';
    input.value='';
    input.focus();
    return;
  }
  localStorage.setItem('baked-age-verified-until', String(Date.now() + 30*24*60*60*1000));
  input.value='';
  $('#ageGate').classList.add('hidden');
}
$('#productImageFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;$('#productFormMessage').textContent='Preparing photo…';try{$('#productImage').value=await compressImage(file);$('#productFormMessage').textContent='Photo ready'}catch{$('#productFormMessage').textContent='Could not process photo'}});
$('#settingsForm').addEventListener('submit',saveSiteSettings);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installAppButton')?.classList.remove('hidden')});
$('#installAppButton').onclick=async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null}else toast('Use your browser menu and choose Add to Home Screen')};
$('#ageVerificationForm').addEventListener('submit',verifyCustomerAge);
$('#customerIdNumber').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,13)});
$('#leaveSite').onclick=()=>location.href='https://www.google.com';
{
  const verifiedUntil=Number(localStorage.getItem('baked-age-verified-until')||0);
  if(verifiedUntil>Date.now()){
    $('#ageGate').classList.add('hidden');
  }else{
    localStorage.removeItem('baked-age-verified-until');
  }
}
$('#cartButton').onclick=openDrawer; $('#drawerBackdrop').onclick=closeOverlays; $$('[data-close]').forEach(b=>b.onclick=closeOverlays);
$('#checkoutForm').onsubmit=placeOrder; 

/* ===== SURPRISE ME ===== */
function openSurpriseMe(){
  const modal=$('#surpriseModal');
  if(!modal)return;
  $('#surpriseResult').innerHTML='';
  $('#surpriseBudget').value='';
  modal.classList.remove('hidden');
}
function closeSurpriseMe(){if($('#surpriseModal'))$('#surpriseModal').classList.add('hidden');}
function runSurpriseMe(){
  const budget=Number($('#surpriseBudget')?.value||0),result=$('#surpriseResult');
  if(!result)return;
  if(!Number.isFinite(budget)||budget<=0){result.innerHTML='<div class="surprise-empty">Enter a budget greater than R0.</div>';return;}
  const candidates=products.filter(p=>Number(p.stock)>0&&Number(p.price)<=budget&&p.active!==false);
  if(!candidates.length){result.innerHTML=`<div class="surprise-empty"><strong>No match under ${money(budget)}</strong><br>Try a higher budget.</div>`;return;}
  const pick=candidates[Math.floor(Math.random()*candidates.length)];
  const qty=Math.max(1,Math.min(Number(pick.stock||1),Math.floor(budget/Number(pick.price||1))));
  const img=pick.image_url?`<img src="${escapeHtml(pick.image_url)}" alt="${escapeHtml(pick.name)}">`:`<div class="surprise-placeholder">${initials(pick.name)}</div>`;
  result.innerHTML=`<div class="surprise-pick"><div class="surprise-image">${img}</div><div class="surprise-copy">
    <div class="surprise-label">YOUR SURPRISE PICK</div><h3>${escapeHtml(pick.name)}</h3>
    <p>${escapeHtml(pick.description||'Available now on the live menu.')}</p>
    <div class="surprise-meta"><span>${escapeHtml(displayCategory(pick.category)||pick.group_name||'Product')}</span><strong>${money(pick.price)}</strong></div>
    <div class="surprise-actions"><button class="btn primary" id="surpriseAddOne" type="button">Add 1 to cart</button>
    ${qty>1?`<button class="btn ghost" id="surpriseAddBudget" type="button">Add ${qty} (${money(qty*Number(pick.price||0))})</button>`:''}
    <button class="btn ghost" id="surpriseAgain" type="button">Surprise me again</button></div></div></div>`;
  $('#surpriseAddOne').onclick=()=>addToCart(pick.id,1);
  if($('#surpriseAddBudget'))$('#surpriseAddBudget').onclick=()=>addToCart(pick.id,qty);
  $('#surpriseAgain').onclick=runSurpriseMe;
}

$('#clearCartButton').onclick=clearCart; $('#adminButton').onclick=showAdmin; $('#homeButton').onclick=showStore; $('#loginForm').onsubmit=login; $('#signupForm').onsubmit=signupStaff; $('#logoutButton').onclick=logout; $('#claimAdminButton').onclick=claimAdmin;
$('#fastStockSearch').oninput=renderFastStock; $('#refreshFastStockButton').onclick=loadFastStock; $('#saveFastStockButton').onclick=saveFastStock; $('#downloadStockTemplateButton').onclick=downloadStockCsvTemplate; $('#previewStockCsvButton').onclick=previewStockCsv; $('#applyStockCsvButton').onclick=applyStockCsv; $('#stockCsvFile').onchange=previewStockCsv; $('#addProductButton').onclick=()=>openProductModal(); $('#productForm').onsubmit=saveProduct; $('#stockForm').onsubmit=adjustStock; $('#refreshOrdersButton').onclick=loadOrders; $('#deleteOldOrdersButton').onclick=deleteOldCompletedOrders; $('#refreshInventoryButton').onclick=loadInventory; $('#addAdminForm').onsubmit=addAdmin; $('#refreshAdminsButton').onclick=loadAdminUsers;
$$('.admin-tab').forEach(b=>b.onclick=()=>switchAdminTab(b.dataset.tab));
if($('#refreshSalesButton'))$('#refreshSalesButton').onclick=loadSales;
if($('#salesPeriod'))$('#salesPeriod').onchange=loadSales;
if($('#salesStatus'))$('#salesStatus').onchange=loadSales;
if($('#salesSearch'))$('#salesSearch').oninput=()=>{salesRowsCache=buildSalesRows(salesOrdersCache);renderSalesDashboard();};
if($('#exportSalesButton'))$('#exportSalesButton').onclick=exportSalesCsv;
if($('#refreshStockDashboard'))$('#refreshStockDashboard').onclick=loadStockDashboard;
if($('#exportStockDashboard'))$('#exportStockDashboard').onclick=exportStockDashboardCsv;
if($('#sdSearch'))$('#sdSearch').oninput=renderStockDashboard;
if($('#sdStatus'))$('#sdStatus').onchange=renderStockDashboard;

// ===== CUSTOMER SUGGESTIONS =====
async function submitSuggestion(e){
  e.preventDefault();
  const name=($('#suggestionName')?.value||'').trim();
  const suggestion=($('#suggestionText')?.value||'').trim();
  const msg=$('#suggestionMessage');
  const btn=$('#submitSuggestionButton');
  if(!suggestion){ if(msg)msg.textContent='Please enter a suggestion.'; return; }
  if(btn)btn.disabled=true;
  if(msg)msg.textContent='Sending…';
  try{
    await api('/rest/v1/menu_suggestions',{
      method:'POST',
      headers:{Prefer:'return=minimal'},
      body:JSON.stringify({customer_name:name||null,suggestion,status:'New'})
    });
    if($('#suggestionForm'))$('#suggestionForm').reset();
    if(msg)msg.textContent='Thank you — your suggestion has been sent.';
    toast('Suggestion sent');
  }catch(err){
    if(msg)msg.textContent=err.message;
  }finally{
    if(btn)btn.disabled=false;
  }
}

async function loadSuggestions(){
  const box=$('#adminSuggestions');
  if(!box||!accessToken)return;
  box.innerHTML='<div class="empty-state"><p>Loading suggestions…</p></div>';
  try{
    const rows=await api('/rest/v1/menu_suggestions?select=id,customer_name,suggestion,status,created_at&order=created_at.desc&limit=200',{auth:true})||[];
    const fresh=rows.filter(r=>String(r.status||'New').toLowerCase()==='new').length;
    const count=$('#suggestionAdminCount');
    if(count){count.textContent=fresh;count.classList.toggle('hidden',fresh===0);}
    box.innerHTML=rows.length?rows.map(r=>`<article class="admin-row suggestion-admin-row">
      <div class="admin-row-main">
        <span class="admin-icon">💡</span>
        <div>
          <strong>${escapeHtml(r.customer_name||'Anonymous')}</strong>
          <small>${new Date(r.created_at).toLocaleString('en-ZA')} · ${escapeHtml(r.status||'New')}</small>
          <p class="suggestion-copy">${escapeHtml(r.suggestion||'')}</p>
        </div>
      </div>
      <div class="admin-row-data">
        <button class="btn ghost compact suggestion-status" data-id="${r.id}" data-status="${String(r.status||'New').toLowerCase()==='new'?'Reviewed':'New'}">${String(r.status||'New').toLowerCase()==='new'?'Mark reviewed':'Mark new'}</button>
        <button class="btn danger compact suggestion-delete" data-id="${r.id}">Delete</button>
      </div>
    </article>`).join(''):'<div class="empty-state"><h3>No suggestions yet</h3><p>Customer suggestions will appear here.</p></div>';
    $$('.suggestion-status').forEach(b=>b.onclick=()=>setSuggestionStatus(b.dataset.id,b.dataset.status));
    $$('.suggestion-delete').forEach(b=>b.onclick=()=>deleteSuggestion(b.dataset.id));
  }catch(err){
    box.innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}
async function setSuggestionStatus(id,status){
  try{
    await api(`/rest/v1/menu_suggestions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify({status})});
    await loadSuggestions();
  }catch(err){toast(err.message);}
}
async function deleteSuggestion(id){
  if(!confirm('Delete this suggestion?'))return;
  try{
    await api(`/rest/v1/menu_suggestions?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',auth:true,headers:{Prefer:'return=minimal'}});
    toast('Suggestion deleted');
    await loadSuggestions();
  }catch(err){toast(err.message);}
}


if($('#suggestionForm'))$('#suggestionForm').onsubmit=submitSuggestion;
if($('#refreshSuggestionsButton'))$('#refreshSuggestionsButton').onclick=loadSuggestions;

if($('#adminAlertsButton'))$('#adminAlertsButton').onclick=openAdminAlerts;
if($('#printPackingSlipButton'))$('#printPackingSlipButton').onclick=()=>printPackingSlip();
if($('#alertsGoOrders'))$('#alertsGoOrders').onclick=()=>{closeOverlays();switchAdminTab('orders');};
if($('#alertsGoStock'))$('#alertsGoStock').onclick=()=>{closeOverlays();switchAdminTab('stockdashboard');};

['searchInput','categoryFilter','stockFilter'].forEach(id=>$('#'+id).addEventListener('input',()=>{if(id==='categoryFilter')buildFilters();renderProducts();}));
$$('#vaultGrid .vault-card').forEach(card=>card.addEventListener('click',()=>setVaultFilter(card.dataset.vault)));
$('#clearVaultFilter')?.addEventListener('click',()=>setVaultFilter('all'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeOverlays();closeMemberModal();}});
if($('#surpriseButton')) $('#surpriseButton').onclick=openSurpriseMe;
if($('#surpriseClose')) $('#surpriseClose').onclick=closeSurpriseMe;
if($('#surpriseGo')) $('#surpriseGo').onclick=runSurpriseMe;
if($('#surpriseModal')) $('#surpriseModal').onclick=e=>{if(e.target===$('#surpriseModal'))closeSurpriseMe();};
loadSiteSettings().then(loadProducts);
// Robust strain popup closing
document.addEventListener('click',e=>{
  if(e.target.closest('#strainModal [data-close]')){e.preventDefault();e.stopPropagation();closeStrainModal();return;}
  const modal=e.target.closest('#strainModal');
  if(modal && e.target===modal)closeStrainModal();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#strainModal')?.classList.contains('hidden'))closeStrainModal();});


let bakedInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  bakedInstallPrompt=e;
  const btn=document.getElementById('installBakedButton');
  if(btn)btn.classList.remove('hidden');
});
window.addEventListener('appinstalled',()=>{
  bakedInstallPrompt=null;
  const btn=document.getElementById('installBakedButton');
  if(btn)btn.classList.remove('hidden');
  if(typeof toast==='function')toast('Baked Menu installed');
});
function isIosDevice(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
function isStandaloneMode(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
async function installBakedMenu(){
  if(isStandaloneMode()){if(typeof toast==='function')toast('Baked Menu is already installed');return;}
  if(bakedInstallPrompt){
    bakedInstallPrompt.prompt();
    await bakedInstallPrompt.userChoice;
    bakedInstallPrompt=null;
    const btn=document.getElementById('installBakedButton');
    if(btn)btn.classList.remove('hidden');
    return;
  }
  if(isIosDevice()){
    alert('On iPhone: tap Share in Safari, then choose Add to Home Screen.');
    return;
  }
  alert('Use your browser menu and choose Install app or Add to Home screen.');
}
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('installBakedButton');
  if(!btn)return;
  btn.onclick=installBakedMenu;
  if(isIosDevice()&&!isStandaloneMode())btn.classList.remove('hidden');
});
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  });
}
