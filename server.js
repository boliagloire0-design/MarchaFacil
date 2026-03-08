const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION
// =============================================================
const MONGO_URI = "mongodb+srv://boliagloire0_db_user:1995:George1933@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";

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
// ✅ CSS STYLING
// =============================================================
const css = `
:root { 
    --primary: #0052ff; --success: #05d182; --danger: #ff4a52; --bg: #ffffff; 
    --surface: #f4f7f9; --text: #0a192f; --muted: #5b616e;
}
* { box-sizing: border-box; font-family: -apple-system, sans-serif; }
body { background: var(--bg); color: var(--text); margin: 0; padding-bottom: 100px; }
.container { padding: 20px; max-width: 500px; margin: 0 auto; }
.balance-hero { padding: 40px 0 20px; border-bottom: 1px solid #f0f0f0; margin-bottom: 20px; }
.balance-hero small { color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 11px; }
.balance-hero h1 { font-size: 44px; margin: 8px 0; font-weight: 700; letter-spacing: -1px; }
.card { background: var(--surface); padding: 20px; border-radius: 24px; margin-bottom: 15px; }
input { width: 100%; padding: 16px; background: #fff; border: 1px solid #eef2f8; border-radius: 14px; margin-bottom: 12px; font-size: 16px; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; border-radius: 50px; color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; }
.btn-alt { background: #eee; color: var(--text); margin-top: 8px; }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #eee; }
.nav-item { text-align: center; color: var(--muted); text-decoration: none; font-size: 11px; }
.nav-item i { display: block; font-size: 22px; margin-bottom: 4px; }
.nav-item.active { color: var(--primary); }
`;

// =============================================================
// ✅ AUTHENTICATION
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
    const activeLoan = await Loan.findOne({ borrowerId: req.session.userId, status: "Active" });

    const history = u.pendingDeposit.status === "Completed" ? 
        [{ date: u.pendingDeposit.date, amount: u.pendingDeposit.amount, type: 'Deposit' }] : [];

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"><style>${css}</style></head>
    <body><div class="container">
        <div class="balance-hero">
            <small>Total Assets</small>
            <h1>${total.toLocaleString()} MT</h1>
            <div style="color:var(--success); font-weight:700; font-size:14px;"><i class="fas fa-arrow-up"></i> 5.00% (Monthly Yield)</div>
        </div>

        ${activeLoan ? `
        <div class="card" style="border:1px solid var(--danger); background:#fff5f5;">
            <small style="color:var(--danger); font-weight:bold;">LOAN DUE: ${activeLoan.dueDate.toLocaleDateString()}</small>
            <p style="margin:5px 0; font-size:14px;">Total Debt: <b>${activeLoan.repaymentAmount.toLocaleString()} MT</b></p>
            <form action="/repay-loan" method="POST">
                <button style="background:var(--danger); padding:10px; font-size:13px; margin-top:10px; width:auto;">Repay Now</button>
            </form>
        </div>` : ''}

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
            <div class="card" style="margin:0;"><small>Profit</small><br><b>${u.balance.toLocaleString()} MT</b></div>
            <div class="card" style="margin:0;"><small>Locked</small><br><b>${u.lockedPrincipal.toLocaleString()} MT</b></div>
        </div>

        <div class="card" style="background:var(--primary); color:white;">
            <h3 style="margin-top:0;">Invest via M-Pesa</h3>
            <form action="/deposit" method="POST">
                <input type="number" name="amount" placeholder="0.00 MT" required>
                <input type="text" name="phone" placeholder="84 / 85 Number" required>
                <button style="background:white; color:var(--primary);">Add Funds</button>
            </form>
        </div>

        <h3 style="margin-top:30px; letter-spacing:-0.5px;">Transactions</h3>
        ${history.length === 0 ? '<p style="color:var(--muted); font-size:14px;">No recent activity.</p>' : history.map(h => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #f0f0f0;">
                <div>
                    <b style="display:block;">M-Pesa ${h.type}</b>
                    <small style="color:var(--muted);">${new Date(h.date).toLocaleDateString()}</small>
                </div>
                <b style="color:var(--success);">+ ${h.amount.toLocaleString()} MT</b>
            </div>
        `).join('')}
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
// ✅ ADMIN PANEL
// =============================================================
app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u || !u.isAdmin) return res.send("Access Denied");

    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    const pendingLoans = await Loan.find({ status: "Pending" });

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body><div class="container">
        <h2>Admin Console</h2>
        
        <h3>Pending Deposits (${pendings.length})</h3>
        ${pendings.length === 0 ? '<p>None.</p>' : pendings.map(p => `
            <div class="card">
                <b>${p.name}</b><br>
                <span style="font-size:20px; font-weight:700;">${p.pendingDeposit.amount} MT</span><br>
                <small>${p.pendingDeposit.phone}</small>
                <div style="margin-top:15px;">
                    <form action="/approve-deposit" method="POST" style="display:inline;"><input type="hidden" name="userId" value="${p._id}"><button style="background:var(--success); padding:10px; width:auto;">Approve</button></form>
                    <form action="/reject-deposit" method="POST" style="display:inline;"><input type="hidden" name="userId" value="${p._id}"><button style="background:var(--danger); padding:10px; width:auto;">Reject</button></form>
                </div>
            </div>
        `).join('')}

        <h3>Loan Requests (${pendingLoans.length})</h3>
        ${pendingLoans.length === 0 ? '<p>None.</p>' : pendingLoans.map(l => `
            <div class="card" style="border-left: 5px solid var(--primary);">
                <b>Borrower:</b> ${l.borrowerName}<br>
                <span style="font-size:20px; font-weight:700; color:var(--primary);">${l.amount} MT</span><br>
                <div style="margin-top:15px;">
                    <form action="/approve-loan" method="POST" style="display:inline;"><input type="hidden" name="loanId" value="${l._id}"><button style="background:var(--primary); padding:10px; width:auto;">Approve Loan</button></form>
                    <form action="/reject-loan" method="POST" style="display:inline;"><input type="hidden" name="loanId" value="${l._id}"><button style="background:var(--muted); padding:10px; width:auto;">Decline</button></form>
                </div>
            </div>
        `).join('')}
        <button onclick="window.location='/logout'" class="btn-alt">Logout Admin</button>
    </div></body></html>`);
});

