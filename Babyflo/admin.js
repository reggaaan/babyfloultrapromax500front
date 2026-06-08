const API_URL = "http://localhost:5190/api";

// --- 1. DEFINE THE FUNCTION FIRST ---
async function addNewProduct(event) {
    event.preventDefault(); 
    console.log("Attempting to publish...");

    // This object MUST match your C# Product.cs properties
    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        volume: parseInt(document.getElementById('productVolume').value), // Matches C# Volume
        description: document.getElementById('productDescription').value,
        imageUrl: document.getElementById('productImageUrl').value,
        inStock: true,
        isBestSeller: false,
        discount: 0
    };

    // Basic Validation (Matches your C# [Range] and [Required] attributes)
    if (!productData.name) { alert("Product name is required."); return; }
    if (productData.price < 0.01) { alert("Price must be at least 0.01"); return; }

    try {
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (!res.ok) {
            // This reads the specific error from C# if ModelState is invalid
            const err = await res.text();
            throw new Error(err || "Failed to publish");
        }

        alert("Product published successfully!");
        document.getElementById('postProductForm').reset();
        await loadProducts(); // Refresh the table
    } catch (err) {
        console.error('Publish Error:', err);
        alert('Error: ' + err.message);
    }
}
// --- 2. NOW RUN THE EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Auth Guard
    const adminSession = localStorage.getItem('isAdminLoggedIn');
    if (!adminSession) window.location.href = 'login.html';

    // Bind Submit Event
    const postForm = document.getElementById('postProductForm');
    if (postForm) {
        postForm.addEventListener('submit', addNewProduct);
    }

    // Logout
    const logoutBtn = document.getElementById('adminLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            try { localStorage.clear(); sessionStorage.clear(); } catch {}
            window.location.href = 'login.html';
        });
    }

    loadProducts();
    loadOrders();
    loadMessages();

    // Container clicks
    const container = document.querySelector('.main-content') || document;
    container.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('save-btn')) {
            const id = target.dataset.id;
            const val = target.closest('tr')?.querySelector('.discount-input')?.value || '0';
            if (id) await applyDiscount(id, val);
        }
        if (target.dataset.action === 'toggle-stock') {
            const id = target.dataset.id;
            const newStatus = !target.classList.contains('active');
            if (id) await toggleStock(id, newStatus);
        }
        if (target.dataset.action === 'toggle-seller') {
            const id = target.dataset.id;
            const newStatus = !target.classList.contains('active');
            if (id) await toggleBestSeller(id, newStatus);
        }
        if (target.closest('.btn-delete')) {
            const id = target.closest('tr')?.dataset.id;
            if (id && confirm('Delete this product?')) await deleteProduct(id);
        }
    });
});

// --- HELPER FUNCTIONS (loadProducts, toggleStock, etc. go here) ---
async function loadProducts() {
    const tbody = document.getElementById('adminProductTable');
    if (!tbody) return;
    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();

    tbody.innerHTML = (products || []).map(p => {
        const id = p.id ?? p.Id ?? p.productId ?? '';
        const inStock = (p.inStock ?? p.InStock) === true;
        const isBestSeller = (p.isBestSeller ?? p.IsBestSeller) === true;
        const discountVal = p.discount ?? p.Discount ?? 0;
        const name = (p.name ?? p.Name) ?? '';
        const sku = (p.sku ?? p.SKU) ?? '';
        const price = Number(p.price ?? p.Price ?? 0).toFixed(2);

        return `
        <tr data-id="${id}">
          <td class="col-name product-name">
            <div class="meta">
              <div class="p-title">${name}</div>
              <div class="p-sub">${sku}</div>
            </div>
          </td>

          <td class="col-price">₱${price}</td>

          <td class="col-discount">
            <div class="discount-container">
              <input type="number" class="discount-input" value="${Number(discountVal).toFixed(0)}" min="0" max="100" />
              <button class="save-btn action-btn" data-id="${id}" title="Save changes">Save</button>
            </div>
          </td>

          <td class="col-status">
            <button class="status-btn btn-stock ${inStock ? 'active' : ''}" data-id="${id}" data-action="toggle-stock">
              ${inStock ? 'In Stock' : 'Out'}
            </button>
          </td>

          <td class="col-best">
            <button class="status-btn btn-seller ${isBestSeller ? 'active' : ''}" data-id="${id}" data-action="toggle-seller">
              ${isBestSeller ? 'Best Seller' : 'Standard'}
            </button>
          </td>

          <td class="col-actions actions-cell">
            <button class="action-btn btn-delete" data-id="${id}" title="Delete">🗑️</button>
          </td>
        </tr>
        `;
    }).join('');
}

