const SUPABASE_URL = 'https://jtahitryhtrjgboqnimz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KeEZVzifnm7OT-hA1h7ueg_1QWL1wCh';
const FALLBACK_PRODUCTS = [
  {id:'demo-1',sku:'PRE-BBC',name:'Blueberry Cheesecake',group_name:'Platinum',category:'Pre-Rolls',strength:'1g',price:120,stock:24,reorder_level:5,description:'Smooth dessert-inspired pre-roll.',image_url:null,active:true},
  {id:'demo-2',sku:'EDI-CD25',name:'Cookie Dough',group_name:'Edibles',category:'Edibles',strength:'25mg',price:65,stock:30,reorder_level:6,description:'Soft cookie dough edible.',image_url:null,active:true},
  {id:'demo-3',sku:'FLW-PW',name:'Platinum Wreck',group_name:'Platinum',category:'Flower',strength:'1g',price:180,stock:18,reorder_level:5,description:'Premium platinum-range product.',image_url:null,active:true},
  {id:'demo-4',sku:'PRE-DSS',name:'Double Stuffed Sorbet',group_name:'Silver',category:'Pre-Rolls',strength:'1g',price:130,stock:20,reorder_level:5,description:'Bold, fruity pre-roll.',image_url:null,active:true},
  {id:'demo-5',sku:'EDI-EC25',name:'Eye Candy',group_name:'Edibles',category:'Edibles',strength:'25mg',price:70,stock:4,reorder_level:6,description:'Colourful premium edible.',image_url:null,active:true},
  {id:'demo-6',sku:'VAP-DISP',name:'Baked Disposable Vape',group_name:'Vapes',category:'Disposable Vapes',strength:'1ml',price:350,stock:0,reorder_level:4,description:'Distillate disposable vape.',image_url:null,active:true}
];

