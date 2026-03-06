const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION & BRANDING
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";
const ADMIN_PHONE = "258855917810"; 
const WHATSAPP_LINK = `https://wa.me/${ADMIN_PHONE}`;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MarchaFácil Connected"))
    .catch(err => console.error("❌ Database Error:", err));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({ secret: 'marchafacil_secure_88', resave: false, saveUninitialized: true }));

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
        lastPayout: Date, 
        expiryDate: Date 
    }],
    activeLoans: [{ 
        assetType: String, 
        amountBorrowed: Number, 
        repaymentAmount: Number, 
        dueDate: Date, 
        status: { type: String, default: "Active" } 
    }],
    pendingDeposit: { amount: Number, method: String, status: String, date: Date },
    transactions: [{ type: { type: String }, amount: Number, date: String }]
});
const User = mongoose.model('User', userSchema);

// =============================================================
// ✅ UI STYLES
// =============================================================
const css = `
* { box-sizing: border-box; font-family: 'Inter', sans-serif; } 
body { background: #000; color: white; margin: 0; padding-bottom: 60px; } 
.container { padding: 20px; max-width: 480px; margin: 0 auto; } 
.card { background: #11141a; padding: 20px; border-radius: 15px; border: 1px solid #1c2026; margin-bottom: 15px; } 
.balance-card { background: linear-gradient(135deg, #00c853 0%, #007e33 100%); border-radius: 20px; padding: 25px; margin-bottom: 25px; text-align: center; } 
.loan-card { border: 1px solid #ffbb33; background: #1a1500; }
.admin-card { border: 1px solid #ff4444; background: #1a0000; }
input, select { width: 100%; padding: 14px; margin: 8px 0; background: #0b0e11; border: 1px solid #2a2f38; color: white; border-radius: 10px; }
button { width: 100%; padding: 16px; background: #00c853; border: none; font-weight: 700; color: white; border-radius: 12px; cursor: pointer; } 
.btn-pawn { background: #ffbb33; color: black; }
.btn-admin { background: #ff4444; margin-top: 5px; font-size: 12px; padding: 10px; }
`;

// =============================================================
// ✅ USER ROUTES (Dashboard & Deposits)
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; justify-content:center; height:100vh;">
    <div class="container" style="text-align:center;">
        <h1 style="color:#00c853;">MARCHAFÁCIL</h1>
        <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="Passcode" required>
            <button>Login / Entrar</button>
        </form>
    </div></body></html>`);
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (user && user.passcode === req.body.passcode) {
        req.session.userId = user._id;
        return user.isAdmin ? res.redirect('/admin') : res.redirect('/dashboard');
    }
    res.send("Invalid credentials. <a href='/'>Back</a>");
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    let locked = 0; u.investments.forEach(inv => locked += inv.capital);

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="balance-card">
            <small>Saldo Disponível</small>
            <div style="font-size:35px; font-weight:800;">$${u.balance.toFixed(2)}</div>
            <div style="font-size:12px; opacity:0.8;">Locked Savings: $${locked.toFixed(2)}</div>
        </div>

        <div class="card">
            <h3>Deposit / Depósito</h3>
            <form action="/deposit" method="POST">
                <input type="number" name="amount" placeholder="Amount ($)" required>
                <select name="method">
                    <option value="Mpesa">M-Pesa (+258 855 917 810)</option>
                    <option value="Bank">Bank Transfer (Capitek)</option>
                </select>
                <button>Initiate Deposit</button>
            </form>
        </div>

        <div class="card loan-card">
            <h3>Pawn / SMS Loan (25% Int.)</h3>
            <p style="font-size:11px;">Term: 14 Days repayment</p>
            <select id="assetType">
                <option value="iPhone">iPhone</option><option value="Car">Car</option>
                <option value="House">House</option><option value="SMS">SMS Loan</option>
            </select>
            <input type="number" id="loanAmount" placeholder="Amount ($)">
            <button type="button" class="btn-pawn" onclick="requestLoan()">Request Quick Cash</button>
        </div>
    </div>
    <script>
        function requestLoan() {
            const amt = document.getElementById('loanAmount').value;
            const item = document.getElementById('assetType').value;
            const total = (amt * 1.25).toFixed(2);
            const msg = "MARCHAFÁCIL: I want to pawn my " + item + " for $" + amt + ". Total to pay back in 14 days: $" + total;
            window.location.href = "${WHATSAPP_LINK}?text=" + encodeURIComponent(msg);
        }
    </script></body></html>`);
});

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, {
        pendingDeposit: { amount: req.body.amount, method: req.body.method, status: "Pending", date: new Date() }
    });
    res.redirect('/pay-now');
});

app.get('/pay-now', async (req, res) => {
    const u = await User.findById(req.session.userId);
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container" style="text-align:center;">
        <h2>Complete Payment</h2>
        <div class="card">
            <p>Method: <b>${u.pendingDeposit.method}</b></p>
            <p>Amount: <b>$${u.pendingDeposit.amount}</b></p>
            <p>${u.pendingDeposit.method === 'Mpesa' ? 'Transfer to: +258 855 917 810' : 'Capitek Acc: 1882242481'}</p>
        </div>
        <button onclick="window.location.href='${WHATSAPP_LINK}'" style="background:#25D366">Send Proof (WhatsApp)</button>
    </div></body></html>`);
});

// =============================================================
// ✅ ADMIN PANEL (Confirmations)
// =============================================================

app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u || !u.isAdmin) return res.send("Unauthorized. Log in as admin.");
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <h2 style="color:#ff4444;">Admin Panel</h2>
        <h3>Pending Deposits</h3>
        ${pendings.length === 0 ? '<p>No pending deposits</p>' : pendings.map(p => `
            <div class="card admin-card">
                <b>User: ${p.email}</b><br>
                $${p.pendingDeposit.amount} via ${p.pendingDeposit.method}
                <form action="/admin/confirm-dep" method="POST">
                    <input type="hidden" name="uid" value="${p._id}">
                    <button class="btn-admin">Confirm & Start 1-Year Lock (5%)</button>
                </form>
            </div>
        `).join('')}
        <a href="/dashboard" style="color:white; display:block; margin-top:20px;">Return to User Dashboard</a>
    </div></body></html>`);
});

app.post('/admin/confirm-dep', async (req, res) => {
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit) {
        const amt = u.pendingDeposit.amount;
        const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 1);
        u.investments.push({ capital: amt, monthlyProfit: amt * 0.05, lastPayout: new Date(), expiryDate: expiry });
        u.transactions.push({ type: "Investment Confirmed", amount: amt, date: new Date().toLocaleDateString() });
        u.pendingDeposit.status = "Confirmed";
        await u.save();
    }
    res.redirect('/admin');
});

// =============================================================
// ✅ SYSTEM MONITORING
// =============================================================
process.on('uncaughtException', (err) => {
    console.error(`!!! CRITICAL ALERT: SERVER CRASH !!! Notify: ${ADMIN_PHONE}`);
    process.exit(1);
});

app.listen(3000, () => console.log("🚀 MarchaFácil Live on 3000"));
