// --- UTILS ---
const formatCOP = (val) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
}).format(val);

const formatCOPFull = (val) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(val);

let deleteCallback = null;
function showConfirmModal(message, callback) {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-modal-message');
    if (!modal || !msgEl) return;

    msgEl.textContent = message;
    deleteCallback = callback;
    modal.classList.add('active');
}

// --- TOAST SYSTEM ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${icons[type]}"></i></div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Auto remove
    const timeout = setTimeout(() => removeToast(toast), 3500);

    toast.onclick = () => {
        clearTimeout(timeout);
        removeToast(toast);
    };
}

function removeToast(toast) {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', (e) => {
        if (e.animationName === 'toastOut') {
            toast.remove();
        }
    });
}



let state = {
    products: [],
    sales: [],
    cart: []
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar estado de datos
    loadState();

    // 2. Cargar estado del Tema (Dark Mode)
    const savedTheme = localStorage.getItem('papeleria_theme') || 'dark';
    const btnTheme = document.getElementById('btn-toggle-theme');

    // La clase dark-mode ya fue aplicada por el script en index.html
    // Aquí solo sincronizamos el estado visual del botón
    if (btnTheme) {
        if (savedTheme === 'dark') {
            btnTheme.innerHTML = '<i data-lucide="sun"></i> <span>Claro</span>';
        } else {
            btnTheme.innerHTML = '<i data-lucide="moon"></i> <span>Oscuro</span>';
        }
    }

    initNavigation();
    initInventory();
    initSales();
    initSettings();
    initBarcodeScanner();
    updateDashboardStats();
    renderInventory();


    // Confirm Modal Logic
    const btnConfirm = document.getElementById('btn-confirm-delete');
    if (btnConfirm) {
        btnConfirm.onclick = () => {
            if (deleteCallback) {
                deleteCallback();
                deleteCallback = null;
                saveState();
                const modal = document.getElementById('confirm-modal');
                if (modal) modal.classList.remove('active');
                if (window.lucide) window.lucide.createIcons();
            }
        };
    }

    const btnCloseConfirm = document.getElementById('btn-close-confirm-modal');
    if (btnCloseConfirm) {
        btnCloseConfirm.onclick = () => {
            deleteCallback = null;
            const modal = document.getElementById('confirm-modal');
            if (modal) modal.classList.remove('active');
        };
    }

    if (window.lucide) window.lucide.createIcons();
});

// --- PERSISTENCE ---
let companyData = {
    name: 'Mi Negocio',
    nit: '900.000.000-0',
    address: 'Calle Falsa 123',
    phone: '555-5555',
    thankYouMessage: '¡Gracias por su compra!'
};

function saveState() {
    localStorage.setItem('papeleria_state', JSON.stringify(state));
}

function saveCompanyData() {
    localStorage.setItem('papeleria_company', JSON.stringify(companyData));
}

function loadCompanyData() {
    const saved = localStorage.getItem('papeleria_company');
    if (saved) companyData = JSON.parse(saved);
}

loadCompanyData(); // Cargar al inicio de la ejecución del script

function loadState() {
    const saved = localStorage.getItem('papeleria_state');
    if (saved) {
        state = JSON.parse(saved);
    } else {
        // Inicialización limpia (Arreglos vacíos por petición del usuario)
        state.products = [];
        state.sales = [];
        saveState();
    }
}

