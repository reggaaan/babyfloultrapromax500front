document.addEventListener('DOMContentLoaded', () => {
    populateCheckoutForm();
    setupPaymentToggles();
});

function getAndMigrateProfile() {
    // prefer sessionStorage for ephemeral auth; migrate legacy localStorage if present
    const lsEmail = localStorage.getItem('customerEmail');
    const lsName = localStorage.getItem('customerName');

    const ssEmail = sessionStorage.getItem('customerEmail');
    const ssName = sessionStorage.getItem('customerName');

    if (!ssEmail && lsEmail) {
        sessionStorage.setItem('customerEmail', lsEmail);
        localStorage.removeItem('customerEmail');
    }
    if (!ssName && lsName) {
        sessionStorage.setItem('customerName', lsName);
        localStorage.removeItem('customerName');
    }

    return {
        email: sessionStorage.getItem('customerEmail'),
        name: sessionStorage.getItem('customerName')
    };
}

function populateCheckoutForm() {
    const profile = getAndMigrateProfile();
    if (!profile.email) {
        alert("Please log in to your customer account to complete payment.");
        window.location.href = 'login.html';
        return;
    }

    const nameEl = document.getElementById('checkoutName');
    const addressEl = document.getElementById('checkoutAddress');

    if (nameEl) nameEl.value = profile.name || '';
    // Attempt to fill address from sessionStorage first
    if (addressEl) {
        const savedAddress = sessionStorage.getItem('customerAddress') || localStorage.getItem('customerAddress') || '';
        addressEl.value = savedAddress;
    }

    console.log(`Loading checkout gateway parameters for: ${profile.email}`);
}

function setupPaymentToggles() {
    const radios = document.querySelectorAll('input[name="paymentMethod"]');
    const qrContainer = document.getElementById('paymentQr');
    const refInput = document.getElementById('paymentRef');

    if (!radios || !qrContainer) return;

    function showFor(method) {
        qrContainer.innerHTML = '';
        refInput && (refInput.placeholder = 'Enter 13-digit Reference Number');

        const img = document.createElement('img');
        img.alt = `${method} QR`;
        img.style.maxWidth = '220px';
        img.style.display = 'block';
        img.style.margin = '8px 0';

        if (method === 'GCash') {
            img.src = 'assets/mock-qrcodes/gcash-qr.png';
        } else if (method === 'Maya') {
            img.src = 'assets/mock-qrcodes/maya-qr.png';
        } else {
            // COD: hide QR & reference
            img = null;
            qrContainer.innerText = 'Cash on Delivery selected — no QR required.';
            refInput && (refInput.placeholder = 'Optional for COD');
            return;
        }

        qrContainer.appendChild(img);
    }

    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            showFor(e.target.value);
        });
        if (r.checked) showFor(r.value);
    });
}