let products = [], cart = JSON.parse(localStorage.getItem('baked-cart') || '[]'), accessToken = localStorage.getItem('baked-access-token') || '';
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
  $('#categoryCount').textContent=new Set(products.map(p=>p.category).filter(Boolean)).size;
}
function buildFilters(){
  const selected=$('#categoryFilter').value;
  const cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort();
  $('#categoryFilter').innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  $('#categoryFilter').value=cats.includes(selected)?selected:'all';
  $('#categoryChips').innerHTML=['all',...cats].map(c=>`<button class="chip ${c===$('#categoryFilter').value?'active':''}" data-category="${escapeHtml(c)}">${c==='all'?'All products':escapeHtml(c)}</button>`).join('');
  $$('#categoryChips .chip').forEach(b=>b.onclick=()=>{ $('#categoryFilter').value=b.dataset.category; buildFilters(); renderProducts(); });
}
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
function renderProducts(){
  const term=$('#searchInput').value.trim().toLowerCase(), cat=$('#categoryFilter').value, filter=$('#stockFilter').value;
  const shown=products.filter(p=>{
    const state=stockState(p)[0], hay=`${p.name} ${p.sku} ${p.group_name} ${p.category} ${p.description}`.toLowerCase();
    return (!term||hay.includes(term))&&(cat==='all'||p.category===cat)&&(filter==='all'||filter===state)&&(activeVaultFilter==='all'||isVaultProduct(p,activeVaultFilter));
  });
  $('#status').textContent=activeVaultFilter==='all'?`Showing ${shown.length} of ${products.length} products`:`${vaultLabels[activeVaultFilter]} · ${shown.length} products`;

  const card=p=>{
    const [state,label]=stockState(p), img=p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`:`<div class="placeholder">${initials(p.name)}</div>`;
    return `<article class="product-card"><div class="product-image">${img}<span class="badge ${state}">${label}</span></div><div class="product-body"><div class="product-meta"><span>${escapeHtml(p.group_name||p.category||'Product')}</span><span>${escapeHtml(p.strength||'')}</span></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||'Current live menu item.')}</p><div class="product-footer"><div><strong>${money(p.price)}</strong><small>${p.stock} available</small></div><div class="product-order-controls"><input class="product-quantity" data-id="${p.id}" type="number" min="1" max="${p.stock}" value="1" inputmode="numeric" aria-label="Quantity for ${escapeHtml(p.name)}" ${(p.stock<=0||!orderingAllowed())?'disabled':''}><button class="btn ${p.stock>0?'primary':'disabled'} add-button" data-id="${p.id}" ${(p.stock<=0||!orderingAllowed())?'disabled':''}>${orderingAllowed()?(p.stock>0?'Add to cart':'Unavailable'):'Store closed'}</button></div></div></div></article>`;
  };
  const categoryText=p=>String(p.category||'').toLowerCase().replace(/[^a-z]/g,'');
  const preRolls=shown.filter(p=>categoryText(p).includes('preroll'));
  const edibles=shown.filter(p=>categoryText(p).includes('edible'));
  const other=shown.filter(p=>!categoryText(p).includes('preroll')&&!categoryText(p).includes('edible'));
  const section=(title,subtitle,items)=>items.length?`<div class="menu-category-section"><div class="section-heading"><div><p class="eyebrow accent">${title}</p><h2>${title}</h2><p>${subtitle}</p></div></div><div class="product-grid">${items.map(card).join('')}</div></div>`:'';
  const grouped=section('PRE-ROLLS','Browse our available pre-roll range.',preRolls)+section('EDIBLES','Browse our available edible range.',edibles)+section('OTHER PRODUCTS','More products available on the live menu.',other);
  $('#productGrid').innerHTML=shown.length?grouped:`<div class="empty-state wide"><h3>No matching products</h3><p>Try another category or search term.</p></div>`;
  $$('.add-button').forEach(b=>b.onclick=()=>{ const input=document.querySelector(`.product-quantity[data-id="${b.dataset.id}"]`); addToCart(b.dataset.id,Number(input?.value||1)); });
}
async function loadProducts(){
  try{
    const data=await api('/rest/v1/products?select=*&active=eq.true&order=group_name.asc,name.asc');
    products=data.length?data:FALLBACK_PRODUCTS;
    $('#status').textContent=data.length?'Connected to live inventory':'Live inventory is empty — showing starter catalogue';
  }catch(e){ products=FALLBACK_PRODUCTS; $('#status').textContent='Showing starter catalogue — live inventory connection pending'; }
  updateStats(); buildFilters(); renderProducts(); updateCart();
}
function addToCart(id){
  const p=products.find(x=>x.id===id); if(!p||p.stock<=0)return;
  const item=cart.find(x=>x.id===id); const qty=item?item.quantity:0;
  if(qty>=p.stock)return toast('No more stock is available');
  item?item.quantity++:cart.push({id:p.id,name:p.name,price:Number(p.price),quantity:1,stock:p.stock});
  persistCart(); toast(`${p.name} added to cart`);
}
function changeQty(id,change){
  const item=cart.find(x=>x.id===id); if(!item)return;
  item.quantity=Math.max(0,Math.min(item.stock,item.quantity+change));
  if(!item.quantity)cart=cart.filter(x=>x.id!==id); persistCart();
}
function updateCart(){
  const count=cart.reduce((a,b)=>a+b.quantity,0), total=cart.reduce((a,b)=>a+b.quantity*b.price,0);
  $('#cartCount').textContent=count; $('#cartTotal').textContent=money(total);
  $('#cartItems').innerHTML=cart.map(i=>`<div class="cart-item"><div><strong>${escapeHtml(i.name)}</strong><small>${money(i.price)} each</small></div><div class="qty"><button data-id="${i.id}" data-change="-1">−</button><span>${i.quantity}</span><button data-id="${i.id}" data-change="1">+</button></div></div>`).join('');
  $('#cartEmpty').classList.toggle('hidden',!!cart.length); $('#checkoutArea').classList.toggle('hidden',!cart.length);
  $$('.qty button').forEach(b=>b.onclick=()=>changeQty(b.dataset.id,Number(b.dataset.change)));
}
function openDrawer(){ $('#cartDrawer').classList.add('open'); $('#drawerBackdrop').classList.remove('hidden'); $('#cartDrawer').setAttribute('aria-hidden','false'); }
function closeOverlays(){ $$('.drawer').forEach(x=>x.classList.remove('open')); $$('.modal').forEach(x=>x.classList.add('hidden')); $('#drawerBackdrop').classList.add('hidden'); }
const WHATSAPP_ORDER_NUMBER = '27678454691';

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

async function placeOrder(e){
  e.preventDefault();

  const btn=$('#placeOrderButton');
  const customerName=$('#customerName').value.trim();
  const customerPhone=$('#customerPhone').value.trim();
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
        p_items:orderedItems.map(i=>({product_id:i.id,quantity:i.quantity}))
      })
    });

    const message=buildWhatsAppOrderMessage(orderNo,customerName,customerPhone,note,orderedItems);
    const whatsappUrl=`https://wa.me/${WHATSAPP_ORDER_NUMBER}?text=${encodeURIComponent(message)}`;

    cart=[];
    persistCart();
    e.target.reset();
    $('#checkoutMessage').textContent=`Order ${orderNo} submitted successfully. Opening WhatsApp…`;
    toast(`Order ${orderNo} received`);

    if(whatsappWindow){
      whatsappWindow.location.href=whatsappUrl;
    }else{
      window.location.href=whatsappUrl;
    }

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
async function verifyAdmin(showClaim=false){
  try{
    const isAdmin=await api('/rest/v1/rpc/is_current_user_admin',{method:'POST',auth:true,body:'{}'});
    if(isAdmin){ $('#adminLogin').classList.add('hidden'); $('#adminDashboard').classList.remove('hidden'); await Promise.all([loadAdminProducts(),loadOrders(),loadInventory()]); }
    else { $('#adminLogin').classList.remove('hidden'); $('#adminDashboard').classList.add('hidden'); $('#loginMessage').textContent='This account is signed in but is not yet an admin.'; $('#claimAdminButton').classList.toggle('hidden',!showClaim); }
  }catch{ logout(); }
}
async function claimAdmin(){
  try{ const ok=await api('/rest/v1/rpc/claim_first_admin',{method:'POST',auth:true,body:'{}'}); if(ok){toast('Admin access activated');await verifyAdmin();}else $('#loginMessage').textContent='An admin account already exists.'; }catch(err){$('#loginMessage').textContent=err.message;}
}
function logout(){ accessToken=''; localStorage.removeItem('baked-access-token'); $('#adminLogin').classList.remove('hidden'); $('#adminDashboard').classList.add('hidden'); $('#loginMessage').textContent=''; }
async function loadAdminProducts(){
  try{ const data=await api('/rest/v1/products?select=*&order=active.desc,group_name.asc,name.asc',{auth:true}); renderAdminProducts(data); }catch(err){ $('#adminProducts').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`; }
}
function renderAdminProducts(data){
  $('#adminProducts').innerHTML=data.length?data.map(p=>`<article class="admin-row"><div class="admin-row-main"><span class="admin-icon">${initials(p.name)}</span><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.sku)} · ${escapeHtml(p.group_name||p.category)} · ${money(p.price)}</small></div></div><div class="admin-row-data"><span class="stock-number ${p.stock<=p.reorder_level?'warning':''}">${p.stock} units</span><span class="visibility ${p.active?'active':'inactive'}">${p.active?'Visible':'Hidden'}</span><button class="btn ghost compact edit-product" data-id="${p.id}">Edit</button><button class="btn ghost compact stock-product" data-id="${p.id}" data-name="${escapeHtml(p.name)}">Stock</button><button class="btn danger compact delete-product" data-id="${p.id}" data-name="${escapeHtml(p.name)}">Delete</button></div></article>`).join(''):'<div class="empty-state"><h3>No products yet</h3><p>Add your first live menu product.</p></div>';
  $$('.edit-product').forEach(b=>b.onclick=()=>openProductModal(data.find(p=>String(p.id)===String(b.dataset.id))));
  $$('.stock-product').forEach(b=>b.onclick=()=>openStockModal(b.dataset.id,b.dataset.name));
  $$('.delete-product').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.id,b.dataset.name,b));
}
async function deleteProduct(id,name,button){
  if(!confirm(`Delete "${name}"?