// =============================================================
// ✅ ACTIONS
// =============================================================
app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), phone: req.body.phone, status: "Pending", date: new Date() } 
    });
    res.send("<script>alert('Deposit request sent.'); window.location='/dashboard';</script>");
});

app.post('/approve-deposit', async (req, res) => {
    const user = await User.findById(req.body.userId);
    if (user && user.pendingDeposit.status === "Pending") {
        user.balance += user.pendingDeposit.amount;
        user.pendingDeposit.status = "Completed";
        await user.save();
    }
    res.redirect('/admin');
});

app.post('/approve-loan', async (req, res) => {
    const loan = await Loan.findById(req.body.loanId);
    if (loan && loan.status === "Pending") {
        loan.repaymentAmount = loan.amount * (1 + loan.interestRate);
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 14);
        loan.dueDate = expiry;
        await User.findByIdAndUpdate(loan.borrowerId, { $inc: { balance: loan.amount } });
        loan.status = "Active";
        await loan.save();
    }
    res.redirect('/admin');
});

app.post('/repay-loan', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await User.findById(req.session.userId);
    const loan = await Loan.findOne({ borrowerId: req.session.userId, status: "Active" });

    if (loan) {
        if (user.balance >= loan.repaymentAmount) {
            user.balance -= loan.repaymentAmount;
            loan.status = "Settled";
            loan.dateSettled = new Date();
            await user.save();
            await loan.save();
            res.send("<script>alert('Loan repaid successfully!'); window.location='/dashboard';</script>");
        } else {
            res.send("<script>alert('Insufficient Balance to repay.'); window.location='/dashboard';</script>");
        }
    } else { res.redirect('/dashboard'); }
});

app.post('/reject-deposit', async (req, res) => { await User.findByIdAndUpdate(req.body.userId, { "pendingDeposit.status": "Rejected" }); res.redirect('/admin'); });
app.post('/reject-loan', async (req, res) => { await Loan.findByIdAndUpdate(req.body.loanId, { status: "Rejected" }); res.redirect('/admin'); });
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.listen(3000, () => console.log("🚀 MarchaFácil Live"));
