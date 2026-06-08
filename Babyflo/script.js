// --- DOM ELEMENTS (initialized after DOM is ready) ---
let openCartBtn;
let closeCartBtn;
let cartSidebar;
let productGrid;
let cartItemsContainer;
let cartCountSpan;
let cartTotalSpan;
let voucherInput;
let applyVoucherBtn;
let dbContactForm;

// --- APP STATE ---
let cart = JSON.parse(localStorage.getItem('babyflo_cart')) || [];
let discount = 0;

// Simple escaper to avoid injecting raw HTML (basic)
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // initialize DOM refs
    openCartBtn = document.getElementById('openCart');
    closeCartBtn = document.getElementById('closeCart');
    cartSidebar = document.getElementById('cartSidebar') || document.getElementById('cartSidebarContainer') || document.querySelector('.cart-sidebar');
    productGrid = document.getElementById('productGrid');
    cartItemsContainer = document.getElementById('cartItems') || document.getElementById('cartItemsList');
    cartCountSpan = document.getElementById('cart-count');
    cartTotalSpan = document.getElementById('cart-total');
    voucherInput = document.getElementById('voucherInput');
    applyVoucherBtn = document.getElementById('applyVoucher');
    dbContactForm = document.getElementById('dbContactForm');

    // Session auth migration
    function getAndMigrateAuth() {
        const lsName = localStorage.getItem('customerName');
        const lsEmail = localStorage.getItem('customerEmail');
        const ssName = sessionStorage.getItem('customerName');
        const ssEmail = sessionStorage.getItem('customerEmail');
        if (!ssName && lsName) {
            sessionStorage.setItem('customerName', lsName);
            localStorage.removeItem('customerName');
        }
        if (!ssEmail && lsEmail) {
            sessionStorage.setItem('customerEmail', lsEmail);
            localStorage.removeItem('customerEmail');
        }
        return {
            userName: sessionStorage.getItem('customerName'),
            userEmail: sessionStorage.getItem('customerEmail')
        };
    }
    const { userName, userEmail } = getAndMigrateAuth();
    const signInBtn = document.getElementById('signInBtn');
    const userProfileActive = document.getElementById('userProfileActive');
    const welcomeUserName = document.getElementById('welcomeUserName');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userName) {
        if (signInBtn) signInBtn.style.display = 'none';
        if (userProfileActive) userProfileActive.style.display = 'flex';
        if (welcomeUserName) welcomeUserName.innerText = `Hello, ${userName.split(' ')[0]}!`;

        if (userEmail === 'admin@babyflo.com' && !document.getElementById('returnAdminBtn') && userProfileActive && logoutBtn) {
            const adminBtn = document.createElement('a');
            adminBtn.id = 'returnAdminBtn';
            adminBtn.href = 'admin.html';
            adminBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Dashboard';
            adminBtn.style.cssText = 'background: linear-gradient(to right, #ff8ab0, #ffc2d4); color: white; padding: 5px 12px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 0.9rem; margin-right: 5px;';
            userProfileActive.insertBefore(adminBtn, logoutBtn);
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            localStorage.removeItem('customerName');
            localStorage.removeItem('customerEmail');
            window.location.href = 'index.html';
        });
    }

    // Core handlers
    setupVoucherLogic();
    setupHeroScrolls();
    setupContactForm();
    setupSearchFilter();

    if (document.querySelector('.method-option')) {
        setupPaymentMethodToggles();
    }

    loadDatabaseProducts();
    updateCartUI();

    const closeBtns = Array.from(document.querySelectorAll('.close-cart-btn, .cart-sidebar .fa-xmark, .close-cart, #closeCart'));
    closeBtns.forEach(btn => btn.addEventListener('click', closeCartSidebar));
    const openBtns = Array.from(document.querySelectorAll('.open-cart-btn, #openCart'));
    openBtns.forEach(b => b.addEventListener('click', openCartSidebar));
});

// --- PRODUCT LOADING & RENDERING ---
let fetchedProductsCache = []; 

