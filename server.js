const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION & BRANDING
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";
const ADMIN_PHONE = "27855917810"; // Updated to SA format example
const WHATSAPP_LINK = `https://wa.me/${ADMIN_PHONE}`;
const CURRENCY = "R"; 

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MarchaFácil System Online"))
    .catch(err => console.error("❌ DB Connection Failed:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'marchafacil_ultra_secure_2026', 
    resave: false, 
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour session
}));

// =============================================================
// ✅ DATA SCHEMA
// =============================================================
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    passcode: String,
    name: String,
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    investments: [{ 
        capital: Number, 
        monthlyProfit: Number, 
        expiryDate: Date 
    }],
    pendingDeposit: { amount: Number, method: String, status: String, date: Date },
    transactions: [{ type: { type: String }, amount: Number, date: String }]
});
const User = mongoose.model('User', userSchema);

// =============================================================
// ✅ UI STYLES (Modern Fintech Dark Theme)
// =============================================================
const css = `
:root { --primary: #00e676; --bg: #0a0c10; --card: #161b22; --text: #f0f6fc; --admin: #f85149; }
* { box-sizing: border-box; font-family: 'Segoe UI', Roboto, sans-serif; } 
body { background: var(--bg); color: var(--text); margin: 0; line-height: 1.6; } 
.container { padding: 20px; max-width: 450px; margin: 0 auto; } 
.card { background: var(--card); padding: 20px; border-radius: 16px; border: 1px solid #30363d; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); } 
.header { text-align: center; padding: 40px 0 20px; }
.logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: var(--primary); text-transform: uppercase; }
.balance-card { background: linear-gradient(135deg, #00c853 0%, #007e33 100%); color: white; border-radius: 24px; padding: 30px; text-align: center; margin-bottom: 30px; } 
.input-group { margin-bottom: 15px; }
label { display: block; font-size: 12px; margin-bottom: 5px; color: #8b949e; }
input, select { width: 100%; padding: 14px; background: #010409; border: 1px solid #30363d; color: white; border-radius: 8px; font-size: 16px; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; font-weight: 700; color: #000; border-radius: 12px; cursor: pointer; transition: 0.2s; font-size: 16px; } 
button:active { transform: scale(0.98); }
.btn-outline { background: transparent; border: 1px solid var(--primary); color: var(--primary); margin-top: 10px; }
.admin-badge { background: var(--admin); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; vertical-align: middle; margin-left: 5px; }
`;

// =============================================================
// ✅ AUTH ROUTES
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body>
    <div class="container">
        <div class="header">
            <div class="logo">MarchaFácil</div>
            <p style="color:#8b949e">Secure Digital Finance</p>
        </div>
        <div class="card">
            <form action="/login" method="POST">
                <div class="input-group">
                    <label>Email Address</label>
                    <input type="email" name="email" placeholder="name@example.com" required>
                </div>
                <div class="input-group">
                    <label>Secure Passcode</label>
                    <input type="password" name="passcode" placeholder="••••••" required>
                </div>
                <button type="submit">Access Dashboard</button>
            </form>
        </div>
        <p style="text-align:center; font-size:12px; color:#484f58;">Authorized Personnel Only</p>
    </div></body></html>`);
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (user && user.passcode === req.body.passcode) {
        req.session.userId = user._id;
        req.session.isAdmin = user.isAdmin;
        return user.isAdmin ? res.redirect('/admin') : res.redirect('/dashboard');
    }
    res.send("<script>alert('Invalid Credentials'); window.location='/';</script>");
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// =============================================================
// ✅ DASHBOARD
// =============================================================

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="balance-card">
            <small style="opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Available Balance</small>
            <div style="font-size:42px; font-weight:800; margin:10px 0;">${CURRENCY} ${u.balance.toLocaleString()}</div>
            <div style="font-size:12px; background:rgba(0,0,0,0.2); display:inline-block; padding:5px 15px; border-radius:20px;">
                Status: Verified Account
            </div>
        </div>

        <div class="card">
            <h3 style="margin-top:0">Add Funds</h3>
            <form action="/deposit" method="POST">
                <input type="number" name="amount" placeholder="Amount (${CURRENCY})" required style="margin-bottom:10px;">
                <select name="method" style="margin-bottom:15px;">
                    <option value="Mpesa">M-Pesa Express</option>
                    <option value="Bank">EFT Transfer (Capitec)</option>
                </select>
                <button>Generate Deposit Reference</button>
            </form>
        </div>

        <button class="btn-outline" onclick="window.location='/logout'">Secure Logout</button>
    </div></body></html>`);
});

// =============================================================
// ✅ ADMIN INTERFACE
// =============================================================

app.get('/admin', async (req, res) => {
    if (!req.session.userId || !req.session.isAdmin) return res.redirect('/');
    
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="header" style="padding-top:20px;">
            <div class="logo" style="color:var(--admin)">Admin Control <span class="admin-badge">SYSTEM</span></div>
        </div>

        <div class="card" style="border-color: var(--admin);">
            <h3 style="margin-top:0">Pending Approvals (${pendings.length})</h3>
            ${pendings.length === 0 ? '<p style="color:#8b949e">System clear. No pending tasks.</p>' : pendings.map(p => `
                <div style="padding:15px; border-bottom:1px solid #30363d; margin-bottom:10px;">
                    <div style="font-size:14px; font-weight:bold;">${p.email}</div>
                    <div style="color:var(--primary); font-size:18px; font-weight:800;">${CURRENCY} ${p.pendingDeposit.amount}</div>
                    <small style="color:#8b949e">Method: ${p.pendingDeposit.method}</small>
                    <form action="/admin/confirm-dep" method="POST" style="margin-top:10px;">
                        <input type="hidden" name="uid" value="${p._id}">
                        <button style="background:var(--admin); color:white; padding:10px; font-size:12px;">Approve & Credit Balance</button>
                    </form>
                </div>
            `).join('')}
        </div>
        
        <button class="btn-outline" onclick="window.location='/dashboard'" style="border-color:#8b949e; color:#8b949e;">View as User</button>
    </div></body></html>`);
});

app.post('/admin/confirm-dep', async (req, res) => {
    if (!req.session.isAdmin) return res.send("Denied");
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit.status === "Pending") {
        const amt = parseFloat(u.pendingDeposit.amount);
        u.balance += amt; // Add to liquid balance
        u.transactions.push({ type: "Deposit Confirmed", amount: amt, date: new Date().toLocaleDateString() });
        u.pendingDeposit.status = "Confirmed";
        await u.save();
    }
    res.redirect('/admin');
});

// =============================================================
// ✅ INITIALIZATION
// =============================================================
app.listen(3000, () => {
    console.log(`
    🚀 MARCHAFÁCIL SERVER LIVE
    --------------------------
    Local: http://localhost:3000
    Currency: ${CURRENCY}
    Admin Phone: ${ADMIN_PHONE}
    `);
});
