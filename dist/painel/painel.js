(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const clean = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  const uid = value => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const clone = value => JSON.parse(JSON.stringify(value));
  const imageUrl = value => !value ? '../assets/camisas.jpg' : /^(?:https?:|data:|blob:|\/)/.test(value) ? value : `../catalogo/${value}`;
  const defaults = {
    settings: { title: 'Catálogo completo', subtitle: 'Escolha suas peças e monte seu pedido.', notice: 'FABRICAÇÃO PRÓPRIA • ATACADO E VAREJO • ENVIO PARA TODO O BRASIL', instagram: 'https://www.instagram.com/aeroboyoficial/' },
    units: [
      { id:'centro1', name:'Centro Fashion — Loja 1', phone:'5585985009803', address:'', active:true },
      { id:'centro2', name:'Centro Fashion — Loja 2', phone:'5585996858724', address:'', active:true },
      { id:'shopping', name:'Shopping Central', phone:'5585997018084', address:'', active:true },
      { id:'jangurussu', name:'Jangurussu — Loja 5', phone:'5585994261652', address:'', active:true },
      { id:'planalto', name:'Planalto Ayrton Senna', phone:'5585997018084', address:'', active:true }
    ]
  };

  const state = { mode: 'online', products: [], orders: [], units: [], settings: {}, productQuery: '', productLine: 'all', productStatus: 'all', orderFilter: 'all', editingId: null, uploadedImage: '' };

  function toast(message, error = false) {
    const node = $('[data-admin-toast]'); node.textContent = message; node.style.background = error ? '#a70c18' : '#111'; node.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function localData() {
    const saved = localStorage.getItem('aeroboy-admin-demo');
    if (saved) { try { return JSON.parse(saved); } catch (_) {} }
    return { products: clone(window.AEROBOY_PRODUCTS || []).map((p, index) => ({ ...p, active: true, sortOrder: index + 1 })), orders: [], units: clone(defaults.units), settings: clone(defaults.settings) };
  }

  function saveLocal() {
    if (state.mode !== 'demo') return;
    localStorage.setItem('aeroboy-admin-demo', JSON.stringify({ products: state.products, orders: state.orders, units: state.units, settings: state.settings }));
  }

  async function api(path, options = {}) {
    const response = await fetch(`../api/${path}`, { credentials:'same-origin', headers: options.body instanceof FormData ? {} : { 'content-type':'application/json' }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'Não foi possível concluir.'); error.status = response.status; throw error; }
    return data;
  }

  async function detectSession() {
    try { return await api('auth/session'); }
    catch (_) { return { unavailable: true }; }
  }

  function showLogin(demoAvailable = false) {
    $('[data-login-screen]').hidden = false; $('[data-admin-shell]').hidden = true; $('[data-demo-login]').hidden = !demoAvailable;
    if (demoAvailable) { $('[data-login-error]').hidden = false; $('[data-login-error]').textContent = 'O banco online ainda não está conectado nesta hospedagem. Você pode visualizar o painel em modo demonstração.'; }
  }

  async function enterPanel(mode = 'online') {
    state.mode = mode;
    $('[data-login-screen]').hidden = true; $('[data-admin-shell]').hidden = false;
    $('[data-demo-banner]').hidden = mode !== 'demo'; $('[data-connection]').classList.toggle('offline', mode === 'demo');
    $('[data-connection]').lastChild.textContent = mode === 'demo' ? ' Prévia local' : ' Conectado';
    await loadAll(); renderAll();
  }

  async function loadAll() {
    if (state.mode === 'demo') {
      const data = localData(); Object.assign(state, data); return;
    }
    const [products, orders, units, settings] = await Promise.all([api('admin/products'), api('admin/orders'), api('admin/units'), api('admin/settings')]);
    state.products = products.products || []; state.orders = orders.orders || []; state.units = units.units || []; state.settings = settings.settings || {};
  }

  function switchView(view) {
    const titles = { dashboard:['PAINEL AEROBOY','Visão geral'], products:['GESTÃO DO CATÁLOGO','Produtos'], orders:['ATENDIMENTO','Pedidos'], site:['CONTEÚDO','Conteúdo do site'], units:['ATENDIMENTO','Unidades e WhatsApp'] };
    $$('[data-view]').forEach(node => node.classList.toggle('active', node.dataset.view === view));
    $$('[data-view-link]').forEach(node => node.classList.toggle('active', node.dataset.viewLink === view));
    $('[data-page-kicker]').textContent = titles[view][0]; $('[data-page-title]').textContent = titles[view][1];
    $('[data-sidebar]').classList.remove('open'); window.scrollTo({ top:0, behavior:'smooth' });
  }

  function renderAll() { renderDashboard(); renderProducts(); renderOrders(); renderUnits(); renderSettings(); }

  function renderDashboard() {
    const activeProducts = state.products.filter(p => p.active !== false).length;
    const newOrders = state.orders.filter(o => o.status === 'new').length;
    $('[data-stat-products]').textContent = state.products.length; $('[data-stat-active]').textContent = activeProducts;
    $('[data-stat-orders]').textContent = state.orders.length; $('[data-stat-new]').textContent = newOrders;
    $('[data-stat-units]').textContent = state.units.filter(u => u.active !== false && Number(u.active) !== 0).length;
    $('[data-nav-products]').textContent = state.products.length; $('[data-nav-orders]').textContent = newOrders; $('[data-nav-orders]').hidden = !newOrders;
    $('[data-recent-products]').innerHTML = state.products.slice().sort((a,b) => Number(b.sortOrder||0)-Number(a.sortOrder||0)).slice(0,5).map(product => `<button class="recent-row" type="button" data-edit-product="${esc(product.id)}"><img src="${esc(imageUrl(product.image))}" alt=""><span><b>${esc(product.name)}</b><small>${esc(product.line)} • ${money(product.retail)}</small></span><em>${product.active === false ? 'Oculto' : 'Visível'}</em></button>`).join('') || '<p style="padding:18px;color:#777">Nenhum produto cadastrado.</p>';
  }

  function filteredProducts() {
    const query = state.productQuery.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return state.products.filter(product => {
      const haystack = `${product.name} ${product.line} ${product.category}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      return (!query || haystack.includes(query)) && (state.productLine === 'all' || product.line === state.productLine) && (state.productStatus === 'all' || (state.productStatus === 'active') === (product.active !== false));
    }).sort((a,b) => Number(a.sortOrder||0)-Number(b.sortOrder||0));
  }

  function renderProducts() {
    const products = filteredProducts(); $('[data-products-empty]').hidden = products.length > 0;
    $('[data-admin-products]').innerHTML = products.map(product => `<article class="admin-product"><figure><img src="${esc(imageUrl(product.image))}" alt="${esc(product.name)}" loading="lazy"><span class="${product.active === false ? 'inactive' : ''}">${product.active === false ? 'OCULTO' : esc(product.line)}</span></figure><div class="admin-product-content"><h3>${esc(product.name)}</h3><p>${esc(product.category)} • ${esc((product.sizes || []).join(', '))}</p><div class="admin-product-prices"><span><small>Varejo</small><b>${money(product.retail)}</b></span><span><small>Atacado</small><b>${money(product.wholesale)}</b></span></div><button type="button" data-edit-product="${esc(product.id)}">Editar produto</button></div></article>`).join('');
  }

  function renderOrders() {
    const labels = { new:'Novo', contacted:'Em atendimento', completed:'Concluído', cancelled:'Cancelado' };
    const orders = state.orders.filter(order => state.orderFilter === 'all' || order.status === state.orderFilter);
    $('[data-orders-empty]').hidden = orders.length > 0;
    $('[data-orders-list]').innerHTML = orders.map(order => `<article class="order-card"><header><span>${esc((order.customer_name || 'C')[0].toUpperCase())}</span><div><h3>${esc(order.customer_name)}</h3><p>${new Date(order.created_at).toLocaleString('pt-BR')} • ${esc(order.id.slice(0,8))}</p></div></header><select data-order-status="${esc(order.id)}" aria-label="Status do pedido"><option value="new" ${order.status==='new'?'selected':''}>Novo</option><option value="contacted" ${order.status==='contacted'?'selected':''}>Em atendimento</option><option value="completed" ${order.status==='completed'?'selected':''}>Concluído</option><option value="cancelled" ${order.status==='cancelled'?'selected':''}>Cancelado</option></select><dl><div><dt>Peças</dt><dd>${Number(order.item_count||0)}</dd></div><div><dt>Total estimado</dt><dd>${money(order.total)}</dd></div><div><dt>Pagamento</dt><dd>${esc(order.payment)}</dd></div><div><dt>Unidade</dt><dd>${esc(order.unit_id)}</dd></div></dl></article>`).join('');
  }

  function renderSettings() {
    const form = $('[data-settings-form]'); Object.entries({ ...defaults.settings, ...state.settings }).forEach(([key,value]) => { if (form.elements[key]) form.elements[key].value = value || ''; });
  }

  function renderUnits() {
    $('[data-units-list]').innerHTML = state.units.map((unit,index) => `<article class="unit-row" data-unit-index="${index}"><span>${String(index+1).padStart(2,'0')}</span><label><span>Nome da unidade</span><input name="name" value="${esc(unit.name)}" required></label><label><span>WhatsApp</span><input name="phone" value="${esc(unit.phone)}" inputmode="numeric" required></label><label><span>Endereço / referência</span><input name="address" value="${esc(unit.address || '')}" placeholder="Opcional"></label><button type="button" data-remove-unit="${index}" aria-label="Excluir unidade">×</button><input type="hidden" name="id" value="${esc(unit.id)}"></article>`).join('');
  }

  function openEditor(product = null) {
    state.editingId = product?.id || null; state.uploadedImage = '';
    const form = $('[data-product-editor-form]'); form.reset(); $('[data-editor-title]').textContent = product ? 'Editar produto' : 'Novo produto'; $('[data-delete-product]').hidden = !product;
    const data = product || { line:'Slim', category:'camisas', sizes:['P','M','G','GG'], active:true, sortOrder: state.products.length + 1, image:'../assets/camisas.jpg' };
    ['name','id','line','category','retail','wholesale','note','sortOrder','image'].forEach(key => { if (form.elements[key]) form.elements[key].value = data[key] ?? ''; });
    form.elements.sizes.value = Array.isArray(data.sizes) ? data.sizes.join(', ') : data.sizes || ''; form.elements.active.checked = data.active !== false;
    $('[data-photo-preview]').src = imageUrl(data.image); $('[data-product-editor]').showModal(); document.body.style.overflow = 'hidden';
  }

  function closeEditor() { $('[data-product-editor]').close(); document.body.style.overflow = ''; state.editingId = null; state.uploadedImage = ''; }

  async function uploadPhoto(file) {
    if (state.mode === 'demo') return await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const body = new FormData(); body.append('file', file); const result = await api('admin/media', { method:'POST', body }); return result.url;
  }

  async function saveProduct(event) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Salvando...';
    try {
      const file = form.elements.photo.files[0]; let image = state.uploadedImage || clean(form.elements.image.value) || '../assets/camisas.jpg'; if (file) image = await uploadPhoto(file);
      const product = { id: clean(form.elements.id.value) || uid(form.elements.name.value), name:clean(form.elements.name.value), line:form.elements.line.value, category:form.elements.category.value, retail:Number(form.elements.retail.value||0), wholesale:Number(form.elements.wholesale.value||0), sizes:form.elements.sizes.value.split(',').map(clean).filter(Boolean), note:clean(form.elements.note.value), sortOrder:Number(form.elements.sortOrder.value||0), image, active:form.elements.active.checked };
      if (!product.name || !product.id) throw new Error('Informe o nome do produto.');
      if (state.mode === 'demo') { const index = state.products.findIndex(p => p.id === state.editingId); if (index >= 0) state.products[index] = product; else state.products.push(product); saveLocal(); }
      else if (state.editingId) await api(`admin/products/${encodeURIComponent(state.editingId)}`, { method:'PUT', body:JSON.stringify(product) });
      else await api('admin/products', { method:'POST', body:JSON.stringify(product) });
      if (state.mode !== 'demo') state.products = (await api('admin/products')).products || [];
      renderAll(); closeEditor(); toast('Produto salvo com sucesso.');
    } catch (error) { toast(error.message, true); }
    finally { button.disabled = false; button.textContent = 'Salvar produto'; }
  }

  async function deleteProduct() {
    if (!state.editingId || !confirm('Excluir este produto do catálogo?')) return;
    try { if (state.mode === 'demo') { state.products = state.products.filter(p => p.id !== state.editingId); saveLocal(); } else { await api(`admin/products/${encodeURIComponent(state.editingId)}`, { method:'DELETE' }); state.products = (await api('admin/products')).products || []; } renderAll(); closeEditor(); toast('Produto excluído.'); }
    catch (error) { toast(error.message,true); }
  }

  async function importProducts() {
    if (!confirm('Importar os produtos atuais para o painel? Produtos com o mesmo código serão atualizados.')) return;
    const products = clone(window.AEROBOY_PRODUCTS || []).map((p,index) => ({ ...p, active:true, sortOrder:index+1 }));
    try { if (state.mode === 'demo') { state.products = products; saveLocal(); } else { const result = await api('admin/products/import',{ method:'POST', body:JSON.stringify({ products }) }); toast(`${result.imported} produtos importados.`); state.products = (await api('admin/products')).products || []; } renderAll(); }
    catch (error) { toast(error.message,true); }
  }

  async function saveSettings(event) {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { if (state.mode === 'demo') { state.settings = data; saveLocal(); } else await api('admin/settings',{ method:'PUT', body:JSON.stringify(data) }); state.settings = data; toast('Conteúdo atualizado.'); }
    catch (error) { toast(error.message,true); }
  }

  async function saveUnits(event) {
    event.preventDefault(); const units = $$('.unit-row').map((row,index) => ({ id:clean($('[name="id"]',row).value)||uid($('[name="name"]',row).value), name:clean($('[name="name"]',row).value), phone:clean($('[name="phone"]',row).value).replace(/\D/g,''), address:clean($('[name="address"]',row).value), active:true, sortOrder:index+1 }));
    try { if (state.mode === 'demo') { state.units = units; saveLocal(); } else await api('admin/units',{ method:'PUT',body:JSON.stringify({ units }) }); state.units = units; renderAll(); toast('Unidades salvas.'); }
    catch (error) { toast(error.message,true); }
  }

  async function changeOrderStatus(id,status) {
    const order = state.orders.find(item => item.id === id); if (order) order.status = status;
    try { if (state.mode === 'demo') saveLocal(); else await api(`admin/orders/${encodeURIComponent(id)}/status`,{ method:'PUT',body:JSON.stringify({ status }) }); renderDashboard(); toast('Status atualizado.'); }
    catch (error) { toast(error.message,true); }
  }

  document.addEventListener('click', event => {
    const view = event.target.closest('[data-view-link]'); if (view) switchView(view.dataset.viewLink);
    if (event.target.closest('[data-menu]')) $('[data-sidebar]').classList.toggle('open');
    if (event.target.closest('[data-new-product]')) openEditor();
    if (event.target.closest('[data-go-products]')) switchView('products');
    const edit = event.target.closest('[data-edit-product]'); if (edit) openEditor(state.products.find(p => p.id === edit.dataset.editProduct));
    if (event.target.closest('[data-editor-close]')) closeEditor();
    if (event.target.closest('[data-delete-product]')) deleteProduct();
    if (event.target.closest('[data-import-products]')) importProducts();
    if (event.target.closest('[data-toggle-password]')) { const input = $('[data-login-form] input'); input.type = input.type === 'password' ? 'text' : 'password'; }
    if (event.target.closest('[data-demo-login]')) enterPanel('demo');
    if (event.target.closest('[data-add-unit]')) { state.units.push({ id:`unidade-${Date.now()}`,name:'Nova unidade',phone:'55',address:'',active:true }); renderUnits(); }
    const removeUnit = event.target.closest('[data-remove-unit]'); if (removeUnit) { state.units.splice(Number(removeUnit.dataset.removeUnit),1); renderUnits(); }
    const orderFilter = event.target.closest('[data-order-filter]'); if (orderFilter) { state.orderFilter = orderFilter.dataset.orderFilter; $$('[data-order-filter]').forEach(btn => btn.classList.toggle('active',btn===orderFilter)); renderOrders(); }
    if (event.target.closest('[data-refresh-orders]')) { if (state.mode === 'online') api('admin/orders').then(data => { state.orders=data.orders||[];renderAll();toast('Pedidos atualizados.'); }).catch(error=>toast(error.message,true)); }
    if (event.target.closest('[data-logout]')) { if (state.mode === 'online') api('auth/logout',{method:'POST'}).catch(()=>{}); location.reload(); }
  });

  $('[data-login-form]').addEventListener('submit', async event => {
    event.preventDefault(); const button = $('button[type="submit"]',event.currentTarget); button.disabled=true; button.textContent='Entrando...'; $('[data-login-error]').hidden=true;
    try { await api('auth/login',{ method:'POST',body:JSON.stringify({ password:event.currentTarget.elements.password.value }) }); await enterPanel('online'); }
    catch (error) { $('[data-login-error]').hidden=false; $('[data-login-error]').textContent=error.message; if (error.status===503 || !error.status) $('[data-demo-login]').hidden=false; }
    finally { button.disabled=false; button.innerHTML='Entrar com segurança <span>→</span>'; }
  });
  $('[data-product-search]').addEventListener('input',event=>{state.productQuery=clean(event.target.value);renderProducts();});
  $('[data-product-line]').addEventListener('change',event=>{state.productLine=event.target.value;renderProducts();});
  $('[data-product-status]').addEventListener('change',event=>{state.productStatus=event.target.value;renderProducts();});
  $('[data-product-editor-form]').addEventListener('submit',saveProduct);
  $('[data-settings-form]').addEventListener('submit',saveSettings);
  $('[data-units-form]').addEventListener('submit',saveUnits);
  $('[data-photo-preview]').closest('label').querySelector('input').addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;if(file.size>8*1024*1024){toast('A imagem deve ter no máximo 8 MB.',true);event.target.value='';return;}const reader=new FileReader();reader.onload=()=>{$('[data-photo-preview]').src=reader.result;};reader.readAsDataURL(file);});
  document.addEventListener('change',event=>{if(event.target.matches('[data-order-status]'))changeOrderStatus(event.target.dataset.orderStatus,event.target.value);});

  detectSession().then(session => { if (session.authenticated) enterPanel('online'); else showLogin(Boolean(session.unavailable)); });
})();
