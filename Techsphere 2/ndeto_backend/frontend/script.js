// ========== GLOBAL STATE ==========
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let cart = [];
let currentView = 'home';
let trackedOrderId = null;

// ========== API HELPER ==========
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(authToken && { 'x-auth-token': authToken })
    };
    // CHANGE THIS LINE to point to your PHP backend
    const response = await fetch(`http://localhost/ndeto-backend/api${url}`, { ...options, headers });
    // ... rest unchanged
}

// ========== LOAD PRODUCTS FROM BACKEND ==========
async function loadProducts() {
    try {
        const products = await apiFetch('/products');
        window.products = products;
        renderProducts();
        renderTestimonials(); // static testimonials remain
    } catch (err) {
        console.error('Failed to load products', err);
    }
}

// ========== CART (Server‑side) ==========
async function loadCartFromServer() {
    if (!currentUser) return [];
    try {
        const items = await apiFetch('/cart');
        cart = items;
        renderCart();
        updateCartCount();
    } catch (err) {
        console.error('Failed to load cart', err);
    }
}

async function saveCartToServer(items) {
    if (!currentUser) return;
    try {
        await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ items }) });
    } catch (err) {
        console.error('Failed to save cart', err);
    }
}

function updateCartCount() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('cartCount').innerText = count;
}

async function addToCart(id) {
    const p = window.products.find(p => p.id === id);
    const existing = cart.find(i => i.id === id);
    if (existing) existing.quantity++;
    else cart.push({ ...p, quantity: 1 });
    await saveCartToServer(cart);
    updateCartCount();
    const badge = document.getElementById('cartCount');
    badge.style.transform = 'scale(1.5)';
    setTimeout(() => badge.style.transform = '', 200);
}

async function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    await saveCartToServer(cart);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    let total = 0;
    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>Your cart is empty.</p>";
        document.getElementById('cartTotal').innerText = "0";
        return;
    }
    container.innerHTML = cart.map(item => {
        total += item.price * item.quantity;
        return `<div class="cart-item glass-panel" style="margin-bottom:15px;">
            <div style="display:flex; gap:15px;">
                <img src="${item.image}" width="50" height="50" style="border-radius:10px;">
                <div><strong>${item.name}</strong><br><small>KES ${item.price} x ${item.quantity}</small></div>
            </div>
            <div><strong>KES ${(item.price * item.quantity).toLocaleString()}</strong>
            <button onclick="removeFromCart(${item.id})" style="background:rgba(255,0,0,0.1); border:none; padding:8px; border-radius:8px; margin-left:15px; color:#ff4444;"><i class="fas fa-trash"></i></button></div>
        </div>`;
    }).join('');
    document.getElementById('cartTotal').innerText = total.toLocaleString();
}