// --- NAVIGATION ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const title = document.getElementById('current-section-title');
    const desc = document.getElementById('current-section-desc');

    const meta = {
        dashboard: { title: 'Dashboard', desc: 'Monitorea el rendimiento de tu negocio en tiempo real.' },
        inventory: { title: 'Gestión de Inventario', desc: 'Control centralizado de productos, existencias y costos.' },
        sales: { title: 'Punto de Venta', desc: 'Procesa transacciones y genera recibos digitales.' },
        settings: { title: 'Configuración', desc: 'Ajustes globales y gestión de base de datos.' }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');
            if (!meta[sectionId]) return;

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(sectionId);
            if (targetSection) targetSection.classList.add('active');

            title.textContent = meta[sectionId].title;
            desc.textContent = meta[sectionId].desc;

            if (sectionId === 'dashboard') { updateDashboardStats(); }
            if (sectionId === 'inventory') renderInventory();
            if (sectionId === 'sales') {
                renderSalesHistory();
                setTimeout(() => {
                    const search = document.getElementById('sales-product-search');
                    if (search) search.focus();
                }, 50);
            }
            if (sectionId === 'settings') initSettings();
            if (window.lucide) window.lucide.createIcons();
        });
    });

    const btnQuickSale = document.getElementById('btn-quick-sale');
    if (btnQuickSale) {
        btnQuickSale.onclick = () => {
            const salesLink = document.querySelector('[data-section="sales"]');
            if (salesLink) salesLink.click();
        };
    }
}

// --- DASHBOARD ---
function updateDashboardStats() {
    const totalProducts = state.products.length;
    const lowStockCount = state.products.filter(p => p.stock <= p.minStock).length;
    const today = new Date().toISOString().split('T')[0];
    const salesToday = Math.round(state.sales.filter(s => s.date.startsWith(today)).reduce((sum, s) => sum + s.total, 0));

    // Simplificado sin ganancias por falta de datos confiables de compra tras el desmantelamiento parcial
    const updateText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    updateText('stats-total-products', totalProducts);
    updateText('stats-sales-today', formatCOP(salesToday));

    updateText('stats-low-stock', lowStockCount);

    updateDashboardInsights();
}


