const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";
const AGENT_WHATSAPP = "258840000000"; 

mongoose.connect(MONGO_URI).then(() => console.log("✅ MarchaFácil: Systems Online"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'marchafacil_vault_2026', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ DATA SCHEMAS
// =============================================================
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    name: String,
    passcode: String,
    balance: { type: Number, default: 0 }, 
    lockedPrincipal: { type: Number, default: 0 }, 
    isAdmin: { type: Boolean, default: false },
    pendingDeposit: { amount: Number, status: { type: String, default: "None" }, phone: String, date: Date }
});
const User = mongoose.model('User', userSchema);

const loanSchema = new mongoose.Schema({
    borrowerName: String,
    borrowerId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    status: { type: String, default: 'Pending' } // Pending, Approved
});
const Loan = mongoose.model('Loan', loanSchema);

// =============================================================
// ✅ COINBASE-STYLE CSS
// =============================================================
const css = `
:root { 
    --primary: #0052ff; --success: #05d182; --bg: #ffffff; 
    --surface: #f4f7f9; --text: #0a192f; --muted: #5b616e;
}
* { box-sizing: border-box; font-family: -apple-system, sans-serif; }
body { background: var(--bg); color: var(--text); margin: 0; padding-bottom: 100px; }
.container { padding: 20px; max-width: 500px; margin: 0 auto; }

.balance-hero { padding: 40px 0 20px; border-bottom: 1px solid #f0f0f0; margin-bottom: 20px; }
.balance-hero small { color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 12px; }
.balance-hero h1 { font-size: 44px; margin: 8px 0; font-weight: 700; letter-spacing: -1px; }

.card { background: var(--surface); padding: 20px; border-radius: 24px; margin-bottom: 15px; }
input { width: 100%; padding: 16px; background: #fff; border: 1px solid #eef2f8; border-radius: 14px; margin-bottom: 12px; font-size: 16px; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; border-radius: 50px; color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; }

.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #eee; }
.nav-item { text-align: center; color: var(--muted); text-decoration: none; font-size: 11px; }
.nav-item i { display: block; font-size: 22px; margin-bottom: 4px; }
.nav-item.active { color: var(--primary); }
`;

// =============================================================
// ✅ AUTHENTICATION (Sign Up & Login)
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; height:100vh;"><div class="container">
        <h1 style="color:var(--primary); text-align:center; font-weight:800;">MarchaFácil</h1>
        <div class="card">
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email" required>
                <input type="password" name="passcode" placeholder="PIN" required>
                <button>Sign In</button>
            </form>
            <p style="text-align:center; margin-top:15px; font-size:14px;">New here? <a href="/signup" style="color:var(--primary); text-decoration:none; font-weight:600;">Create Account</a></p>
        </div>
    </div></body></html>`);
});

app.get('/signup', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; height:100vh;"><div class="container">
        <h2>Join MarchaFácil</h2>
        <div class="card"><form action="/signup" method="POST">
            <input type="text" name="name" placeholder="Full Name" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="Create PIN" required>
            <button>Register</button>
        </form></div>
    </div></body></html>`);
});

app.post('/signup', async (req, res) => {
    try {
        const u = new User(req.body);
        await u.save();
        req.session.userId = u._id;
        res.redirect('/dashboard');
    } catch (e) { res.send("Error: Email already in use."); }
});

app.post('/login', async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase(), passcode: req.body.passcode });
    if (u) { 
        req.session.userId = u._id; 
        return u.isAdmin ? res.redirect('/admin') : res.redirect('/dashboard'); 
    }
    res.send("Invalid Login.");
});

// =============================================================
// ✅ USER DASHBOARD
// =============================================================

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const total = u.balance + u.lockedPrincipal;

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"><style>${css}</style></head>
    <body><div class="container">
        <div class="balance-hero">
            <small>Total Assets</small>
            <h1>${total.toLocaleString()} MT</h1>
            <div style="color:var(--success); font-weight:700; font-size:14px;"><i class="fas fa-arrow-up"></i> 5.00% (Monthly Yield)</div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
            <div class="card" style="margin:0;"><small>Profit</small><br><b>${u.balance} MT</b></div>
            <div class="card" style="margin:0;"><small>Locked</small><br><b>${u.lockedPrincipal} MT</b></div>
        </div>

        <div class="card" style="background:var(--primary); color:white;">
            <h3 style="margin-top:0;">Invest via M-Pesa</h3>
            <form action="/deposit" method="POST">
                <input type="number" name="amount" placeholder="Amount (MT)" required>
                <input type="text" name="phone" placeholder="84 / 85 Number" required>
                <button style="background:white; color:var(--primary);">Add Funds</button>
            </form>
        </div>
    </div>
    <div class="bottom-nav">
        <a href="/dashboard" class="nav-item active"><i class="fas fa-home"></i>Home</a>
        <a href="#" class="nav-item"><i class="fas fa-chart-pie"></i>Portfolio</a>
        <a href="#" class="nav-item"><i class="fas fa-wallet"></i>Pay</a>
        <a href="/logout" class="nav-item"><i class="fas fa-sign-out-alt"></i>Exit</a>
    </div>
    </body></html>`);
});

// =============================================================
// ✅ ADMIN PANEL (Approvals)
// =============================================================

app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u || !u.isAdmin) return res.send("Access Denied");

    const pendings = await User.find({ "pendingDeposit.status": "Pending" });

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body><div class="container">
        <h2 style="letter-spacing:-1px;">Admin Approvals</h2>
        <p style="color:var(--muted);">Review M-Pesa deposits below.</p>
        
        ${pendings.length === 0 ? '<p>No pending deposits.</p>' : pendings.map(p => `
            <div class="card">
                <b>User:</b> ${p.name}<br>
                <b>Amount:</b> ${p.pendingDeposit.amount} MT<br>
                <b>Phone:</b> ${p.pendingDeposit.phone}<br>
                <form action="/approve-deposit" method="POST" style="margin-top:15px;">
                    <input type="hidden" name="userId" value="${p._id}">
                    <button style="background:var(--success);">Confirm M-Pesa Received</button>
                </form>
            </div>
        `).join('')}

        <button onclick="window.location='/logout'" style="background:none; color:var(--text); border:1px solid #ddd; margin-top:20px;">Logout Admin</button>
    </div></body></html>`);
});

// =============================================================
// ✅ ACTIONS
// =============================================================

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), phone: req.body.phone, status: "Pending", date: new Date() } 
    });
    res.send("<script>alert('Deposit request sent. Wait for admin approval.'); window.location='/dashboard';</script>");
});

app.post('/approve-deposit', async (req, res) => {
    const user = await User.findById(req.body.userId);
    if (user) {
        user.balance += user.pendingDeposit.amount;
        user.pendingDeposit.status = "Completed";
        await user.save();
    }
    res.redirect('/admin');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.listen(3000, () => console.log("🚀 MarchaFácil Live"));