async function loadDatabaseProducts() {
    const gridContainer = document.getElementById('productGrid');
    if (!gridContainer) return;

    try {
        const response = await fetch('https://babyflo-ultra-pro-max.onrender.com/api/products');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        fetchedProductsCache = await response.json();
        console.log("📦 Loaded database products:", fetchedProductsCache);

        if (!fetchedProductsCache || fetchedProductsCache.length === 0) {
            gridContainer.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#888; padding:40px;">No products available.</p>`;
            return;
        }

        gridContainer.innerHTML = fetchedProductsCache.map(p => {
            const id = p.id ?? p.Id;
            const name = p.name ?? p.Name ?? 'Babyflo Cologne';
            const description = p.description ?? p.Description ?? '';
            const price = p.price ?? p.Price ?? 0;
            const discountPercent = p.discount ?? p.Discount ?? 0;
            
            let volume = p.volume ?? p.Volume ?? 100;
            let volNum = parseInt(volume, 10);
            if (isNaN(volNum) || volNum < 1 || volNum > 10000) {
                volNum = 100;
            }
            volume = volNum;

            let inStock = true;
            if (p.inStock !== undefined) inStock = !!p.inStock;
            else if (p.InStock !== undefined) inStock = !!p.InStock;

            let isBestSeller = false;
            if (p.isBestSeller !== undefined) isBestSeller = !!p.isBestSeller;
            else if (p.IsBestSeller !== undefined) isBestSeller = !!p.IsBestSeller;

            const dbImage = (p.imageUrl || p.ImageUrl || '').trim();
            let imageUrl = dbImage ? dbImage : 'images/default.png';

            const basePrice = Number(price);
            let finalPrice = basePrice;
            if (discountPercent > 0) {
                finalPrice = basePrice - (basePrice * (discountPercent / 100));
            }

            // 🌟 FIXED: onclick='addToCart(${JSON.stringify(id)})' forces quotes around the ID!
            return `
            <div class="product-card ${inStock ? '' : 'out-of-stock-disabled'}" style="position: relative;">
                ${isBestSeller ? `<div class="bestseller-badge"><i class="fa-solid fa-star"></i> Best Seller</div>` : ''}
                
                <div class="product-img-wrapper" style="width: 100%; height: 260px; display: flex; align-items: center; justify-content: center; padding: 15px; background: #fff; overflow: hidden;">
                    <img src="${imageUrl}" alt="${escapeHtml(name)}" onerror="this.onerror=null; this.src='images/default.png'" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                
                <div class="product-card-details">
                    <h3>${escapeHtml(name)}</h3>
                    <p class="product-desc">${escapeHtml(description)}</p>
                    
                    <div class="price-container" style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            ${discountPercent > 0 ? `
                                <p class="product-price" style="font-weight: 700; color: #e74c3c; margin: 0; font-size: 1.2rem;">₱${finalPrice.toFixed(2)}</p>
                                <span style="text-decoration: line-through; color: #aaa; font-size: 0.85rem; font-weight: 400;">₱${basePrice.toFixed(2)}</span>
                            ` : `
                                <p class="product-price" style="font-weight: 700; color: #ff5f8f; margin: 0; font-size: 1.2rem;">₱${basePrice.toFixed(2)}</p>
                            `}
                        </div>
                        <span class="unit-price" style="font-size: 0.85rem; color: #aaa; font-weight: 400;">${volume}mL</span>
                    </div>
                </div>
                
                ${inStock ? 
                    `<button class="add-to-cart-btn" onclick='addToCart(${JSON.stringify(id)})'><i class="fa-solid fa-cart-shopping"></i> Add to Cart</button>` : 
                    `<button class="sold-out-btn" disabled>Sold Out</button>`
                }
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Database view render crash:", error);
        if (gridContainer) {
            gridContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #e74c3c; padding: 40px;">Server offline</p>`;
        }
    }
}

// --- CART INTERACTION ---
window.addToCart = function(productId) {
    const isUserLoggedIn = sessionStorage.getItem('customerName') !== null || localStorage.getItem('customerName') !== null;
    if (!isUserLoggedIn) {
        alert("Please sign in to start shopping!");
        window.location.href = 'login.html';
        return;
    }

    const targetId = String(productId);
    const productMatch = fetchedProductsCache.find(p => String(p.id || p.Id) === targetId);
    if (!productMatch) return;

    const name = productMatch.name || productMatch.Name || 'Product Item';
    const price = parseFloat(productMatch.price || productMatch.Price || 0);
    const volume = productMatch.volume || productMatch.Volume || 100;

    const existingItem = cart.find(item => String(item.id || item.Id) === targetId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: targetId, name, price, volume, quantity: 1 });
    }

    saveCartAndRefresh();
    openCartSidebar();
}