// ========== PRODUCT RENDERING ==========
function renderProducts(filter = 'all') {
    const feat = document.getElementById('featuredProducts');
    const allGrid = document.getElementById('allProducts');
    const catFilter = document.getElementById('categoryFilter');
    const active = filter !== 'all' ? filter : (catFilter ? catFilter.value : 'all');
    const filtered = active === 'all' ? window.products : window.products.filter(p => p.category === active);
    const html = filtered.map(p => `
        <div class="product-card glass-panel">
            <div class="product-img"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
            <div class="product-info">
                <h4>${p.name}</h4>
                <div style="color:gold; font-size:0.8rem;">${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5-Math.floor(p.rating))}</div>
                <div class="product-price">KES ${p.price.toLocaleString()}</div>
                <button class="btn-primary w-100" onclick="addToCart(${p.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
    if (feat && currentView === 'home') feat.innerHTML = html.slice(0, 6);
    if (allGrid && currentView === 'products') allGrid.innerHTML = html;
}

function filterCategory(cat) {
    navigateTo('products');
    const sel = document.getElementById('categoryFilter');
    if (sel) sel.value = cat;
    renderProducts(cat);
}

// ========== AUTHENTICATION ==========
async function handleAuth(e, isLogin) {
    e.preventDefault();
    const btn = document.querySelector(isLogin ? '#loginBtn' : '#signupBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-loader"></span> Processing...';
    btn.disabled = true;

    const email = isLogin ? document.getElementById('loginEmail').value : document.getElementById('signupEmail').value;
    const password = isLogin ? document.getElementById('loginPassword').value : document.getElementById('signupPassword').value;
    const name = isLogin ? null : document.getElementById('signupName').value;

    try {
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        const data = await apiFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        updateUserNameDisplay();
        await loadCartFromServer();
        showAuthSuccessModal(isLogin ? "Welcome back! Login successful." : "Account created! You're now logged in.");
        navigateTo('dashboard');
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function updateUserNameDisplay() {
    const span = document.getElementById('userNameDisplay');
    if (span) span.innerText = currentUser ? currentUser.name : "";
    const dashLink = document.getElementById('dashboardNavLink');
    if (dashLink) dashLink.style.display = currentUser ? "inline-block" : "none";
}

function handleUserClick() {
    if (currentUser) {
        if (confirm(`Logged in as ${currentUser.name}. Logout?`)) {
            currentUser = null;
            authToken = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            cart = [];
            updateUserNameDisplay();
            updateCartCount();
            navigateTo('home');
        }
    } else navigateTo('auth');
}

function toggleAuthForm() {
    const loginDiv = document.getElementById('loginFormContainer');
    const signupDiv = document.getElementById('signupFormContainer');
    const isLoginVisible = loginDiv.style.display !== 'none';
    loginDiv.style.display = isLoginVisible ? 'none' : 'block';
    signupDiv.style.display = isLoginVisible ? 'block' : 'none';
}

function showAuthSuccessModal(msg) {
    document.getElementById('authSuccessMessage').innerText = msg;
    document.getElementById('authSuccessModal').classList.add('active');
}

function closeAuthSuccessModal() {
    document.getElementById('authSuccessModal').classList.remove('active');
    navigateTo('dashboard');
}

// ========== CHECKOUT & ORDERS ==========
function updateCheckoutTotal() {
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    document.getElementById('checkoutTotal').innerText = total.toLocaleString();
}

async function processCheckout(e) {
    e.preventDefault();
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const location = document.getElementById('deliveryLocation').value;
    const mpesaPhone = document.getElementById('mpesaPhone').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    if (!name || !phone || !location) { alert("Please fill all details"); return; }
    if (paymentMethod === 'mpesa' && !mpesaPhone.match(/^(07|01|2547|2541)\d{8}$/)) { alert("Valid M-Pesa number required"); return; }
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (total === 0) { alert("Cart empty"); return; }

    const orderData = { items: cart, total, customerName: name, customerPhone: phone, deliveryLocation: location };
    try {
        const newOrder = await apiFetch('/orders', { method: 'POST', body: JSON.stringify(orderData) });
        cart = [];
        await saveCartToServer([]);
        if (paymentMethod === 'mpesa') showMpesaLoader(newOrder.orderId);
        else showSuccessModal(newOrder.orderId);
    } catch (err) {
        alert("Order failed: " + err.message);
    }
}

function showMpesaLoader(orderId) {
    const modal = document.getElementById('mpesaPreloader');
    modal.classList.add('active');
    setTimeout(() => {
        modal.classList.remove('active');
        showSuccessModal(orderId);
    }, 4000);
}

function showSuccessModal(orderId) {
    document.getElementById('finalOrderId').innerText = orderId;
    document.getElementById('successOrderModal').classList.add('active');
    playSuccessSound();
}

function closeSuccessModal() {
    document.getElementById('successOrderModal').classList.remove('active');
    navigateTo('tracking');
    document.getElementById('trackId').value = document.getElementById('finalOrderId').innerText;
    simulateTracking();
}

function playSuccessSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
        osc.stop(audioCtx.currentTime + 0.8);
    } catch(e) {}
}

// ========== TRACKING & RECEIPTS ==========
async function simulateTracking() {
    const id = document.getElementById('trackId').value;
    if (!id) { alert("Enter Order ID"); return; }
    // We can't fetch a single order easily – just show progress bar if any order matches
    const orders = await apiFetch('/orders');
    const order = orders.find(o => o.orderId === id);
    if (order) {
        trackedOrderId = order.orderId;
        document.getElementById('trackingResult').classList.remove('hidden');
    } else alert("Order not found");
}

function generateReceiptForTracked() {
    if (!trackedOrderId) { alert("No order tracked"); return; }
    // For simplicity, we re‑fetch orders and find the one
    apiFetch('/orders').then(orders => {
        const order = orders.find(o => o.orderId === trackedOrderId);
        if (order) showReceipt(order);
        else alert("Order details not found");
    }).catch(() => alert("Could not load order"));
}

function showReceipt(order) {
    const container = document.getElementById('receiptContent');
    const itemsHtml = order.items.map(i => `<div class="receipt-row"><span>${i.name} x ${i.quantity}</span><span>KES ${(i.price * i.quantity).toLocaleString()}</span></div>`).join('');
    const qrData = `Order ID: ${order.orderId}\nCustomer: ${order.customerName}\nPhone: ${order.customerPhone}\nDelivery: ${order.deliveryLocation}\nTotal: KES ${order.total.toLocaleString()}\nNDETO Techsphere`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
    container.innerHTML = `
        <div class="receipt-header"><h2><i class="fas fa-microchip"></i> NDETO Techsphere</h2><p>Official Tax Receipt</p></div>
        <div class="receipt-body">
            <div class="receipt-row"><strong>Order ID:</strong> <span>${order.orderId}</span></div>
            <div class="receipt-row"><strong>Date:</strong> <span>${new Date(order.date).toLocaleString()}</span></div>
            <div class="receipt-row"><strong>Customer:</strong> <span>${order.customerName}</span></div>
            <div class="receipt-row"><strong>Phone:</strong> <span>${order.customerPhone}</span></div>
            <div class="receipt-row"><strong>Delivery:</strong> <span>${order.deliveryLocation}</span></div>
            <hr><h3>Items Purchased</h3>${itemsHtml}
            <div class="receipt-row receipt-total"><strong>TOTAL:</strong> <strong>KES ${order.total.toLocaleString()}</strong></div>
            <div class="qr-container"><img src="${qrUrl}" width="150" height="150"><p>Scan to verify order</p></div>
            <button class="btn-primary print-btn w-100 print-hide" onclick="window.print();">🖨️ Print / Save as PDF</button>
            <button class="btn-primary mt-2 w-100 print-hide" onclick="document.getElementById('receiptModal').classList.remove('active');">Close</button>
        </div>
    `;
    document.getElementById('receiptModal').classList.add('active');
}

// ========== DASHBOARD ==========
async function renderDashboard() {
    const container = document.getElementById('dashboardContent');
    if (!currentUser) {
        container.innerHTML = "<div class='dashboard-card'><p>Please login to view your dashboard.</p><button class='btn-primary' onclick='navigateTo(\"auth\")'>Login / Sign Up</button></div>";
        return;
    }
    try {
        const orders = await apiFetch('/orders');
        const totalSpent = orders.reduce((s, o) => s + o.total, 0);
        const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s,i)=>s+i.quantity,0), 0);
        const recent = orders.slice(0,5);
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="avatar-large"><i class="fas fa-user-astronaut"></i></div>
                <h3>${currentUser.name}</h3>
                <p><i class="fas fa-envelope"></i> ${currentUser.email}</p>
                <p><i class="fas fa-calendar-alt"></i> Member since ${new Date(currentUser.memberSince).toLocaleDateString()}</p>
                <button class="btn-secondary mt-2" onclick="alert('Edit profile coming soon')">Edit Profile</button>
            </div>
            <div class="dashboard-card">
                <h3>Order Summary</h3>
                <div style="display:flex; justify-content:space-between; margin:20px 0;">
                    <div><div class="dashboard-stat">${orders.length}</div><div>Orders</div></div>
                    <div><div class="dashboard-stat">KES ${totalSpent.toLocaleString()}</div><div>Spent</div></div>
                    <div><div class="dashboard-stat">${totalItems}</div><div>Items</div></div>
                </div>
                <button class="btn-primary" onclick="navigateTo('products')">Shop More</button>
            </div>
            <div class="dashboard-card">
                <h3>Recent Orders</h3>
                ${recent.length === 0 ? '<p>No orders yet.</p>' : recent.map(o => `
                    <div style="background:rgba(0,0,0,0.2); border-radius:12px; padding:12px; margin-bottom:10px;">
                        <div><strong>${o.orderId}</strong><br><small>${new Date(o.date).toLocaleDateString()}</small></div>
                        <div>KES ${o.total.toLocaleString()}</div>
                        <button class="btn-secondary mt-2" onclick='showReceipt(${JSON.stringify(o).replace(/\\/g,'\\\\')})'>View Receipt</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        container.innerHTML = "<p>Failed to load orders.</p>";
    }
}