// --- DASHBOARD INSIGHTS ---
function updateDashboardInsights() {
    const alertsContainer = document.getElementById('restock-alerts');
    const insightsContainer = document.getElementById('sales-insights');
    if (!alertsContainer || !insightsContainer) return;

    // 1. Alertas de Reabastecimiento (Top 5 más críticos)
    const lowStock = state.products
        .filter(p => p.stock <= p.minStock)
        .sort((a, b) => (a.stock / a.minStock) - (b.stock / b.minStock))
        .slice(0, 5);

    alertsContainer.innerHTML = lowStock.length > 0
        ? lowStock.map(p => `
            <div class="alert-item">
                <div class="alert-info">
                    <span class="product-name">${p.name}</span>
                    <span class="stock-label">${p.brand || 'S/N'}</span>
                </div>
                <span class="badge ${p.stock <= 0 ? 'badge-danger' : 'badge-warning'}">
                    ${p.stock} / ${p.minStock}
                </span>
            </div>
        `).join('')
        : '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No hay alertas críticas.</p>';

    // 2. Cálculo de Top Ventas (Histórico por cantidad)
    const salesVolume = {};
    state.sales.forEach(s => {
        s.items.forEach(it => {
            salesVolume[it.name] = (salesVolume[it.name] || 0) + it.qty;
        });
    });

    const topProduct = Object.entries(salesVolume)
        .sort((a, b) => b[1] - a[1])[0];

    // 3. Últimas 3 Ventas
    const recentSales = state.sales.slice(-3).reverse();

    insightsContainer.innerHTML = `
        ${topProduct ? `
            <div class="top-product-highlight">
                <div class="top-product-icon"><i data-lucide="award"></i></div>
                <div class="top-product-data">
                    <span class="label">MÁS VENDIDO</span>
                    <span class="name">${topProduct[0]}</span>
                    <span style="font-size: 0.8rem; opacity: 0.8;">${topProduct[1]} unidades vendidas</span>
                </div>
            </div>
        ` : '<p style="color: var(--text-muted); text-align: center;">Sin datos de ventas.</p>'}
        
        <div style="margin-top: 1rem;">
            <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-muted);">Ventas Recientes</h4>
            <div class="recent-sales-list">
                ${recentSales.length > 0 ? recentSales.map(s => `
                    <div class="recent-sale-item">
                        <span>#${s.id.toString().slice(-4)} - ${new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span style="font-weight: 600; color: var(--primary);">${formatCOP(s.total)}</span>
                    </div>
                `).join('') : '<p style="font-size: 0.8rem; color: var(--text-muted);">Sin historial reciente.</p>'}
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

// --- INVENTORY ---
function initInventory() {
    const form = document.getElementById('product-form');
    const search = document.getElementById('inventory-search');

    // Material Filter Pills (Incluyendo nuevos grupos)
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.onclick = () => {
            // Desactiva todos los botones de filtro en cualquier grupo
            filterPills.forEach(p => p.classList.remove('active'));
            // Activa solo el presionado
            pill.classList.add('active');
            renderInventory(search ? search.value : '');
        };
    });

    if (document.getElementById('btn-add-product')) {
        document.getElementById('btn-add-product').onclick = () => {
            document.getElementById('modal-title').textContent = 'Nuevo Artículo';
            form.reset();
            document.getElementById('product-id').value = '';
            document.getElementById('product-modal').classList.add('active');
        };
    }
    if (form) {
        form.onsubmit = handleProductSubmit;
    }
    if (search) search.oninput = () => renderInventory(search.value);
}

function handleProductSubmit(e) {
    e.preventDefault();
    try {
        const id = document.getElementById('product-id').value;
        const code = document.getElementById('product-code').value.trim();
        const name = document.getElementById('product-name').value.trim();
        const buyPrice = parseFloat(document.getElementById('product-buy').value);
        const sellPrice = parseFloat(document.getElementById('product-sell').value);
        const stock = parseInt(document.getElementById('product-stock').value);
        const minStock = parseInt(document.getElementById('product-min').value);

        if (!code || !name || isNaN(buyPrice) || isNaN(sellPrice) || isNaN(stock)) {
            showToast('Por favor completa los campos obligatorios', 'warning');
            return;
        }

        const product = {
            id: id ? parseInt(id) : Date.now(),
            code,
            name,
            brand: document.getElementById('product-brand').value.trim(),
            materialType: document.getElementById('product-material').value,
            buyPrice,
            sellPrice,
            stock,
            minStock
        };

        if (id) {
            const idx = state.products.findIndex(p => p.id === parseInt(id));
            if (idx !== -1) {
                state.products[idx] = product;
                showToast('Producto actualizado correctamente', 'success');
            } else {
                throw new Error('Producto no encontrado');
            }
        } else {
            state.products.push(product);
            showToast('¡Producto guardado con éxito!', 'success');
        }

        saveState();
        renderInventory();
        document.getElementById('product-modal').classList.remove('active');
        updateDashboardStats();
    } catch (err) {
        console.error(err);
        showToast('Error al guardar el producto', 'error');
    }
}

function renderInventory(filterText = '') {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Active Material Filter
    const activePill = document.querySelector('.filter-pill.active');
    const materialFilter = activePill ? activePill.dataset.material : 'all';

    // Normalize text for search
    const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const query = normalize(filterText);

    const filtered = state.products.filter(p => {
        const matchesSearch =
            normalize(p.name).includes(query) ||
            normalize(p.code).includes(query) ||
            normalize(p.brand || '').includes(query) ||
            normalize(p.materialType || '').includes(query);

        const matchesMaterial = materialFilter === 'all' || p.materialType === materialFilter;

        return matchesSearch && matchesMaterial;
    });

    filtered.forEach(p => {

        let badge = 'badge-success', label = 'Ok';
        if (p.stock <= 0) { badge = 'badge-danger'; label = 'Agotado'; }
        else if (p.stock <= p.minStock) { badge = 'badge-warning'; label = 'Bajo'; }
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${p.code}</code></td>
            <td>
                <div style="font-weight: 600;">${p.name}</div>
                <div class="brand-tag">${p.brand || 'Marca S/N'}</div>
            </td>
            <td class="price-font">${formatCOP(p.buyPrice)}</td>
            <td class="price-font" style="font-weight: 600;">${formatCOP(p.sellPrice)}</td>

            <td><span class="badge ${badge}">${label}: ${p.stock}</span></td>
            <td>${p.minStock}</td>
            <td style="text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn-icon" onclick="editProduct(${p.id})"><i data-lucide="edit-3" style="width: 14px;"></i></button>
                    <button class="btn-icon" style="color: var(--danger)" onclick="deleteProduct(${p.id})"><i data-lucide="trash-2" style="width: 14px;"></i></button>
                </div>
            </td>`;
        tbody.appendChild(row);
    });
    if (window.lucide) window.lucide.createIcons();
}