async function applyDiscount(id, val) {
    try {
        const payload = { discount: Number(val) };
        const res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}/discount`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `Status ${res.status}`);
        }
        await loadProducts();
    } catch (err) {
        console.error('applyDiscount error:', err);
        alert('Failed to save discount.');
    }
}

async function toggleStock(id, status) {
    try {
        const payload = { inStock: !!status };
        const res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}/stock`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `Status ${res.status}`);
        }
        await loadProducts();
    } catch (err) {
        console.error('toggleStock error:', err);
        alert('Failed to toggle stock.');
    }
}

// Add/replace with this: Toggle Best Seller flag (uses /best-seller endpoint)
async function toggleBestSeller(id, status) {
    try {
        const payload = { isBestSeller: !!status };

        // try hyphen route first, fallback to non-hyphen if 404
        let res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}/best-seller`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.status === 404) {
            res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}/bestseller`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `Status ${res.status}`);
        }

        await loadProducts();
    } catch (err) {
        console.error('toggleBestSeller error:', err);
        alert('Failed to update Best Seller status.');
    }
}

async function deleteProduct(id) {
    try {
        const res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `Status ${res.status}`);
        }
        await loadProducts();
    } catch (err) {
        console.error('deleteProduct error:', err);
        alert('Failed to delete product.');
    }
}

// --- ORDERS & MESSAGES ---
async function loadOrders() {
    try {
        const tbody = document.getElementById('adminOrderTable');
        if (!tbody) return;
        const res = await fetch(`${API_URL}/orders`);
        if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);
        const orders = await res.json();
        tbody.innerHTML = (orders || []).map(o => {
            const customer = escapeHtml(o.customerName ?? o.CustomerName ?? '');
            const address = escapeHtml(o.deliveryAddress ?? o.DeliveryAddress ?? '');
            const items = (o.items ?? o.Items ?? []).map(i => escapeHtml(i.productName ?? i.ProductName ?? i.name ?? i.Name)).join(', ') || 'N/A';
            const total = Number(o.totalAmount ?? o.TotalAmount ?? 0).toFixed(2);
            const method = escapeHtml(o.paymentMethod ?? o.PaymentMethod ?? '');
            const status = escapeHtml(o.paymentStatus ?? o.PaymentStatus ?? '');
            return `<tr>
                <td>${customer}</td>
                <td>${address}</td>
                <td>${items}</td>
                <td>₱${total}</td>
                <td>${method}</td>
                <td>${status}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('loadOrders error:', err);
        alert('Unable to load orders.');
    }
}

async function loadMessages() {
    try {
        const tbody = document.getElementById('adminMessageTable');
        if (!tbody) return;
        const res = await fetch(`${API_URL}/contact/messages`);
        if (!res.ok) throw new Error(`Failed to fetch messages (${res.status})`);
        const msgs = await res.json();
        tbody.innerHTML = (msgs || []).map(m => {
            const date = new Date(m.createdAt ?? m.CreatedAt ?? Date.now()).toLocaleDateString();
            return `<tr>
                <td>${escapeHtml(date)}</td>
                <td>${escapeHtml(m.name ?? m.Name ?? '')}</td>
                <td>${escapeHtml(m.email ?? m.Email ?? '')}</td>
                <td>${escapeHtml(m.message ?? m.Message ?? '')}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('loadMessages error:', err);
        alert('Unable to load messages.');
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}