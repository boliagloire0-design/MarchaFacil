const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ DATABASE CONNECTION
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/blezzypay?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MarchaFácil Connected"))
    .catch(err => console.error("❌ Database Error:", err));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({ secret: 'marchafacil_99_key', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ UPDATED USER SCHEMA (Dual Wallet)
// =============================================================
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    passcode: String,
    name: String,
    phone: String,
    isAdmin: { type: Boolean, default: false },
    // Separate Token Wallets
    mznTokenBalance: { type: Number, default: 0 }, 
    usdTokenBalance: { type: Number, default: 0 },
    pendingDeposit: { 
        amount: Number, 
        currency: { type: String, enum: ['USD', 'MZN'] }, 
        status: { type: String, default: "None" } 
    },
    transactions: [{ type: { type: String }, amount: Number, currency: String, date: String }]
});
const User = mongoose.model('User', userSchema);

// =============================================================
// ✅ ROUTES
// =============================================================

app.get('/', (req, res) => res.send(renderLogin()));

app.post('/login', async (req, res) => {
    const inputEmail = req.body.email.toLowerCase().trim();
    const inputPass = req.body.passcode.trim();
    
    // Auto-Admin Logic
    if (inputEmail === "swedbank.bolia@icloud.com") {
        const adminUser = await User.findOneAndUpdate(
            { email: inputEmail }, 
            { isAdmin: true, passcode: "George1933@" }, 
            { new: true, upsert: true }
        );
        req.session.userId = adminUser._id;
        return res.redirect('/admin');
    }

    const user = await User.findOne({ email: inputEmail });
    if (user && user.passcode === inputPass) {
        req.session.userId = user._id;
        return res.redirect(user.isAdmin ? '/admin' : '/dashboard');
    }
    res.send('Invalid Credentials. <a href="/">Try Again</a>');
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    res.send(renderDashboard(u));
});

// --- DEPOSIT REQUEST ---
app.post('/dep', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, {
        pendingDeposit: { 
            amount: parseFloat(req.body.amount), 
            currency: req.body.currency, 
            status: "Pending" 
        }
    });
    res.redirect('/dashboard');
});

// --- ADMIN PANEL ---
app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u || !u.isAdmin) return res.redirect('/');
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    res.send(renderAdmin(pendings));
});

// --- ADMIN APPROVAL (The Token Credit Logic) ---
app.post('/confirm', async (req, res) => {
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit) {
        const amt = u.pendingDeposit.amount;
        const curr = u.pendingDeposit.currency;

        // Credit the specific token wallet
        if (curr === "MZN") { u.mznTokenBalance += amt; } 
        else { u.usdTokenBalance += amt; }

        u.transactions.push({ 
            type: "Deposit", 
            amount: amt, 
            currency: curr, 
            date: new Date().toLocaleDateString() 
        });
        
        u.pendingDeposit.status = "Completed";
        await u.save();
    }
    res.redirect('/admin');
});

// =============================================================
// ✅ UI COMPONENTS
// =============================================================
const css = `
    body { background: #0b0e11; color: white; font-family: sans-serif; margin: 0; padding: 20px; }
    .card { background: #1c2026; padding: 20px; border-radius: 15px; margin-bottom: 15px; border: 1px solid #2a2f38; }
    .balance-box { background: linear-gradient(135deg, #194bfd, #6e00ff); padding: 25px; border-radius: 20px; text-align: center; }
    button { width: 100%; padding: 15px; background: #194bfd; border: none; color: white; font-weight: bold; border-radius: 10px; cursor: pointer; margin-top: 10px; }
    input, select { width: 100%; padding: 15px; margin-top: 10px; border-radius: 10px; border: 1px solid #2a2f38; background: #000; color: white; }
`;

function renderLogin() {
    return `<html><style>${css}</style><body><div style="max-width:400px; margin:auto; text-align:center;">
    <h1>MARCHAFÁCIL</h1><form action="/login" method="POST">
    <input name="email" placeholder="Email"><input type="password" name="passcode" placeholder="Passcode"><button>Login</button>
    </form></div></body></html>`;
}

function renderDashboard(u) {
    return `<html><style>${css}</style><body><div style="max-width:480px; margin:auto;">
        <div class="balance-box">
            <small>USD TOKENS</small><h2>$ ${u.usdTokenBalance.toFixed(2)}</h2>
            <hr style="opacity:0.2">
            <small>MZN TOKENS</small><h2>MT ${u.mznTokenBalance.toFixed(2)}</h2>
        </div>
        
        <h3>Deposit Funds</h3>
        <div class="card">
            <form action="/dep" method="POST">
                <select name="currency"><option value="MZN">Metical (MZN)</option><option value="USD">US Dollar (USD)</option></select>
                <input type="number" name="amount" placeholder="Enter Amount" required>
                <button>Notify Admin</button>
            </form>
        </div>

        ${u.pendingDeposit.status === "Pending" ? `<div class="card" style="border-color:orange">Deposit of ${u.pendingDeposit.amount} ${u.pendingDeposit.currency} is waiting for approval.</div>` : ''}

        <h3>History</h3>
        ${u.transactions.slice(-5).reverse().map(t => `<div class="card"><small>${t.date}</small><br>${t.type}: ${t.amount} ${t.currency}</div>`).join('')}
    </div></body></html>`;
}

function renderAdmin(pendings) {
    return `<html><style>${css}</style><body><div style="max-width:480px; margin:auto;">
        <h2>Admin Approval</h2>
        ${pendings.map(p => `
            <div class="card">
                <b>User:</b> ${p.email}<br>
                <b>Amount:</b> ${p.pendingDeposit.amount} ${p.pendingDeposit.currency}<br>
                <form action="/confirm" method="POST">
                    <input type="hidden" name="uid" value="${p._id}">
                    <button style="background:#00c853">Credit ${p.pendingDeposit.currency} Tokens</button>
                </form>
            </div>
        `).join('')}
    </div></body></html>`;
}

app.listen(3000, () => console.log("🚀 MarchaFácil Live"));
