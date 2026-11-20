(() => {
  'use strict';

  const products = Array.isArray(window.AEROBOY_PRODUCTS) ? window.AEROBOY_PRODUCTS : [];
  const units = {
    centro1: { name: 'Centro Fashion — Loja 1', phone: '5585985009803' },
    centro2: { name: 'Centro Fashion — Loja 2', phone: '5585996858724' },
    shopping: { name: 'Shopping Central', phone: '5585997018084' },
    jangurussu: { name: 'Jangurussu — Loja 5', phone: '5585994261652' },
    planalto: { name: 'Planalto Ayrton Senna', phone: '5585997018084' }
  };

  const state = {
    mode: localStorage.getItem('aeroboy-mode') === 'wholesale' ? 'wholesale' : 'retail',
    filter: 'all',
    query: '',
    cart: loadCart(),
    selectedProduct: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const clean = value => String(value || '').trim();
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const productById = id => products.find(product => product.id === id);
  const priceOf = product => Number(product[state.mode]);
  const modeName = () => state.mode === 'wholesale' ? 'Atacado' : 'Varejo';

  const grid = $('[data-product-grid]');
  const dialog = $('[data-product-dialog]');
  const productForm = $('[data-product-form]');
  const cartDrawer = $('[data-cart-drawer]');
  const overlay = $('[data-overlay]');
  const checkoutForm = $('[data-checkout-form]');

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem('aeroboy-cart') || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && item.productId && item.quantity > 0) : [];
    } catch (_) {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem('aeroboy-cart', JSON.stringify(state.cart));
  }

  function showToast(message) {
    const toast = $('[data-toast]');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  function matchesFilter(product) {
    if (state.filter === 'all') return true;
    if (['Slim', 'Plus Size', 'Juvenil'].includes(state.filter)) return product.line === state.filter;
    if (state.filter === 'dryfit') return product.category === 'dry-fit';
    if (state.filter === 'camisas') return ['camisas', 'manga-longa'].includes(product.category);
    return product.category === state.filter;
  }

  function matchesSearch(product) {
    if (!state.query) return true;
    const haystack = `${product.name} ${product.line} ${product.category} ${product.sizes.join(' ')}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const needle = state.query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return haystack.includes(needle);
  }

  function priceLabel(product) {
    if (state.mode === 'wholesale' && product.note) return '3 peças por R$ 100,00';
    return money(priceOf(product));
  }

  function renderProducts() {
    const visible = products.filter(product => matchesFilter(product) && matchesSearch(product));
    $('[data-results-text]').textContent = `${visible.length} ${visible.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
    $('[data-empty]').hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
    grid.innerHTML = visible.map(product => `
      <article class="product-card" data-product-card="${product.id}">
        <button class="product-image" type="button" data-product-open="${product.id}" aria-label="Ver ${escapeHtml(product.name)}">
          <img src="${product.image}" alt="${escapeHtml(product.name)} Aeroboy" width="619" height="1100" loading="lazy" decoding="async">
          <span class="product-badge">${escapeHtml(product.line)}</span>
          <span class="quick-add" aria-hidden="true">+</span>
        </button>
        <div class="product-content">
          <h3>${escapeHtml(product.name)}</h3>
          <p class="product-meta">Tamanhos: ${product.sizes.map(escapeHtml).join(' • ')}</p>
          <div class="product-bottom">
            <span class="product-price"><small>${modeName()}</small><strong>${priceLabel(product)}</strong></span>
            <button class="product-choose" type="button" data-product-open="${product.id}">ESCOLHER →</button>
          </div>
        </div>
      </article>`).join('');
  }

  function setMode(mode) {
    state.mode = mode;
    localStorage.setItem('aeroboy-mode', mode);
    $$('[data-mode]').forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });
    renderProducts();
    if (state.selectedProduct && dialog.open) fillDialog(state.selectedProduct);
    renderCart();
  }

  function fillDialog(product) {
    state.selectedProduct = product;
    $('[data-dialog-image]').src = product.image;
    $('[data-dialog-image]').alt = product.name;
    $('[data-dialog-line]').textContent = `${product.line} • ${modeName()}`;
    $('[data-dialog-name]').textContent = product.name;
    $('[data-dialog-price]').textContent = priceLabel(product);
    $('[data-dialog-price-label]').textContent = state.mode === 'wholesale' ? 'preço de atacado' : 'preço de varejo';
    $('[data-dialog-button-price]').textContent = priceLabel(product);
    const note = $('[data-dialog-note]');
    note.hidden = !product.note || state.mode !== 'wholesale';
    note.textContent = product.note || '';
    $('[data-dialog-sizes]').innerHTML = product.sizes.map((size, index) => `<label><input type="radio" name="size" value="${escapeHtml(size)}" ${index === 0 ? 'checked' : ''}><span>${escapeHtml(size)}</span></label>`).join('');
    productForm.elements.color.value = '';
    productForm.elements.quantity.value = minimumQuantity(product);
    productForm.elements.quantity.min = minimumQuantity(product);
  }

  function minimumQuantity(product = state.selectedProduct) {
    return state.mode === 'wholesale' && product && product.id === 'slim-29' ? 3 : 1;
  }

  function openProduct(id) {
    const product = productById(id);
    if (!product) return;
    fillDialog(product);
    dialog.showModal();
    document.body.classList.add('locked');
  }

  function closeProduct() {
    if (dialog.open) dialog.close();
    if (!cartDrawer.classList.contains('open')) document.body.classList.remove('locked');
  }

  function cartKey(item) {
    return `${item.productId}|${item.size}|${item.color.toLowerCase()}`;
  }

  function addToCart(product, size, color, quantity) {
    const item = { productId: product.id, size, color: color || 'Confirmar com atendente', quantity };
    const existing = state.cart.find(entry => cartKey(entry) === cartKey(item));
    if (existing) existing.quantity += quantity;
    else state.cart.push(item);
    saveCart();
    renderCart();
    showToast('Produto adicionado ao pedido');
  }

  function cartDetails() {
    return state.cart.map(item => ({ ...item, product: productById(item.productId) })).filter(item => item.product);
  }

  function cartTotals() {
    return cartDetails().reduce((totals, item) => {
      totals.count += item.quantity;
      totals.total += priceOf(item.product) * item.quantity;
      return totals;
    }, { count: 0, total: 0 });
  }

  function renderCart() {
    const details = cartDetails();
    const totals = cartTotals();
    $('[data-cart-count]').textContent = totals.count;
    $('[data-cart-item-label]').textContent = `${totals.count} ${totals.count === 1 ? 'item' : 'itens'}`;
    $('[data-summary-count]').textContent = totals.count;
    $('[data-summary-total]').textContent = money(totals.total);
    $('[data-cart-empty]').hidden = details.length > 0;
    $('[data-cart-items]').hidden = details.length === 0;
    $('[data-cart-items]').innerHTML = details.map((item, index) => `
      <article class="cart-item">
        <img src="${item.product.image}" alt="" width="70" height="90">
        <div class="cart-item-info"><h4>${escapeHtml(item.product.name)}</h4><p>Tamanho: ${escapeHtml(item.size)}</p><p>Cor: ${escapeHtml(item.color)}</p><strong>${money(priceOf(item.product) * item.quantity)}</strong></div>
        <div class="cart-item-actions"><button class="remove-item" type="button" data-remove-item="${index}" aria-label="Remover ${escapeHtml(item.product.name)}">×</button><div class="mini-stepper"><button type="button" data-cart-minus="${index}" aria-label="Diminuir">−</button><span>${item.quantity}</span><button type="button" data-cart-plus="${index}" aria-label="Aumentar">+</button></div></div>
      </article>`).join('');
    $('[data-message-preview-section]').hidden = details.length === 0;
    updateMessagePreview();
  }

  function openCart() {
    if (dialog.open) dialog.close();
    cartDrawer.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    document.body.classList.add('locked');
    setTimeout(() => $('[data-cart-close]').focus(), 100);
  }

  function closeCart() {
    cartDrawer.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
    document.body.classList.remove('locked');
  }

  function changeQuantity(index, delta) {
    if (!state.cart[index]) return;
    state.cart[index].quantity = Math.max(1, Math.min(99, state.cart[index].quantity + delta));
    saveCart();
    renderCart();
  }

  function formValues() {
    const data = new FormData(checkoutForm);
    return Object.fromEntries(data.entries());
  }

  function buildMessage() {
    const values = formValues();
    const unit = units[values.unit];
    const details = cartDetails();
    const totals = cartTotals();
    const lines = [
      '*PEDIDO AEROBOY*',
      '',
      '*CLIENTE*',
      `Nome: ${clean(values.customerName) || 'Não informado'}`,
      `Compra: ${modeName()}`,
      `Unidade: ${unit ? unit.name : 'Não escolhida'}`,
      `Pagamento: ${clean(values.payment) || 'Não escolhido'}`,
      `Entrega: ${clean(values.delivery) || 'Não escolhida'}`,
      '',
      '*ITENS DO PEDIDO*',
      ''
    ];
    details.forEach((item, index) => {
      const unitPrice = priceOf(item.product);
      lines.push(
        `*${index + 1}. ${item.product.name}*`,
        `Linha: ${item.product.line}`,
        `Tamanho: ${item.size}`,
        `Cor: ${item.color}`,
        `Quantidade: ${item.quantity}`,
        `Valor unitário: ${money(unitPrice)}`,
        `Subtotal: ${money(unitPrice * item.quantity)}`,
        ''
      );
    });
    lines.push(
      '*RESUMO*',
      `Peças: ${totals.count}`,
      `Total estimado: ${money(totals.total)}`,
      '',
      '*OBSERVAÇÃO*',
      clean(values.notes) || 'Sem observações.',
      '',
      'Aguardo a confirmação de estoque, cores e valor final.'
    );
    if (values.unit === 'planalto') lines.push('', '_Atendimento geral: favor encaminhar este pedido para a unidade Planalto Ayrton Senna._');
    return lines.join('\n');
  }

  function updateMessagePreview() {
    $('[data-message-preview]').textContent = buildMessage();
  }

  function checkout(event) {
    event.preventDefault();
    if (!state.cart.length) {
      showToast('Adicione pelo menos um produto');
      closeCart();
      document.querySelector('#produtos').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!checkoutForm.reportValidity()) return;
    const values = formValues();
    const unit = units[values.unit];
    if (!unit) return;
    const url = `https://wa.me/${unit.phone}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, '_blank', 'noopener');
  }

  document.addEventListener('click', event => {
    const openButton = event.target.closest('[data-product-open]');
    if (openButton) openProduct(openButton.dataset.productOpen);
    if (event.target.closest('[data-product-close]')) closeProduct();
    if (event.target.closest('[data-cart-open]')) openCart();
    if (event.target.closest('[data-cart-close]') || event.target === overlay) closeCart();
    if (event.target.closest('[data-cart-shop]')) { closeCart(); document.querySelector('#produtos').scrollIntoView({ behavior: 'smooth' }); }
    const remove = event.target.closest('[data-remove-item]');
    if (remove) { state.cart.splice(Number(remove.dataset.removeItem), 1); saveCart(); renderCart(); }
    const minus = event.target.closest('[data-cart-minus]');
    if (minus) changeQuantity(Number(minus.dataset.cartMinus), -1);
    const plus = event.target.closest('[data-cart-plus]');
    if (plus) changeQuantity(Number(plus.dataset.cartPlus), 1);
    const mode = event.target.closest('[data-mode]');
    if (mode) setMode(mode.dataset.mode);
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      state.filter = filter.dataset.filter;
      $$('[data-filter]').forEach(button => button.classList.toggle('active', button === filter));
      renderProducts();
    }
    if (event.target.closest('[data-clear-search]')) {
      $('[data-search]').value = '';
      state.query = '';
      $('[data-clear-search]').hidden = true;
      renderProducts();
    }
    if (event.target.closest('[data-reset-filters]')) {
      state.filter = 'all'; state.query = ''; $('[data-search]').value = ''; $('[data-clear-search]').hidden = true;
      $$('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
      renderProducts();
    }
    if (event.target.closest('[data-filter-prev]')) $('[data-filters]').scrollBy({ left: -240, behavior: 'smooth' });
    if (event.target.closest('[data-filter-next]')) $('[data-filters]').scrollBy({ left: 240, behavior: 'smooth' });
    const previewToggle = event.target.closest('[data-preview-toggle]');
    if (previewToggle) {
      const preview = $('[data-message-preview]');
      preview.hidden = !preview.hidden;
      $('b', previewToggle).textContent = preview.hidden ? 'Ver' : 'Ocultar';
    }
  });

  $('[data-search]').addEventListener('input', event => {
    state.query = clean(event.target.value);
    $('[data-clear-search]').hidden = !state.query;
    renderProducts();
  });

  $('[data-product-minus]').addEventListener('click', () => productForm.elements.quantity.value = Math.max(minimumQuantity(), Number(productForm.elements.quantity.value) - 1));
  $('[data-product-plus]').addEventListener('click', () => productForm.elements.quantity.value = Math.min(99, Number(productForm.elements.quantity.value) + 1));

  productForm.addEventListener('submit', event => {
    event.preventDefault();
    const size = productForm.querySelector('input[name="size"]:checked');
    if (!size || !state.selectedProduct) return;
    addToCart(state.selectedProduct, size.value, clean(productForm.elements.color.value) || 'Confirmar com atendente', Math.max(minimumQuantity(), Number(productForm.elements.quantity.value) || minimumQuantity()));
    closeProduct();
    openCart();
  });

  dialog.addEventListener('close', () => { if (!cartDrawer.classList.contains('open')) document.body.classList.remove('locked'); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeProduct(); });
  checkoutForm.addEventListener('submit', checkout);
  checkoutForm.addEventListener('input', updateMessagePreview);
  checkoutForm.addEventListener('change', updateMessagePreview);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && cartDrawer.classList.contains('open')) closeCart(); });
  $$('[data-year]').forEach(node => node.textContent = new Date().getFullYear());

  setMode(state.mode);
  renderCart();
})();