// ========== TESTIMONIALS (static) ==========
const testimonials = [
    { name: "Alex Mwangi", role: "Tech Enthusiast", text: "The NDETO Pro Earbuds are incredible! The sound quality is unmatched.", rating: 5, avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
    { name: "Wanjiku Kariuki", role: "Content Creator", text: "SpherePhone 14 changed my workflow. The camera is phenomenal.", rating: 5, avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
    { name: "Brian Odhiambo", role: "Gamer", text: "Gamer Headset V2 gives me a competitive edge.", rating: 5, avatar: "https://randomuser.me/api/portraits/men/45.jpg" },
    { name: "Cynthia Achieng", role: "Fitness Coach", text: "X-Pulse Smartwatch tracks everything accurately.", rating: 5, avatar: "https://randomuser.me/api/portraits/women/23.jpg" },
    { name: "James Otieno", role: "IT Professional", text: "FastCharge 65W Brick is a lifesaver.", rating: 5, avatar: "https://randomuser.me/api/portraits/men/91.jpg" },
    { name: "Lisa Wangari", role: "Music Producer", text: "Bass Boom Speaker delivers rich sound.", rating: 5, avatar: "https://randomuser.me/api/portraits/women/47.jpg" }
];

function renderTestimonials() {
    const container = document.getElementById('testimonialsGrid');
    if (container) {
        container.innerHTML = testimonials.map(t => `
            <div class="testimonial-card glass-panel">
                <img src="${t.avatar}" class="testimonial-avatar">
                <div class="testimonial-name">${t.name}</div>
                <div class="testimonial-role">${t.role}</div>
                <div class="testimonial-text">"${t.text}"</div>
                <div class="testimonial-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</div>
            </div>
        `).join('');
    }
}

// ========== NAVIGATION ==========
function navigateTo(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    currentView = view;
    if (view === 'products') renderProducts();
    if (view === 'cart') renderCart();
    if (view === 'checkout') updateCheckoutTotal();
    if (view === 'dashboard') renderDashboard();
    window.scrollTo({ top: 0 });
}

// ========== DARK MODE TOGGLE ==========
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'dark';
if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}
themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
});

