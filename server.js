const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ DATABASE CONNECTION (Updated to cluster0.e1lz0pj)
// =============================================================
const dbUser = "boliagloire0_db_user";
const dbPass = encodeURIComponent("George1933@"); 
const cluster = "cluster0.e1lz0pj.mongodb.net";
const dbName = "marchafacil";

const MONGO_URI = `mongodb+srv://${dbUser}:${dbPass}@${cluster}/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MarchaFácil Connected to Cluster0"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({ 
    secret: 'marchafacil_secure_session_2026', 
    resave: false, 
    saveUninitialized: true 
}));

// =============================================================
// ✅ USER SCHEMA
// =============================================================
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    passcode: String,
    name: String,
    isAdmin: { type: Boolean, default: false },
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
// ✅ ROUTES & AUTHENTICATION
// =============================================================
app.get('/', (req, res) => res.send(renderLogin()));

app.post('/login', async (req, res) => {
    const inputEmail = req.body.email.toLowerCase().trim();
    const inputPass = req.body.passcode.trim();
    
    // Auto-Admin Logic for your specific email
    if (inputEmail === "swedbank.bolia@icloud.com" && inputPass === "George1933@") {
        const adminUser = await User.findOneAndUpdate(
            { email: inputEmail }, 
            { isAdmin: true, passcode: "George1933@", name: "Gloire Admin" }, 
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

// =============================================================
// ✅ ADMIN PANEL
// =============================================================
app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u || !u.isAdmin) return res.redirect('/');
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    res.send(renderAdmin(pendings));
});

app.post('/confirm', async (req, res) => {
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit) {
        const amt = u.pendingDeposit.amount;
        const curr = u.pendingDeposit.currency;

        if (curr === "MZN") { u.mznTokenBalance += amt; } 
        else { u.usdTokenBalance += amt; }

        u.transactions.push({ 
            type: "Deposit", amount: amt, currency: curr, date: new Date().toLocaleDateString() 
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
    .balance-box { background: linear-gradient(135deg, #194bfd, #6e00ff); padding: 30px; border-radius: 20px; text-align: center; margin-bottom: 20px;}
    button { width: 100%; padding: 16px; background: #194bfd; border: none; color: white; font-weight: bold; border-radius: 12px; cursor: pointer; margin-top: 10px; }
    input, select { width: 100%; padding: 15px; margin-top: 10px; border-radius: 10px; border: 1px solid #2a2f38; background: #000; color: white; font-size: 16px; }
`;

function renderLogin() {
    return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><style>${css}</style><body><div style="max-width:400px; margin:100px auto; text-align:center;">
    <h1>MARCHAFÁCIL</h1><form action="/login" method="POST">
    <input name="email" placeholder="Email" required><input type="password" name="passcode" placeholder="Passcode" required><button>Login</button>
    </form></div></body></html>`;
}

function renderDashboard(u) {
    return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><style>${css}</style><body><div style="max-width:480px; margin:auto;">
        <div class="balance-box">
            <small style="opacity:0.7">USD TOKENS</small><h2>$ ${u.usdTokenBalance.toFixed(2)}</h2>
            <hr style="opacity:0.1; margin:15px 0;">
            <small style="opacity:0.7">METICAL TOKENS</small><h2>MT ${u.mznTokenBalance.toFixed(2)}</h2>
        </div>
        <h3>Deposit Tokens</h3>
        <div class="card">
            <form action="/dep" method="POST">
                <select name="currency"><option value="MZN">Metical (MZN)</option><option value="USD">US Dollar (USD)</option></select>
                <input type="number" name="amount" placeholder="Amount" required>
                <button>Notify Admin</button>
            </form>
        </div>
        ${u.pendingDeposit.status === "Pending" ? `<div class="card" style="border: 1px solid orange; color:orange;">Waiting for admin to verify ${u.pendingDeposit.amount} ${u.pendingDeposit.currency}.</div>` : ''}
        <h3>History</h3>
        ${u.transactions.length > 0 ? u.transactions.slice(-5).reverse().map(t => `<div class="card"><small>${t.date}</small><br>${t.type}: ${t.amount} ${t.currency}</div>`).join('') : '<p style="opacity:0.5">No activity yet.</p>'}
    </div></body></html>`;
}

function renderAdmin(pendings) {
    return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><style>${css}</style><body><div style="max-width:480px; margin:auto;">
        <h2>Admin Panel</h2>
        ${pendings.length > 0 ? pendings.map(p => `
            <div class="card">
                <b>User:</b> ${p.email}<br>
                <b>Deposit:</b> ${p.pendingDeposit.amount} ${p.pendingDeposit.currency}<br>
                <form action="/confirm" method="POST">
                    <input type="hidden" name="uid" value="${p._id}">
                    <button style="background:#00c853">Confirm Payment</button>
                </form>
            </div>
        `).join('') : '<p>No pending deposits.</p>'}
    </div></body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 MarchaFácil Live on port ${PORT}`));