window.editProduct = (id) => {
    const p = state.products.find(p => p.id === id);
    if (!p) return;
    document.getElementById('modal-title').textContent = 'Editar Artículo';
    document.getElementById('product-id').value = p.id;
    document.getElementById('product-code').value = p.code;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-brand').value = p.brand || '';
    document.getElementById('product-material').value = p.materialType || 'Escolar';
    document.getElementById('product-buy').value = p.buyPrice;
    document.getElementById('product-sell').value = p.sellPrice;
    document.getElementById('product-stock').value = p.stock;
    document.getElementById('product-min').value = p.minStock;
    document.getElementById('product-modal').classList.add('active');
};

window.deleteProduct = (id) => {
    showConfirmModal('¿Estás seguro de eliminar este producto del inventario?', () => {
        state.products = state.products.filter(p => p.id !== id);
        saveState();
        renderInventory();
        updateDashboardStats();
        showToast('Producto eliminado correctamente', 'success');
    });
};

// --- SALES ---
function initSales() {
    const search = document.getElementById('sales-product-search');
    const btnComplete = document.getElementById('btn-complete-sale');
    const suggestionsContainer = document.getElementById('sales-suggestions');

    // Qty Bar Elements
    const qtyBar = document.getElementById('sales-qty-bar');
    const qtyInput = document.getElementById('qty-input');
    const btnAddConfirm = document.getElementById('btn-add-to-cart-confirm');
    const btnCancelQty = document.getElementById('btn-cancel-qty');
    const btnPlus = document.getElementById('qty-plus');
    const btnMinus = document.getElementById('qty-minus');

    let currentProductForQty = null;
    let activeSuggestionIndex = -1;

    if (search) {
        search.oninput = () => {
            activeSuggestionIndex = -1;
            renderSalesSuggestions(search.value);
        };

        search.onkeydown = (e) => {
            const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
                updateSuggestionHighlight(suggestions);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
                updateSuggestionHighlight(suggestions);
            } else if (e.key === 'Enter') {
                const q = search.value.trim().toLowerCase();

                // 1. Check for exact barcode match first (Scanner Mode)
                const exactMatch = state.products.find(p => p.code.toLowerCase() === q);
                if (exactMatch) {
                    showQuantityBar(exactMatch);
                    search.value = '';
                    suggestionsContainer.classList.remove('active');
                    return;
                }

                // 2. If no exact match, check highlighted suggestion (Manual Mode)
                if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
                    suggestions[activeSuggestionIndex].click();
                } else if (suggestions.length > 0) {
                    // Default to first suggestion if none highlighted
                    suggestions[0].click();
                }
            }
        };

        function updateSuggestionHighlight(suggestions) {
            suggestions.forEach((s, idx) => {
                s.classList.toggle('active', idx === activeSuggestionIndex);
                if (idx === activeSuggestionIndex) s.scrollIntoView({ block: 'nearest' });
            });
        }
        search.onblur = () => {
            // Smart Focus: Return focus to search if in sales section and not in qty bar
            setTimeout(() => {
                const isSalesActive = document.getElementById('sales').classList.contains('active');
                const isQtyBarActive = document.getElementById('sales-qty-bar').classList.contains('active');
                const suggestionsActive = suggestionsContainer && suggestionsContainer.classList.contains('active');

                if (isSalesActive && !isQtyBarActive && !suggestionsActive && !document.querySelector('.modal.active')) {
                    search.focus();
                }
                if (suggestionsContainer) suggestionsContainer.classList.remove('active');
            }, 500);
        };
    }

    function showQuantityBar(p) {
        currentProductForQty = p;
        document.getElementById('qty-bar-name').textContent = p.name;
        document.getElementById('qty-bar-meta').textContent = `${p.brand || 'S/N'} | Precio: ${formatCOP(p.sellPrice)} | Stock: ${p.stock}`;
        qtyInput.value = 1;
        qtyInput.max = p.stock;
        qtyBar.classList.add('active');
        setTimeout(() => qtyInput.focus(), 50);
    }

    const confirmAdd = () => {
        const qty = parseInt(qtyInput.value);
        if (isNaN(qty) || qty <= 0) return showToast('Cantidad no válida', 'warning');
        if (qty > currentProductForQty.stock) {
            return showToast(`Stock insuficiente. Máximo disponible: ${currentProductForQty.stock}`, 'error');
        }
        addToCart(currentProductForQty, qty);
        qtyBar.classList.remove('active');
        currentProductForQty = null;
        search.focus();
    };

    if (btnAddConfirm) btnAddConfirm.onclick = confirmAdd;
    if (qtyInput) {
        qtyInput.onkeypress = (e) => { if (e.key === 'Enter') confirmAdd(); };
        qtyInput.oninput = () => {
            if (currentProductForQty && parseInt(qtyInput.value) > currentProductForQty.stock) {
                showToast(`Stock insuficiente. Máximo: ${currentProductForQty.stock}`, 'warning');
            }
        };
    }
    if (btnPlus) btnPlus.onclick = () => { if (parseInt(qtyInput.value) < currentProductForQty.stock) qtyInput.value++; };
    if (btnMinus) btnMinus.onclick = () => { if (parseInt(qtyInput.value) > 1) qtyInput.value--; };
    if (btnCancelQty) btnCancelQty.onclick = () => { qtyBar.classList.remove('active'); currentProductForQty = null; search.focus(); };

    if (btnComplete) {
        btnComplete.onclick = () => {
            if (state.cart.length === 0) return showToast('El carrito comercial está vacío.', 'info');
            const total = Math.round(state.cart.reduce((sum, it) => sum + (Number(it.price) * Number(it.qty)), 0));
            const sale = { id: Date.now(), date: new Date().toISOString(), items: [...state.cart], total: total };

            // Capturar datos para recibo antes de limpiar carrito
            const saleDataForReceipt = { ...sale };

            state.cart.forEach(it => { const p = state.products.find(pr => pr.id === it.id); if (p) p.stock -= it.qty; });
            state.sales.push(sale);
            state.cart = [];
            saveState();
            renderCart();
            renderSalesHistory();
            updateDashboardStats();
            showToast(`Venta completada: ${formatCOP(total)}`, 'success');

            // Mostrar el recibo
            showReceiptModal(saleDataForReceipt);
        };
    }

    // Export to window so suggestions can use it
    window.showQuantityBar = showQuantityBar;
}

