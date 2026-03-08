const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION
// =============================================================
const dbUser = "boliagloire0_db_user";
const dbPass = encodeURIComponent("George1933"); 
const MONGO_URI = `mongodb+srv://${dbUser}:${dbPass}@cluster0.e1lz0pj.mongodb.net/marchafacil?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MarchaFácil: Database Connected"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1); 
    });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'marchafacil_vault_2026', 
    resave: false, 
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS/Production SSL
}));

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
    pendingDeposit: { 
        amount: Number, 
        status: { type: String, default: "None" }, 
        phone: String, 
        date: Date 
    }
});
const User = mongoose.model('User', userSchema);

const loanSchema = new mongoose.Schema({
    borrowerName: String,
    borrowerId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    repaymentAmount: Number,
    interestRate: { type: Number, default: 0.35 }, 
    status: { type: String, default: 'Pending' }, 
    dueDate: Date,
    dateRequested: { type: Date, default: Date.now },
    dateSettled: Date
});
const Loan = mongoose.model('Loan', loanSchema);

// =============================================================
// ✅ CSS STYLING (Coinbase-Inspired)
// =============================================================
const css = `
:root { 
    --primary: #0052ff; --success: #05d182; --danger: #ff4a52; --bg: #ffffff; 
    --surface: #f4f7f9; --text: #0a192f; --muted: #5b616e;
}
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
body { background: var(--bg); color: var(--text); margin: 0; padding-bottom: 100px; }
.container { padding: 20px; max-width: 500px; margin: 0 auto; }
.balance-hero { padding: 40px 0 20px; text-align: center; border-bottom: 1px solid #f0f0f0; margin-bottom: 20px; }
.balance-hero h1 { font-size: 48px; margin: 8px 0; font-weight: 800; letter-spacing: -2px; }
.card { background: var(--surface); padding: 24px; border-radius: 24px; margin-bottom: 16px; border: 1px solid #eef2f8; }
input { width: 100%; padding: 16px; background: #fff; border: 1px solid #eef2f8; border-radius: 14px; margin-bottom: 12px; font-size: 16px; outline: none; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; border-radius: 50px; color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; transition: 0.2s; }
button:active { transform: scale(0.98); }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #eee; z-index: 100; }
.nav-item { text-align: center; color: var(--muted); text-decoration: none; font-size: 11px; font-weight: 600; }
.nav-item i { display: block; font-size: 22px; margin-bottom: 4px; }
.nav-item.active { color: var(--primary); }
`;

// =============================================================
// ✅ ROUTES & LOGIC
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; height:100vh;"><div class="container">
        <h1 style="color:var(--primary); text-align:center; font-size:32px; font-weight:900;">MarchaFácil</h1>
        <div class="card">
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email" required>
                <input type="password" name="passcode" placeholder="6-Digit PIN" required>
                <button>Sign In</button>
            </form>
            <p style="text-align:center; margin-top:20px; font-size:14px; color:var(--muted);">New here? <a href="/signup" style="color:var(--primary); text-decoration:none; font-weight:700;">Create Account</a></p>
        </div>
    </div></body></html>`);
});

app.get('/signup', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; height:100vh;"><div class="container">
        <h2>Join MarchaFácil</h2>
        <div class="card"><form action="/signup" method="POST">
            <input type="text" name="name" placeholder="Full Name" required>
            <input type="email" name="email" placeholder="Email Address" required>
            <input type="password" name="passcode" placeholder="Create PIN" required>
            <button>Get Started</button>
        </form></div>
    </div></body></html>`);
});

app.post('/signup', async (req, res) => {
    try {
        const u = new User(req.body);
        await u.save();
        req.session.userId = u._id;
        res.redirect('/dashboard');
    } catch (e) { res.send("Error: Email already exists."); }
});

app.post('/login', async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase(), passcode: req.body.passcode });
    if (u) { 
        req.session.userId = u._id; 
        return u.isAdmin ? res.redirect('/admin') : res.redirect('/dashboard'); 
    }
    res.send("Invalid Credentials.");
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const total = u.balance + u.lockedPrincipal;
    const activeLoan = await Loan.findOne({ borrowerId: req.session.userId, status: "Active" });

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"><style>${css}</style></head>
    <body><div class="container">
        <div class="balance-hero">
            <small style="color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:1px;">Total Assets</small>
            <h1>${total.toLocaleString()} MT</h1>
            <div style="color:var(--success); font-weight:700; font-size:14px;"><i class="fas fa-arrow-up"></i> +5.00% (Monthly APY)</div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
            <div class="card" style="margin:0; text-align:center;"><small>Available</small><br><b style="font-size:18px;">${u.balance.toLocaleString()} MT</b></div>
            <div class="card" style="margin:0; text-align:center;"><small>Locked</small><br><b style="font-size:18px;">${u.lockedPrincipal.toLocaleString()} MT</b></div>
        </div>

        <div class="card" style="background:#fff1f1; border:1px solid #ffdbdb;">
            <h3 style="margin-top:0; color:var(--danger);"><i class="fas fa-bolt"></i> Quick Loan</h3>
            <p style="font-size:13px; color:var(--muted);">Get instant credit up to 5,000 MT.</p>
            <form action="/request-loan" method="POST">
                <input type="number" name="amount" placeholder="Amount (MT)" required max="5000">
                <button style="background:var(--danger);">Request Instant Loan</button>
            </form>
        </div>

        <div class="card" style="background:var(--primary); color:white; border:none;">
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
        <a href="#" class="nav-item"><i class="fas fa-chart-line"></i>Trade</a>
        <a href="#" class="nav-item"><i class="fas fa-wallet"></i>Pay</a>
        <a href="/logout" class="nav-item"><i class="fas fa-user-circle"></i>Exit</a>
    </div>
    </body></html>`);
});

// =============================================================
// ✅ NEW: LOAN REQUEST ACTION
// =============================================================
app.post('/request-loan', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    
    const newLoan = new Loan({
        borrowerName: u.name,
        borrowerId: u._id,
        amount: parseFloat(req.body.amount),
        repaymentAmount: parseFloat(req.body.amount) * 1.35, // 35% Interest
        status: "Pending"
    });

    await newLoan.save();
    res.send("<script>alert('Loan request submitted to Admin!'); window.location='/dashboard';</script>");
});

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), phone: req.body.phone, status: "Pending", date: new Date() } 
    });
    res.send("<script>alert('Deposit request sent.'); window.location='/dashboard';</script>");
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// =============================================================
// ✅ DYNAMIC PORT FOR RENDER (Fixed 502 Bad Gateway)
// =============================================================
const PORT = process.env.PORT || 10000; // Render defaults to 10000 if not specified
app.listen(PORT, () => console.log(`🚀 MarchaFácil Live on port ${PORT}`));
