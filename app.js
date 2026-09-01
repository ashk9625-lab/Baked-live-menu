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
  String(text||'').split(/\r?\n/).forEach(line=>{
    line=line.trim(); if(!line)return;
    let m=line.match(/^(.+?)\s*(?:=|:|-)\s*(\d+)\s*$/);
    if(!m){
      const x=line.match(/^(\d+)\s*[x×]\s*(.+?)\s*$/i);
      if(x)m=[null,x[2],x[1]];
    }
    if(m){
      const name=String(m[1]||'').trim(),qty=Number(m[2]);
      if(name&&Number.isInteger(qty)&&qty>=0)items.push({name,qty});
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
    if(qty>=0&&name)items.push({qty,name});
  }
  return items;
}
function formatStrainsForAdmin(description=''){
  return parseStrainList(description).map(s=>`${s.name} = ${s.qty}`).join('\n');
}
function composeProductDescription(normalDescription='',strainText=''){
  const cleanDesc=String(normalDescription||'').trim();
  const strains=parseStrainLines(strainText);
  if(!strains.length)return cleanDesc;
  return `${cleanDesc}${cleanDesc?'\n\n':''}[[STRAINS]]\n${strains.map(s=>`${s.name} = ${s.qty}`).join('\n')}`;
}
function supportsStrainSelection(p){
  const category=String(p?.category||'').toLowerCase().replace(/[^a-z]/g,'');
  return category.includes('preroll')||category.includes('flower');
}
function selectableStrains(p){
  return supportsStrainSelection(p)?parseStrainList(p?.description):[];
}
function isFlowerProduct(p){
  return String(p?.category||'').toLowerCase().replace(/[^a-z]/g,'').includes('flower');
}
const FLOWER_WEIGHTS=[1,2,3,5];
function openStrainModal(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  const strains=selectableStrains(p);
  if(!strains.length)return;
  $('#strainModalTitle').textContent=p.name;
  $('#strainModalSubtitle').textContent=isFlowerProduct(p)?'Choose a strain, pack size and quantity':'Choose a strain and quantity';
  $('#strainModalList').innerHTML=strains.map((s,i)=>`<div class="strain-row selectable-strain">
    <div class="strain-info">
      <strong>${escapeHtml(s.name)}</strong>
      <small>${s.qty} ${isFlowerProduct(p)?'grams':'available'} · ${money(p.price)} per ${isFlowerProduct(p)?'gram':'item'}</small>
    </div>
    <div class="strain-order">
      ${isFlowerProduct(p)?`<select class="strain-weight" data-index="${i}" aria-label="Pack size for ${escapeHtml(s.name)}">${FLOWER_WEIGHTS.map(g=>`<option value="${g}" ${s.qty<g?'disabled':''}>${g}G · ${money(Number(p.price)*g)}</option>`).join('')}</select>`:''}
      <input class="strain-order-qty" data-index="${i}" type="number" min="1" max="${s.qty}" value="1" inputmode="numeric" aria-label="Pack quantity for ${escapeHtml(s.name)}">
      <button type="button" class="btn primary strain-add" data-id="${p.id}" data-index="${i}" ${s.qty<=0?'disabled':''}>${s.qty<=0?'Out of stock':'Add to cart'}</button>
    </div>
  </div>`).join('');
  $$('.strain-add').forEach(b=>b.onclick=()=>{
    const strain=strains[Number(b.dataset.index)];
    const input=$(`.strain-order-qty[data-index="${b.dataset.index}"]`);
    const weight=Number($(`.strain-weight[data-index="${b.dataset.index}"]`)?.value||1);
    addStrainToCart(p,strain,Number(input?.value||1),weight);
  });
  $$('.strain-weight').forEach(select=>select.onchange=()=>{
    const strain=strains[Number(select.dataset.index)];
    const input=$(`.strain-order-qty[data-index="${select.dataset.index}"]`);
    const maxPacks=Math.floor(Number(strain.qty)/Number(select.value));
    input.max=Math.max(1,maxPacks);
    input.value=Math.min(Number(input.value)||1,Math.max(1,maxPacks));
  });
  $('#strainModal').classList.remove('hidden');
  $('#drawerBackdrop').classList.remove('hidden');
}
function addStrainToCart(p,strain,requestedQuantity=1,requestedGrams=1){
  const amount=Math.max(1,Math.floor(Number(requestedQuantity)||1));
  const grams=isFlowerProduct(p)&&FLOWER_WEIGHTS.includes(Number(requestedGrams))?Number(requestedGrams):1;
  const gramsRequired=amount*grams;
  if(gramsRequired>strain.qty)return toast(`Only ${strain.qty}g ${strain.name} available`);
  const key=`${p.id}::${strain.name}::${grams}g`;
  const item=cart.find(x=>String(x.cartKey||x.id)===key);
  const existing=item?item.quantity:0;
  const existingGrams=existing*grams;
  if(existingGrams+gramsRequired>strain.qty)return toast(`Only ${Math.floor((strain.qty-existingGrams)/grams)} more ${grams}G pack(s) available`);
  if(item)item.quantity+=amount;
  else cart.push({id:p.id,cartKey:key,name:`${p.name} — ${strain.name}${isFlowerProduct(p)?` — ${grams}G`:''}`,parentName:p.name,strain:strain.name,grams,price:Number(p.price)*grams,quantity:amount,stock:Math.floor(strain.qty/grams)});
  persistCart();
  toast(`${amount} × ${strain.name}${isFlowerProduct(p)?` ${grams}G`:''} added to cart`);
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
    const strains=selectableStrains(p);
    const strainSummary=strains.length?`<button type="button" class="view-strains" data-id="${p.id}"><span>View ${strains.length} strain${strains.length===1?'':'s'}</span><strong>Open →</strong></button>`:`<p>${escapeHtml(splitProductDescription(p.description).description||'Current live menu item.')}</p>`;
    return `<article class="product-card ${strains.length?'has-strains':''}" ${strains.length?`data-strain-card="${p.id}"`:''}><div class="product-image">${img}<span class="badge ${state}">${label}</span></div><div class="product-body"><div class="product-meta"><span>${escapeHtml(p.group_name||displayCategory(p.category)||'Product')}</span><span>${escapeHtml(p.strength||'')}</span></div><h3>${escapeHtml(p.name)}</h3>${strainSummary}<div class="product-footer"><div><strong>${money(p.price)}</strong><small>${p.stock} available</small></div><div class="product-order-controls"><input class="product-quantity" data-id="${p.id}" type="number" min="1" max="${p.stock}" value="1" inputmode="numeric" aria-label="Quantity for ${escapeHtml(p.name)}" ${(p.stock<=0||!orderingAllowed())?'disabled':''}><button class="btn ${p.stock>0?'primary':'disabled'} add-button" data-id="${p.id}" ${(p.stock<=0||!orderingAllowed())?'disabled':''}>${orderingAllowed()?(p.stock>0?'Add to cart':'Unavailable'):'Store closed'}</button></div></div></div></article>`;
  }).join(''):`<div class="empty-state wide"><h3>No matching products</h3><p>Try another category or search term.</p></div>`;
  $$('.add-button').forEach(b=>b.onclick=e=>{e.stopPropagation(); const p=products.find(x=>String(x.id)===String(b.dataset.id)); if(p&&selectableStrains(p).length)return openStrainModal(p.id); const input=document.querySelector(`.product-quantity[data-id="${b.dataset.id}"]`); addToCart(b.dataset.id,Number(input?.value||1));});
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
        p_items:orderedItems.map(i=>({product_id:i.id,quantity:i.quantity*Number(i.grams||1),strain:i.strain||null}))
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
    if(isAdmin){ $('#adminLogin').classList.add('hidden'); $('#adminDashboard').classList.remove('hidden'); await Promise.all([loadAdminProducts(),loadOrders(),loadInventory(),loadSiteSettings(true),loadAdminUsers()]); }
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
async function loadOrders(){
  try{
    const orders=await api('/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=100',{auth:true});
    $('#adminOrders').innerHTML=orders.length?orders.map(o=>`<article class="order-card"><div class="order-top"><div><strong>${escapeHtml(o.order_number)}</strong><small>${new Date(o.created_at).toLocaleString('en-ZA')}</small></div><select class="order-status" data-id="${o.id}">${['Pending','Confirmed','Ready','Completed','Cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="customer-line"><strong>${escapeHtml(o.customer_name)}</strong><span>${escapeHtml(o.customer_phone)}</span></div><ul>${(o.order_items||[]).map(i=>`<li><span>${i.quantity} × ${escapeHtml(i.product_name)}</span><strong>${money(i.line_total)}</strong></li>`).join('')}</ul>${o.note?`<p class="order-note">${escapeHtml(o.note)}</p>`:''}<div class="order-total"><span>Total</span><strong>${money(o.total)}</strong></div><div class="order-actions"><button class="btn danger compact delete-order" data-id="${o.id}" data-number="${escapeHtml(o.order_number)}">Delete order</button></div></article>`).join(''):'<div class="empty-state"><h3>No orders yet</h3><p>New customer orders will appear here.</p></div>';
    $$('.order-status').forEach(s=>s.onchange=()=>setOrderStatus(s.dataset.id,s.value));
    $$('.delete-order').forEach(b=>b.onclick=()=>deleteOrder(b.dataset.id,b.dataset.number));
  }catch(err){$('#adminOrders').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
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
    const visible=strains.map((s,i)=>({s,i})).filter(x=>!q||`${p.name} ${p.sku||''} ${x.s.name}`.toLowerCase().includes(q));
    if(!visible.length)return;
    groups.push(`<div class="fast-stock-group"><div class="fast-stock-title"><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.sku||'')}</small></div>
      ${visible.map(({s,i})=>`<div class="fast-stock-row"><span>${escapeHtml(s.name)}</span><div><small>Current ${s.qty}</small><input class="fast-stock-input" data-product="${p.id}" data-index="${i}" type="number" min="0" step="1" value="${s.qty}" inputmode="numeric"></div></div>`).join('')}
    </div>`);
  });
  box.innerHTML=groups.length?groups.join(''):'<div class="empty-state"><p>No strain stock found.</p></div>';
}
async function loadFastStock(){
  try{
    fastStockProducts=await api('/rest/v1/products?select=id,sku,name,description&order=name.asc',{auth:true});
    renderFastStock();
  }catch(err){const b=$('#fastStockList');if(b)b.innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
}
async function saveFastStock(){
  const inputs=$$('.fast-stock-input');
  const byProduct=new Map();
  inputs.forEach(input=>{
    const p=fastStockProducts.find(x=>String(x.id)===String(input.dataset.product));if(!p)return;
    const strains=parseStrainList(p.description);
    const i=Number(input.dataset.index),qty=Number(input.value);
    if(!strains[i]||!Number.isInteger(qty)||qty<0)return;
    strains[i].qty=qty;byProduct.set(String(p.id),{p,strains});
  });
  if(!byProduct.size){toast('No strain stock to save');return;}
  const btn=$('#saveFastStockButton'),msg=$('#fastStockMessage');btn.disabled=true;msg.textContent=`Saving ${byProduct.size} product${byProduct.size===1?'':'s'}…`;let saved=0;
  try{
    for(const {p,strains} of byProduct.values()){
      const normal=splitProductDescription(p.description).description;
      const strainText=strains.map(s=>`${s.name} = ${s.qty}`).join('\n');
      const description=composeProductDescription(normal,strainText);
      await api(`/rest/v1/products?id=eq.${encodeURIComponent(p.id)}`,{method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify({description,updated_at:new Date().toISOString()})});
      saved++;
    }
    toast('Strain stock updated');msg.textContent=`Saved ${saved} product${saved===1?'':'s'} successfully.`;
    await Promise.all([loadFastStock(),loadAdminProducts(),loadInventory(),loadProducts()]);
  }catch(err){msg.textContent=`Saved ${saved} before an error: ${err.message}`;toast('Some strain stock could not be saved');}
  finally{btn.disabled=false;}
}

let stockCsvChanges = [];
let stockCsvNewProducts = [];

function csvEscape(v){
  v=String(v??'');
  return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
}
async function downloadStockCsvTemplate(){
  try{
    const rows=await api('/rest/v1/products?select=sku,name,category,group_name,strength,price,stock,reorder_level,description,active,featured&order=group_name.asc,name.asc',{auth:true});
    const data=[['SKU','Product Name','Category','Range','Strength','Price','New Stock Quantity','Reorder Level','Description','Active','Featured'],
      ...rows.map(p=>[p.sku||'',p.name||'',p.category||'',p.group_name||'',p.strength||'',Number(p.price||0),Number(p.stock||0),Number(p.reorder_level||0),p.description||'',p.active!==false,p.featured===true])];
    const csv=data.map(r=>r.map(csvEscape).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='BAKED-PRODUCT-STOCK-UPLOAD.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch(err){toast(err.message);}
}
function parseCsv(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell.trim());cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=ch;}
  row.push(cell.trim());if(row.some(x=>x!==''))rows.push(row);return rows;
}
function csvBool(v,def=false){v=String(v??'').trim().toLowerCase();if(!v)return def;return ['true','yes','1','y'].includes(v);}
async function previewStockCsv(){
  const file=$('#stockCsvFile')?.files?.[0];if(!file){toast('Choose a CSV file first');return;}
  const msg=$('#stockCsvMessage'),box=$('#stockCsvPreview'),btn=$('#applyStockCsvButton');msg.textContent='Checking CSV…';box.innerHTML='';btn.disabled=true;stockCsvChanges=[];stockCsvNewProducts=[];
  try{
    const rows=parseCsv(await file.text());if(rows.length<2)throw new Error('CSV has no product rows.');
    const h=rows[0].map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,''));
    const ix=(...names)=>h.findIndex(x=>names.includes(x));
    const skuI=ix('sku'),nameI=ix('productname','product','name'),catI=ix('category'),rangeI=ix('range','group','groupname'),strengthI=ix('strength'),priceI=ix('price'),stockI=ix('newstockquantity','stock','quantity','qty'),reorderI=ix('reorderlevel','reorder'),descI=ix('description'),activeI=ix('active'),featuredI=ix('featured');
    if(skuI<0||nameI<0||stockI<0)throw new Error('CSV needs SKU, Product Name and New Stock Quantity columns.');
    const products=await api('/rest/v1/products?select=*&order=name.asc',{auth:true});
    const bySku=new Map(products.filter(p=>p.sku).map(p=>[String(p.sku).trim().toLowerCase(),p]));const preview=[];
    for(const r of rows.slice(1)){
      const sku=String(r[skuI]||'').trim(),name=String(r[nameI]||'').trim(),raw=String(r[stockI]||'').trim();if(!sku&&!name&&!raw)continue;
      const target=Number(raw);if(!sku||!name||!Number.isInteger(target)||target<0){preview.push({sku,name,current:'—',target:raw,status:'Invalid row'});continue;}
      const p=bySku.get(sku.toLowerCase());
      if(p){const diff=target-Number(p.stock||0);preview.push({sku,name:p.name,current:Number(p.stock||0),target,status:diff===0?'No change':'Update stock'});if(diff!==0)stockCsvChanges.push({id:p.id,sku,name:p.name,diff});}
      else{
        const price=priceI>=0?Number(r[priceI]||0):0;if(!Number.isFinite(price)||price<0){preview.push({sku,name,current:'NEW',target,status:'Invalid price'});continue;}
        const payload={sku,name,category:catI>=0?String(r[catI]||'').trim():'',group_name:rangeI>=0?String(r[rangeI]||'').trim():'',strength:strengthI>=0?String(r[strengthI]||'').trim():'',price,stock:target,reorder_level:reorderI>=0?Number(r[reorderI]||0):0,description:descI>=0?String(r[descI]||'').trim():'',image_url:null,active:activeI>=0?csvBool(r[activeI],true):true,featured:featuredI>=0?csvBool(r[featuredI],false):false,updated_at:new Date().toISOString()};
        stockCsvNewProducts.push(payload);preview.push({sku,name,current:'NEW',target,status:'Create product'});
      }
    }
    box.innerHTML=preview.length?`<div class="csv-table"><div class="csv-head"><span>SKU</span><span>Product</span><span>Current</span><span>New</span><span>Action</span></div>${preview.map(x=>`<div class="csv-line"><span>${escapeHtml(x.sku)}</span><span>${escapeHtml(x.name)}</span><span>${escapeHtml(x.current)}</span><span>${escapeHtml(x.target)}</span><span>${escapeHtml(x.status)}</span></div>`).join('')}</div>`:'<div class="empty-state"><p>No rows found.</p></div>';
    const total=stockCsvChanges.length+stockCsvNewProducts.length;msg.textContent=total?`${stockCsvChanges.length} stock update${stockCsvChanges.length===1?'':'s'} and ${stockCsvNewProducts.length} new product${stockCsvNewProducts.length===1?'':'s'} ready.`:'No changes or new products found.';btn.disabled=!total;
  }catch(err){msg.textContent=err.message;box.innerHTML='';btn.disabled=true;}
}
async function applyStockCsv(){
  const total=stockCsvChanges.length+stockCsvNewProducts.length;if(!total)return;const btn=$('#applyStockCsvButton'),msg=$('#stockCsvMessage');btn.disabled=true;msg.textContent=`Processing ${total} item${total===1?'':'s'}…`;let updated=0,created=0;
  try{
    for(const c of stockCsvChanges){await api('/rest/v1/rpc/adjust_stock',{method:'POST',auth:true,body:JSON.stringify({p_product_id:c.id,p_quantity:c.diff,p_reference:'CSV Stock Upload'})});updated++;}
    for(const p of stockCsvNewProducts){await api('/rest/v1/products',{method:'POST',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify(p)});created++;}
    toast(`${updated} updated · ${created} new products added`);msg.textContent=`Done: ${updated} stock updated and ${created} new product${created===1?'':'s'} created.`;stockCsvChanges=[];stockCsvNewProducts=[];$('#stockCsvPreview').innerHTML='';$('#stockCsvFile').value='';await Promise.all([loadAdminProducts(),loadInventory(),loadProducts()]);
  }catch(err){msg.textContent=`Completed ${updated} updates and ${created} new products before an error: ${err.message}`;toast('CSV import stopped because of an error');}
  finally{btn.disabled=!(stockCsvChanges.length+stockCsvNewProducts.length);}
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
  $$('.featured-add').forEach(b=>b.onclick=()=>{const p=products.find(x=>String(x.id)===String(b.dataset.id));if(p&&selectableStrains(p).length)return openStrainModal(p.id);addToCart(b.dataset.id,Number(document.querySelector(`.featured-quantity[data-id="${b.dataset.id}"]`)?.value||1));});
}
async function toggleFeatured(id,current){try{await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',auth:true,headers:{Prefer:'return=minimal'},body:JSON.stringify({featured:!current,updated_at:new Date().toISOString()})});toast(!current?'Product featured':'Product unfeatured');await Promise.all([loadAdminProducts(),loadProducts()])}catch(err){toast(err.message)}}
function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=900,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78))};img.src=reader.result};reader.readAsDataURL(file)})}

function switchAdminTab(tab){ $$('.admin-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $$('.admin-tab-panel').forEach(p=>p.classList.add('hidden')); $(`#${tab}Tab`).classList.remove('hidden'); }

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