function renderSalesSuggestions(queryText) {
    const container = document.getElementById('sales-suggestions');
    if (!container) return;

    if (!queryText.trim()) {
        container.classList.remove('active');
        return;
    }

    const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const query = normalize(queryText);

    const matches = state.products.filter(p =>
        normalize(p.name).includes(query) ||
        normalize(p.code).includes(query) ||
        normalize(p.brand || '').includes(query)
    ).slice(0, 5);

    if (matches.length === 0) {
        container.classList.remove('active');
        return;
    }

    container.innerHTML = '';
    matches.forEach(p => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';

        item.innerHTML = `
            <div class="suggestion-info">
                <div class="suggestion-name">${p.name}</div>
                <div class="suggestion-meta">${p.brand || 'Sin Marca'} | Stock: ${p.stock}</div>
            </div>
            <div class="suggestion-price">${formatCOP(p.sellPrice)}</div>
        `;

        item.onclick = () => {
            showQuantityBar(p);
            document.getElementById('sales-product-search').value = '';
            container.classList.remove('active');
        };

        container.appendChild(item);
    });

    container.classList.add('active');
}

function addToCart(p, qty = 1) {
    if (p.stock <= 0) return showToast('Sin stock disponible para este artículo.', 'error');
    const exist = state.cart.find(it => it.id === p.id);
    if (exist) {
        if (exist.qty + qty > p.stock) return showToast('Suma supera el stock disponible.', 'warning');
        exist.qty += qty;
    }
    else state.cart.push({ id: p.id, name: p.name, price: p.sellPrice, qty: qty });
    renderCart();
    showToast(`${qty} x ${p.name} añadidos al carrito.`, 'success');
}