It will be removed from the live menu.`)) return;
  const originalText=button.textContent;
  button.disabled=true;
  button.textContent='Deleting…';
  try{
    await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{
      method:'DELETE',
      auth:true,
      headers:{Prefer:'return=minimal'}
    });
    cart=cart.filter(item=>String(item.id)!==String(id));
    persistCart();
    toast(`${name} deleted`);
    await Promise.all([loadAdminProducts(),loadInventory(),loadProducts()]);
  }catch(err){
    // Products used in previous orders may be protected by database history.
    // In that case, hide the product instead so it disappears from the live menu.
    try{
      await api(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{
        method:'PATCH',
        auth:true,
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({active:false,updated_at:new Date().toISOString()})
      });
      cart=cart.filter(item=>String(item.id)!==String(id));
      persistCart();
      toast(`${name} removed from the live menu`);
      await Promise.all([loadAdminProducts(),loadInventory(),loadProducts()]);
    }catch(fallbackErr){
      toast(`Could not delete product: ${fallbackErr.message}`);
      button.disabled=false;
      button.textContent=originalText;
    }
  }
}
function openProductModal(p=null){
  $('#productModalTitle').textContent=p?'Edit product':'Add product'; $('#productForm').reset(); $('#productActive').checked=true; $('#productId').value=p?.id||'';
  if(p){ $('#productName').value=p.name;$('#productSku').value=p.sku;$('#productCategory').value=p.category;$('#productGroup').value=p.group_name;$('#productStrength').value=p.strength||'';$('#productPrice').value=p.price;$('#productStock').value=p.stock;$('#productReorder').value=p.reorder_level;$('#productImage').value=p.image_url||'';$('#productDescription').value=p.description||'';$('#productActive').checked=p.active; }
  $('#productModal').classList.remove('hidden'); $('#drawerBackdrop').classList.remove('hidden'); $('#productFormMessage').textContent='';
}
async function saveProduct(e){
  e.preventDefault(); const id=$('#productId').value, payload={name:$('#productName').value.trim(),sku:$('#productSku').value.trim(),category:$('#productCategory').value.trim(),group_name:$('#productGroup').value.trim(),strength:$('#productStrength').value.trim(),price:Number($('#productPrice').value),stock:Number($('#productStock').value),reorder_level:Number($('#productReorder').value),image_url:$('#productImage').value.trim()||null,description:$('#productDescription').value.trim(),active:$('#productActive').checked,updated_at:new Date().toISOString()};
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
    $('#adminOrders').innerHTML=orders.length?orders.map(o=>`<article class="order-card"><div class="order-top"><div><strong>${escapeHtml(o.order_number)}</strong><small>${new Date(o.created_at).toLocaleString('en-ZA')}</small></div><select class="order-status" data-id="${o.id}">${['Pending','Confirmed','Ready','Completed','Cancelled'].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="customer-line"><strong>${escapeHtml(o.customer_name)}</strong><span>${escapeHtml(o.customer_phone)}</span></div><ul>${(o.order_items||[]).map(i=>`<li><span>${i.quantity} × ${escapeHtml(i.product_name)}</span><strong>${money(i.line_total)}</strong></li>`).join('')}</ul>${o.note?`<p class="order-note">${escapeHtml(o.note)}</p>`:''}<div class="order-total"><span>Total</span><strong>${money(o.total)}</strong></div></article>`).join(''):'<div class="empty-state"><h3>No orders yet</h3><p>New customer orders will appear here.</p></div>';
    $$('.order-status').forEach(s=>s.onchange=()=>setOrderStatus(s.dataset.id,s.value));
  }catch(err){$('#adminOrders').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
}
async function setOrderStatus(id,status){ try{await api('/rest/v1/rpc/set_order_status',{method:'POST',auth:true,body:JSON.stringify({p_order_id:id,p_status:status})});toast('Order status updated');await Promise.all([loadOrders(),loadAdminProducts(),loadInventory(),loadProducts()]);}catch(err){toast(err.message);await loadOrders();} }
async function loadInventory(){
  try{ const rows=await api('/rest/v1/stock_movements?select=*,products(name)&order=created_at.desc&limit=100',{auth:true}); $('#stockHistory').innerHTML=rows.length?rows.map(r=>`<article class="admin-row"><div class="admin-row-main"><span class="movement ${r.quantity>=0?'positive':'negative'}">${r.quantity>=0?'+':''}${r.quantity}</span><div><strong>${escapeHtml(r.products?.name||'Product')}</strong><small>${escapeHtml(r.movement_type)} · ${escapeHtml(r.reference||'No reference')}</small></div></div><time>${new Date(r.created_at).toLocaleString('en-ZA')}</time></article>`).join(''):'<div class="empty-state"><h3>No stock history yet</h3></div>'; }catch(err){$('#stockHistory').innerHTML=`<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;}
}
function switchAdminTab(tab){ $$('.admin-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $$('.admin-tab-panel').forEach(p=>p.classList.add('hidden')); $(`#${tab}Tab`).classList.remove('hidden'); }


/* ===== BAKED DIGITAL MEMBERSHIP CARD ===== */
const MEMBER_STORAGE_KEY = 'baked-digital-member';

function makeMemberNumber() {
  const existing = JSON.parse(localStorage.getItem(MEMBER_STORAGE_KEY) || 'null');
  if (existing?.memberNumber) return existing.memberNumber;
  return 'BKD-' + String(Date.now()).slice(-8);
}
function getMember() {
  try { return JSON.parse(localStorage.getItem(MEMBER_STORAGE_KEY) || 'null'); } catch { return null; }
}
function saveMember(member) {
  localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(member));
}
function ensureMembershipUI() {
  if (document.getElementById('membershipButton')) return;
  const style = document.createElement('style');
  style.textContent = `
    #membershipButton{position:fixed;right:20px;bottom:92px;z-index:45;border:0;border-radius:999px;padding:12px 17px;background:#102c25;color:#fff;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.18);cursor:pointer}
    #membershipModal{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,18,14,.72);backdrop-filter:blur(6px)}
    #membershipModal.hidden{display:none}
    .member-shell{width:min(520px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 25px 80px rgba(0,0,0,.28)}
    .member-close{float:right;border:0;background:#eef3f1;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer}
    .member-card{clear:both;position:relative;overflow:hidden;min-height:270px;border-radius:24px;padding:28px;color:#fff;background:linear-gradient(135deg,#071b16,#143e32 60%,#0b261f);box-shadow:0 18px 45px rgba(8,42,32,.28)}
    .member-card:after{content:"B";position:absolute;right:-8px;bottom:-65px;font-size:220px;font-weight:900;opacity:.055}
    .member-brand{font-size:13px;letter-spacing:.22em;font-weight:900;opacity:.8}
    .member-title{font-size:30px;font-weight:900;margin:8px 0 34px}
    .member-name{font-size:22px;font-weight:800;margin-bottom:4px}
    .member-number{font-family:monospace;letter-spacing:.12em;opacity:.85}
    .member-bottom{display:flex;justify-content:space-between;align-items:end;margin-top:42px;gap:15px}
    .member-status{display:inline-block;padding:7px 11px;border:1px solid rgba(255,255,255,.25);border-radius:999px;font-size:12px;font-weight:800}
    .member-qr{width:74px;height:74px;background:#fff;border-radius:10px;padding:7px;display:grid;grid-template-columns:repeat(5,1fr);gap:2px}
    .member-qr i{background:#102c25;border-radius:1px}.member-qr i:nth-child(3n){opacity:.15}
    .member-form{margin-top:18px;display:grid;gap:10px}
    .member-form input{width:100%;box-sizing:border-box;border:1px solid #d9e2de;border-radius:12px;padding:12px 13px;font:inherit}
    .member-actions{display:flex;gap:10px;margin-top:12px}
    .member-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .member-primary{background:#102c25;color:#fff}.member-secondary{background:#edf3f0;color:#102c25}
    .member-note{font-size:12px;opacity:.62;margin:10px 2px 0}
    @media(max-width:600px){#membershipButton{right:14px;bottom:82px}.member-card{min-height:240px;padding:22px}.member-title{font-size:25px}}
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.id = 'membershipButton';
  button.type = 'button';
  button.textContent = '♛ My Baked Card';
  document.body.appendChild(button);

  const modal = document.createElement('div');
  modal.id = 'membershipModal';
  modal.className = 'hidden';
  modal.innerHTML = `
    <div class="member-shell">
      <button class="member-close" id="membershipClose" aria-label="Close">×</button>
      <div id="membershipContent"></div>
    </div>`;
  document.body.appendChild(modal);

  button.onclick = openMembershipCard;
  document.getElementById('membershipClose').onclick = () => modal.classList.add('hidden');
  modal.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
}
function qrPattern() {
  return Array.from({length:25},(_,i)=>`<i style="${[0,1,5,6,18,19,23,24,12,8,16].includes(i)?'opacity:1':''}"></i>`).join('');
}
function openMembershipCard() {
  const modal = document.getElementById('membershipModal');
  const content = document.getElementById('membershipContent');
  const member = getMember();
  if (!member) {
    content.innerHTML = `
      <div class="member-card">
        <div class="member-brand">BAKED</div>
        <div class="member-title">DIGITAL MEMBERSHIP</div>
        <div class="member-name">Create your Baked Card</div>
        <div class="member-number">MEMBERS ONLY</div>
        <div class="member-bottom"><span class="member-status">DIGITAL MEMBER</span><div class="member-qr">${qrPattern()}</div></div>
      </div>
      <form class="member-form" id="membershipForm">
        <input id="memberName" required maxlength="80" placeholder="Full name">
        <input id="memberPhone" required maxlength="30" inputmode="tel" placeholder="Cellphone number">
        <button class="member-primary" type="submit">Create my digital card</button>
      </form>
      <p class="member-note">Your membership card is saved on this device for quick access.</p>`;
    document.getElementById('membershipForm').onsubmit = createMembership;
  } else {
    content.innerHTML = renderMembership(member);
    document.getElementById('memberUseCheckout').onclick = () => {
      const n=document.getElementById('customerName'), p=document.getElementById('customerPhone');
      if(n) n.value=member.name; if(p) p.value=member.phone;
      modal.classList.add('hidden');
      toast('Member details added to checkout');
      if(n) n.scrollIntoView({behavior:'smooth',block:'center'});
    };
    document.getElementById('memberEdit').onclick = () => editMembership(member);
  }
  modal.classList.remove('hidden');
}
function renderMembership(member) {
  return `
    <div class="member-card">
      <div class="member-brand">BAKED</div>
      <div class="member-title">THE BAKED VAULT</div>
      <div class="member-name">${escapeHtml(member.name)}</div>
      <div class="member-number">${escapeHtml(member.memberNumber)}</div>
      <div class="member-bottom">
        <div><span class="member-status">ACTIVE MEMBER</span><div style="font-size:11px;margin-top:8px;opacity:.65">Member since ${escapeHtml(member.joined)}</div></div>
        <div class="member-qr" title="${escapeHtml(member.memberNumber)}">${qrPattern()}</div>
      </div>
    </div>
    <div class="member-actions">
      <button class="member-primary" id="memberUseCheckout" type="button">Use for checkout</button>
      <button class="member-secondary" id="memberEdit" type="button">Edit details</button>
    </div>
    <p class="member-note">Present this digital card when requested. Member number: ${escapeHtml(member.memberNumber)}</p>`;
}
function createMembership(e) {
  e.preventDefault();
  const member = {
    name: document.getElementById('memberName').value.trim(),
    phone: document.getElementById('memberPhone').value.trim(),
    memberNumber: makeMemberNumber(),
    joined: new Date().toLocaleDateString('en-ZA',{year:'numeric',month:'short'})
  };
  saveMember(member);
  const checkoutName=document.getElementById('customerName'), checkoutPhone=document.getElementById('customerPhone');
  if(checkoutName) checkoutName.value=member.name;
  if(checkoutPhone) checkoutPhone.value=member.phone;
  toast('Digital membership card created');
  openMembershipCard();
}
function editMembership(member) {
  localStorage.removeItem(MEMBER_STORAGE_KEY);
  openMembershipCard();
  setTimeout(()=>{
    const n=document.getElementById('memberName'), p=document.getElementById('memberPhone');
    if(n) n.value=member.name; if(p) p.value=member.phone;
  },0);
}

$('#confirmAge').onclick=()=>{localStorage.setItem('baked-age-confirmed','yes');$('#ageGate').classList.add('hidden')};
$('#leaveSite').onclick=()=>location.href='https://www.google.com';
if(localStorage.getItem('baked-age-confirmed')==='yes') $('#ageGate').classList.add('hidden');
$('#cartButton').onclick=openDrawer; $('#drawerBackdrop').onclick=closeOverlays; $$('[data-close]').forEach(b=>b.onclick=closeOverlays);
$('#checkoutForm').onsubmit=placeOrder; $('#adminButton').onclick=showAdmin; $('#homeButton').onclick=showStore; $('#loginForm').onsubmit=login; $('#logoutButton').onclick=logout; $('#claimAdminButton').onclick=claimAdmin;
$('#addProductButton').onclick=()=>openProductModal(); $('#productForm').onsubmit=saveProduct; $('#stockForm').onsubmit=adjustStock; $('#refreshOrdersButton').onclick=loadOrders; $('#refreshInventoryButton').onclick=loadInventory;
$$('.admin-tab').forEach(b=>b.onclick=()=>switchAdminTab(b.dataset.tab));
['searchInput','categoryFilter','stockFilter'].forEach(id=>$('#'+id).addEventListener('input',()=>{if(id==='categoryFilter')buildFilters();renderProducts();}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlays()});
ensureMembershipUI();
loadProducts();