// ========== SEARCH ==========
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = window.products.filter(p => p.name.toLowerCase().includes(term) || p.category.includes(term));
    if (currentView === 'home') {
        const featGrid = document.getElementById('featuredProducts');
        if (featGrid) featGrid.innerHTML = filtered.slice(0,6).map(p => `
            <div class="product-card glass-panel">
                <div class="product-img"><img src="${p.image}"></div>
                <div class="product-info">
                    <h4>${p.name}</h4>
                    <div class="product-price">KES ${p.price.toLocaleString()}</div>
                    <button class="btn-primary w-100" onclick="addToCart(${p.id})">Add to Cart</button>
                </div>
            </div>
        `).join('');
    } else if (currentView === 'products') {
        const allGrid = document.getElementById('allProducts');
        if (allGrid) allGrid.innerHTML = filtered.map(p => `
            <div class="product-card glass-panel">
                <div class="product-img"><img src="${p.image}"></div>
                <div class="product-info">
                    <h4>${p.name}</h4>
                    <div class="product-price">KES ${p.price.toLocaleString()}</div>
                    <button class="btn-primary w-100" onclick="addToCart(${p.id})">Add to Cart</button>
                </div>
            </div>
        `).join('');
    }
});

// ========== EVENT LISTENERS ==========
document.getElementById('checkoutForm')?.addEventListener('submit', processCheckout);
document.getElementById('loginFormElement')?.addEventListener('submit', (e) => handleAuth(e, true));
document.getElementById('signupFormElement')?.addEventListener('submit', (e) => handleAuth(e, false));

// ========== INITIALIZATION ==========
window.onload = async () => {
    await loadProducts();
    renderTestimonials();
    if (currentUser) {
        updateUserNameDisplay();
        await loadCartFromServer();
    }
    if (cart.length) renderCart();
    toggleAuthForm();
};