// --- BARCODE SCANNER & GLOBAL FOCUS ---
function initBarcodeScanner() {
    document.addEventListener('keydown', (e) => {
        const isSalesActive = document.getElementById('sales').classList.contains('active');
        if (!isSalesActive) return;

        const isModalActive = document.querySelector('.modal.active');
        const isQtyBarActive = document.getElementById('sales-qty-bar').classList.contains('active');
        const searchInput = document.getElementById('sales-product-search');

        // ESCAPE Key: Clear search and force focus
        if (e.key === 'Escape') {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            if (isQtyBarActive) {
                document.getElementById('sales-qty-bar').classList.remove('active');
            }
            return;
        }

        // Alphanumeric Redirection: Redirect any letter/number key to search input
        // if not already in an input, modal, or qty bar
        const isAlphanumeric = /^[a-z0-9]$/i.test(e.key);
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

        if (isAlphanumeric && !isInput && !isModalActive && !isQtyBarActive) {
            if (searchInput) searchInput.focus();
        }

        // Logic for ENTER (Scanner Suffix)
        if (e.key === 'Enter') {
            const code = searchInput ? searchInput.value.trim() : '';
            if (code && !isQtyBarActive && !isModalActive) {
                processBarcode(code);
                searchInput.value = '';
            }
        }
    });

    // Also refocus on click anywhere in the POS area
    document.getElementById('sales').addEventListener('click', (e) => {
        const isQtyBarActive = document.getElementById('sales-qty-bar').classList.contains('active');
        const isModalActive = document.querySelector('.modal.active');
        const isButton = e.target.tagName === 'BUTTON' || e.target.closest('button');
        const isInput = e.target.tagName === 'INPUT';

        if (!isQtyBarActive && !isModalActive && !isButton && !isInput) {
            const searchInput = document.getElementById('sales-product-search');
            if (searchInput) searchInput.focus();
        }
    });
}

function processBarcode(code) {
    const product = state.products.find(p => p.code.toLowerCase() === code.toLowerCase());

    if (product) {
        if (window.showQuantityBar) {
            window.showQuantityBar(product);
        } else {
            addToCart(product, 1);
        }
    } else {
        showToast(`Producto [${code}] no registrado`, 'error');
    }
}

