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
    return (!term||hay.includes(term))&&(cat==='all'||p.category===cat)&&(filter==='all'||filter===state);
  });
  $('#status').textContent=`Showing ${shown.length} of ${products.length} products`;
  $('#productGrid').innerHTML=shown.length?shown.map(p=>{
    const [state,label]=stockState(p), img=p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">`:`<div class="placeholder">${initials(p.name)}</div>`;
    return `<article class="product-card"><div class="product-image">${img}<span class="badge ${state}">${label}</span></div><div class="product-body"><div class="product-meta"><span>${escapeHtml(p.group_name||p.category||'Product')}</span><span>${escapeHtml(p.strength||'')}</span></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||'Current live menu item.')}</p><div class="product-footer"><div><strong>${money(p.price)}</strong><small>${p.stock} available</small></div><button class="btn ${p.stock>0?'primary':'disabled'} add-button" data-id="${p.id}" ${p.stock<=0?'disabled':''}>${p.stock>0?'Add to cart':'Unavailable'}</button></div></div></article>`;
  }).join(''):`<div class="empty-state wide"><h3>No matching products</h3><p>Try another category or search term.</p></div>`;
  $$('.add-button').forEach(b=>b.onclick=()=>addToCart(b.dataset.id));
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

$('#confirmAge').onclick=()=>{localStorage.setItem('baked-age-confirmed','yes');$('#ageGate').classList.add('hidden')};
$('#leaveSite').onclick=()=>location.href='https://www.google.com';
if(localStorage.getItem('baked-age-confirmed')==='yes') $('#ageGate').classList.add('hidden');
$('#cartButton').onclick=openDrawer; $('#drawerBackdrop').onclick=closeOverlays; $$('[data-close]').forEach(b=>b.onclick=closeOverlays);
$('#checkoutForm').onsubmit=placeOrder; $('#adminButton').onclick=showAdmin; $('#homeButton').onclick=showStore; $('#loginForm').onsubmit=login; $('#logoutButton').onclick=logout; $('#claimAdminButton').onclick=claimAdmin;
$('#addProductButton').onclick=()=>openProductModal(); $('#productForm').onsubmit=saveProduct; $('#stockForm').onsubmit=adjustStock; $('#refreshOrdersButton').onclick=loadOrders; $('#refreshInventoryButton').onclick=loadInventory;
$$('.admin-tab').forEach(b=>b.onclick=()=>switchAdminTab(b.dataset.tab));
['searchInput','categoryFilter','stockFilter'].forEach(id=>$('#'+id).addEventListener('input',()=>{if(id==='categoryFilter')buildFilters();renderProducts();}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOverlays()});
loadProducts();