function updateCartUI() {
    const container = document.getElementById('cartItemsList')
        || document.getElementById('cartItems')
        || document.querySelector('.cart-items-list');

    const totalTextEl = document.getElementById('cartTotalText');

    let runningTotalSum = 0;
    let htmlContent = '';

    cart.forEach((item) => {
        const itemPrice = parseFloat(item.price || 0) || 0;
        const itemName = (item.name || "Product Item").toString();
        const quantity = parseInt(item.quantity || 1, 10) || 1;
        const id = item.id || item.Id;
        const itemVolume = item.volume || 100;

        const subtotal = itemPrice * quantity;
        runningTotalSum += subtotal;

        // 🌟 FIXED: Used JSON.stringify(id) and single quotes here too!
        htmlContent += `
            <div class="cart-item-row">
                <div class="item-info">
                    <h4>${escapeHtml(itemName)} (${escapeHtml(String(itemVolume))}mL)</h4>
                    <p>₱${Number(itemPrice).toFixed(2)} x ${quantity}</p>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="item-controls" aria-label="quantity-controls">
                        <button onclick='changeQuantity(${JSON.stringify(id)}, -1)'>−</button>
                        <span style="font-weight:600; min-width:22px; text-align:center;">${quantity}</span>
                        <button onclick='changeQuantity(${JSON.stringify(id)}, 1)'>+</button>
                    </div>
                    <button class="trash-btn" onclick='removeItem(${JSON.stringify(id)})' title="Remove item">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    });

    if (container) container.innerHTML = htmlContent;

    if (discount > 0) {
        runningTotalSum = runningTotalSum - (runningTotalSum * (discount / 100));
    }

    if (totalTextEl) totalTextEl.innerText = `₱${runningTotalSum.toFixed(2)}`;
    localStorage.setItem('cartTotalSum', runningTotalSum);

    const countEl = document.getElementById('cart-count') || document.querySelector('.cart-count');
    if (countEl) {
        const totalItems = cart.reduce((s, it) => s + (parseInt(it.quantity || 1, 10) || 1), 0);
        countEl.innerText = totalItems;
    }

    // --- ADD: cart footer summary + checkout button ---
    const cartFooterContainer = document.querySelector('.cart-footer') || document.querySelector('#cartSidebar .cart-footer') || document.getElementById('cartSidebar');
    const footerHtml = `
        <div class="cart-footer-summary" style="margin-top:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong>Total:</strong>
                <span id="cartTotalTextInline">₱${runningTotalSum.toFixed(2)}</span>
            </div>
            <button class="checkout-btn" style="width:100%;padding:10px;border-radius:10px;background:linear-gradient(135deg,#ff7fa2,#ff5f8f);color:#fff;border:0;font-weight:600;cursor:pointer;"
                onclick="window.location.href='checkout.html'">
                Proceed to Review & Checkout
            </button>
        </div>
    `;
    if (cartFooterContainer) {
        const existing = cartFooterContainer.querySelector('.cart-footer-summary');
        if (existing) existing.outerHTML = footerHtml;
        else cartFooterContainer.insertAdjacentHTML('beforeend', footerHtml);
    }
    const mainTotalSpan = document.getElementById('cartTotalText');
    if (mainTotalSpan) mainTotalSpan.innerText = `₱${runningTotalSum.toFixed(2)}`;

    localStorage.setItem('cartTotalSum', runningTotalSum);
}

// --- GLOBALS FOR HTML ONCLICK ---
window.changeQuantity = function(productId, amount) {
    const targetId = String(productId);
    const targetItem = cart.find(item => String(item.id || item.Id) === targetId);
    
    if (!targetItem) return;

    targetItem.quantity += amount;
    if (targetItem.quantity <= 0) {
        cart = cart.filter(item => String(item.id || item.Id) !== targetId);
    }
    saveCartAndRefresh();
};

window.removeItem = function(productId) {
    const targetId = String(productId);
    cart = cart.filter(item => String(item.id || item.Id) !== targetId);
    saveCartAndRefresh();
};

function saveCartAndRefresh() {
    localStorage.setItem('babyflo_cart', JSON.stringify(cart));
    updateCartUI();
}

// --- UTILITIES ---
function setupHeroScrolls() {
    document.getElementById('shopNowBtn')?.addEventListener('click', () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }));
    document.getElementById('learnMoreBtn')?.addEventListener('click', () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }));
}

function setupVoucherLogic() {
    if (!applyVoucherBtn) applyVoucherBtn = document.getElementById('applyVoucher');
    if (!voucherInput) voucherInput = document.getElementById('voucherInput');
    applyVoucherBtn?.addEventListener('click', () => {
        if (!voucherInput) return;
        if (voucherInput.value.trim().toUpperCase() === 'BABY15') {
            discount = 15;
            updateCartUI();
            alert('Voucher applied! 15% discount subtracted from cart total.');
        } else alert('Invalid code!');
    });
}

function setupContactForm() {
    if (!dbContactForm) dbContactForm = document.getElementById('dbContactForm');
    if (!dbContactForm) return;
    dbContactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const nameEl = document.getElementById('contactName');
            const emailEl = document.getElementById('contactEmail');
            const msgEl = document.getElementById('contactMessage');
            if (!nameEl || !emailEl || !msgEl) { alert('Form fields missing'); return; }

            const body = {
                Name: nameEl.value.trim(),
                Email: emailEl.value.trim(),
                Message: msgEl.value.trim()
            };

            const res = await fetch('https://babyflo-ultra-pro-max.onrender.com/api/contact/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) { alert("Message Sent!"); dbContactForm.reset(); }
            else {
                const txt = await res.text();
                console.error('Contact submit failed:', res.status, txt);
                alert('Failed to send message.');
            }
        } catch (err) {
            console.error('Contact submit error:', err);
            alert('Unable to send message right now.');
        }
    });
}

function openCartSidebar() {
    const sidebar = document.getElementById('cartSidebar') || document.getElementById('cartSidebarContainer') || document.querySelector('.cart-sidebar');
    if (sidebar) sidebar.classList.add('active');
}

function closeCartSidebar() {
    const sidebar = document.getElementById('cartSidebar') || document.getElementById('cartSidebarContainer') || document.querySelector('.cart-sidebar');
    if (sidebar) sidebar.classList.remove('active');
}

function setupSearchFilter() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const debounce = (fn, wait = 200) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(null, args), wait);
        };
    };

    const onInput = debounce((e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const name = card.querySelector('.product-card-details h3')?.innerText.toLowerCase() || '';
            const desc = card.querySelector('.product-desc')?.innerText.toLowerCase() || '';
            card.style.display = (q === '' || name.includes(q) || desc.includes(q)) ? '' : 'none';
        });
    }, 150);

    searchInput.addEventListener('input', onInput);
}

function setupPaymentMethodToggles() {
    document.querySelectorAll('.method-option').forEach(opt => {
        const input = opt.querySelector('input[type="radio"]');
        if (!input) return;
        if (input.checked) opt.classList.add('active');
        input.addEventListener('change', () => {
            document.querySelectorAll('.method-option').forEach(o => o.classList.remove('active'));
            if (input.checked) opt.classList.add('active');
        });
        opt.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'input') input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });
}

document.addEventListener('input', function (e) {
    if (e.target.type === 'tel' || e.target.id === 'contactPhone') {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    }
});