function renderCart() {
    const tbody = document.getElementById('cart-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let total = 0;
    state.cart.forEach((it, idx) => {
        const sub = Math.round(Number(it.price) * Number(it.qty)); total += sub;
        const row = document.createElement('tr');
        const product = state.products.find(p => p.id === it.id);

        row.innerHTML = `
            <td>
                <div class="pos-product-item">
                    <div>
                        <div style="font-weight: 600;">${it.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted)">${product ? (product.brand || 'Marca S/N') : ''}</div>
                    </div>
                </div>
            </td>
            <td class="price-font">${formatCOP(it.price)}</td>
            <td>${it.qty}</td>
            <td class="price-font" style="font-weight: 700; color: var(--primary);">${formatCOP(sub)}</td>
            <td><button class="btn-icon" onclick="removeFromCart(${idx})" style="color: var(--danger)">&times;</button></td>
        `;
        tbody.appendChild(row);
    });
    total = Math.round(total);
    const saleTotalEl = document.getElementById('sale-total');
    const saleSubtotalEl = document.getElementById('sale-subtotal');
    if (saleTotalEl) saleTotalEl.textContent = formatCOP(total);
    if (saleSubtotalEl) saleSubtotalEl.textContent = formatCOP(total);
}

window.removeFromCart = (idx) => { state.cart.splice(idx, 1); renderCart(); };

function renderSalesHistory() {
    const tbody = document.getElementById('sales-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    state.sales.slice(-5).reverse().forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>#${s.id.toString().slice(-4)}</code></td>
            <td>${new Date(s.id).toLocaleTimeString()}</td>
            <td class="price-font" style="text-align:right">${formatCOP(s.total)}</td>
            <td style="text-align: right;">
                <button class="btn-icon btn-view-receipt" onclick="viewReceipt(${s.id})">
                    <i data-lucide="eye" style="width: 14px;"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    if (window.lucide) window.lucide.createIcons();
}

window.viewReceipt = (saleId) => {
    const sale = state.sales.find(s => s.id === saleId);
    if (sale) {
        showReceiptModal(sale);
    } else {
        showToast('Venta no encontrada', 'error');
    }
};

// --- SETTINGS ---
function initSettings() {
    const formCompany = document.getElementById('company-form');

    // Cargar valores actuales en los inputs
    const populateInputs = () => {
        const nameInput = document.getElementById('cfg-company-name');
        const nitInput = document.getElementById('cfg-company-nit');
        const addrInput = document.getElementById('cfg-company-address');
        const phoneInput = document.getElementById('cfg-company-phone');
        const thanksInput = document.getElementById('cfg-company-thanks');

        if (nameInput) nameInput.value = companyData.name;
        if (nitInput) nitInput.value = companyData.nit;
        if (addrInput) addrInput.value = companyData.address;
        if (phoneInput) phoneInput.value = companyData.phone;
        if (thanksInput) thanksInput.value = companyData.thankYouMessage;
    };
    populateInputs();

    if (formCompany) {
        formCompany.onsubmit = (e) => {
            e.preventDefault();
            companyData.name = document.getElementById('cfg-company-name')?.value || companyData.name;
            companyData.nit = document.getElementById('cfg-company-nit')?.value || companyData.nit;
            companyData.address = document.getElementById('cfg-company-address')?.value || companyData.address;
            companyData.phone = document.getElementById('cfg-company-phone')?.value || companyData.phone;
            companyData.thankYouMessage = document.getElementById('cfg-company-thanks')?.value || companyData.thankYouMessage;

            saveCompanyData();
            showToast('Configuración guardada correctamente', 'success');
        };
    }

    // Toggle Tema
    const btnTheme = document.getElementById('btn-toggle-theme');
    if (btnTheme) {
        btnTheme.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');

            // Guardar preferencia
            localStorage.setItem('papeleria_theme', isDark ? 'dark' : 'light');

            // Actualizar botón
            if (isDark) {
                btnTheme.innerHTML = '<i data-lucide="sun"></i> <span>Claro</span>';
            } else {
                btnTheme.innerHTML = '<i data-lucide="moon"></i> <span>Oscuro</span>';
            }
            if (window.lucide) window.lucide.createIcons();
        };
    }

    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
        btnExport.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "copia_seguridad_papeleria.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('Copia de seguridad generada', 'success');
        };
    }

    const btnReset = document.getElementById('btn-reset-data');
    const resetModal = document.getElementById('reset-system-modal');
    const btnCancelReset = document.getElementById('btn-cancel-reset');
    const btnConfirmReset = document.getElementById('btn-confirm-reset-all');

    if (btnReset && resetModal) {
        btnReset.onclick = () => {
            resetModal.classList.add('active');
            if (window.lucide) window.lucide.createIcons();
        };

        if (btnCancelReset) {
            btnCancelReset.onclick = () => {
                resetModal.classList.remove('active');
            };
        }

        if (btnConfirmReset) {
            btnConfirmReset.onclick = () => {
                // 1. Limpieza Profunda de LocalStorage
                localStorage.clear();

                // 2. Reinicialización de Estado Interno (Valores por defecto)
                state = {
                    products: [],
                    sales: [],
                    cart: []
                };

                // 3. Configuración de Fábrica
                companyData = {
                    name: 'Mi Negocio',
                    nit: '900.000.000-0',
                    address: 'Calle Falsa 123',
                    phone: '555-5555',
                    thankYouMessage: '¡Gracias por su compra!'
                };

                // 4. Recarga de Interfaz
                location.reload();
            };
        }
    }

    const jsonUpload = document.getElementById('json-upload');
    if (jsonUpload) {
        jsonUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const importedState = JSON.parse(ev.target.result);

                    // Validación Crítica de Estructura
                    if (!importedState.products || !importedState.sales) {
                        throw new Error('Estructura de archivo inválida: Faltan productos o ventas.');
                    }

                    if (confirm(`¿Importar copia de seguridad? Esto sobrescribirá los datos actuales.`)) {
                        state = importedState;
                        saveState();
                        showToast('Datos importados correctamente', 'success');
                        setTimeout(() => location.reload(), 1000);
                    }
                } catch (err) {
                    showToast(err.message || 'Error al leer el archivo JSON', 'error');
                }
            };
            reader.readAsText(file);
        };
    }
}

// --- RECEIPT & PRINT LOGIC ---
function showReceiptModal(sale) {
    const modal = document.getElementById('receipt-modal');
    const container = document.getElementById('receipt-preview-container');
    if (!modal || !container) return;

    // Generar HTML del recibo
    const date = new Date(sale.date);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    let itemsHTML = '';
    sale.items.forEach(item => {
        itemsHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>${item.qty} x ${item.name}</span>
                <span>${formatCOP(item.price * item.qty)}</span>
            </div>
        `;
    });

    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="font-size: 1.2rem; font-weight: bold; margin: 0; text-transform: uppercase;">${companyData.name}</h2>
            <p style="font-size: 0.8rem; margin: 5px 0;">NIT: ${companyData.nit}</p>
            <p style="font-size: 0.8rem; margin: 5px 0;">${companyData.address}</p>
            <p style="font-size: 0.8rem; margin: 5px 0;">${companyData.phone}</p>
        </div>
        <div style="border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 10px 0; margin-bottom: 15px;">
            <p style="margin: 0;"><strong>Folio:</strong> #${sale.id.toString().slice(-6)}</p>
            <p style="margin: 0;"><strong>Fecha:</strong> ${formattedDate}</p>
        </div>
        <div style="margin-bottom: 20px;">
            ${itemsHTML}
        </div>
        <div style="border-top: 1px solid black; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem;">
                <span>TOTAL:</span>
                <span>${formatCOP(sale.total)}</span>
            </div>
            <p style="text-align: center; font-size: 0.75rem; margin-top: 20px;">${companyData.thankYouMessage}</p>
        </div>
    `;

    modal.classList.add('active');
}

function closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) modal.classList.remove('active');
}

window.printReceipt = () => {
    window.print();
};

window.downloadReceiptImage = () => {
    const element = document.getElementById('receipt-preview-container');
    if (!element) return;
    html2canvas(element, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Recibo_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
};

window.closeReceiptModal = closeReceiptModal;