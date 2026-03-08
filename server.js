const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION & BUSINESS RATES
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";
const CURRENCY = "MT";
const LOCK_DAYS = 30;

const USER_PROFIT_RATE = 0.05;   
const AGENT_TOTAL_YIELD = 0.10;  
const SMS_LOAN_14_DAYS = 0.35;   
const SMS_LOAN_30_DAYS = 0.40;   

const AGENT_WHATSAPP = "258840000000"; 

mongoose.connect(MONGO_URI).then(() => console.log("✅ MarchaFácil: Unified Systems Online"));

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
    agentCommissionBalance: { type: Number, default: 0 }, 
    isAdmin: { type: Boolean, default: false },
    isAgent: { type: Boolean, default: false },
    transactions: [{ type: {type: String}, amount: Number, date: String, timestamp: { type: Date, default: Date.now } }],
    pendingDeposit: { amount: Number, status: String, phone: String, date: Date },
    lastDepositDate: { type: Date }
});
const User = mongoose.model('User', userSchema);

const loanSchema = new mongoose.Schema({
    borrowerName: String,
    borrowerId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    repayment: Number,
    dueDate: Date,
    status: { type: String, default: 'Active' }, 
    agentId: mongoose.Schema.Types.ObjectId
});
const Loan = mongoose.model('Loan', loanSchema);

const i18n = {
    pt: { balance: "LUCRO DISPONÍVEL", total: "TOTAL DE ATIVOS", locked: "CAPITAL INVESTIDO", deposit: "Investir via M-Pesa", lang: "English", maturity: "Maturidade", sms: "Empréstimo Rápido" },
    en: { balance: "AVAILABLE PROFIT", total: "TOTAL ASSETS", locked: "LOCKED CAPITAL", deposit: "Invest via M-Pesa", lang: "Português", maturity: "Maturity", sms: "SMS Loan" }
};
const getT = (req) => i18n[req.session.lang || 'pt'];

// =============================================================
// ✅ NEOBANK PROFESSIONAL CSS
// =============================================================
const css = `
:root { 
    --primary: #0052ff; /* Coinbase Blue */
    --success: #05d182; 
    --bg: #f5f7fa; 
    --white: #ffffff;
    --text-main: #0a192f;
    --text-muted: #5b616e;
    --card-shadow: 0 8px 24px rgba(0, 82, 255, 0.05);
}
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
body { background: var(--bg); color: var(--text-main); margin: 0; padding-bottom: 80px; }
.container { padding: 24px; max-width: 500px; margin: 0 auto; }

.nav-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.logo { font-weight: 800; letter-spacing: -1px; font-size: 20px; color: var(--primary); }

.balance-hero { text-align: center; padding: 40px 0; }
.balance-hero span { color: var(--text-muted); font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
.balance-hero h1 { font-size: 48px; margin: 8px 0; font-weight: 700; color: var(--text-main); }

.card { 
    background: var(--white); 
    padding: 24px; 
    border-radius: 24px; 
    box-shadow: var(--card-shadow); 
    margin-bottom: 20px; 
    border: 1px solid rgba(0,0,0,0.02);
}

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
.stat-item { background: #f0f3ff; padding: 16px; border-radius: 18px; text-align: center; }
.stat-item small { color: var(--text-muted); font-size: 11px; display: block; margin-bottom: 4px; }
.stat-item b { font-size: 16px; color: var(--primary); }

input, select { 
    width: 100%; padding: 14px; background: #f9fbff; 
    border: 1.5px solid #eef2f8; color: var(--text-main); 
    border-radius: 12px; margin-bottom: 16px; font-size: 16px;
}
input:focus { border-color: var(--primary); outline: none; }

button { 
    width: 100%; padding: 16px; background: var(--primary); 
    border: none; font-weight: 600; border-radius: 14px; 
    cursor: pointer; color: #fff; font-size: 16px; transition: 0.2s;
}
button:active { transform: scale(0.98); opacity: 0.9; }
.action-label { font-weight: 700; margin-bottom: 12px; display: block; font-size: 18px; }
`;

// =============================================================
// ✅ ROUTES
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; min-height:100vh;"><div class="container">
        <h1 style="text-align:center; color:var(--primary); letter-spacing:-1px; font-weight:800;">MARCHAFÁCIL</h1>
        <div class="card"><form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="PIN" required>
            <button>Sign In</button>
        </form></div>
    </div></body></html>`);
});

app.post('/login', async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase(), passcode: req.body.passcode });
    if (u) { req.session.userId = u._id; return res.redirect('/dashboard'); }
    res.send("<script>alert('Invalid Access'); window.location='/';</script>");
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const t = getT(req);

    let daysRemaining = LOCK_DAYS;
    let maturityReached = false;
    if (u.lastDepositDate) {
        const diffDays = Math.floor(Math.abs(new Date() - u.lastDepositDate) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, LOCK_DAYS - diffDays);
        if (daysRemaining <= 0) maturityReached = true;
    }

    const totalAssets = u.balance + u.lockedPrincipal;

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"><style>${css}</style></head>
    <body><div class="container">
        <div class="nav-header">
            <div class="logo">MarchaFácil</div>
            <div style="display:flex; gap:8px;">
                <button onclick="window.location='/toggle-lang'" style="width:auto; padding:8px 12px; background:#eef2ff; color:var(--primary); font-size:12px;">${t.lang}</button>
                <button onclick="window.location='/logout'" style="width:auto; padding:8px 12px; background:transparent; color:#ff4d4d; font-size:12px; border:none;">Sair</button>
            </div>
        </div>

        <div class="balance-hero">
            <span>${t.total}</span>
            <h1>${totalAssets.toLocaleString()} MT</h1>
            <div style="color:var(--success); font-weight:600; font-size:14px;">
                <i class="fas fa-chart-line"></i> +5.00% (Monthly Yield)
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-item">
                <small>${t.balance}</small>
                <b>${u.balance.toLocaleString()} MT</b>
            </div>
            <div class="stat-item">
                <small>${t.locked}</small>
                <b>${u.lockedPrincipal.toLocaleString()} MT</b>
            </div>
        </div>

        ${maturityReached && totalAssets > 0 ? `
            <div class="card" style="border: 1.5px solid var(--success); background: #f0fff4;">
                <span class="action-label" style="color:var(--success)">Maturity Reached!</span>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Your investment is ready for withdrawal.</p>
                <button onclick="window.location='/request-withdrawal'" style="background:var(--success)">Withdraw Funds</button>
            </div>
        ` : ''}

        <div class="card">
            <span class="action-label">${t.deposit}</span>
            <form action="/deposit" method="POST">
                <input type="number" name="amount" placeholder="0.00 MT" required>
                <input type="text" name="phone" placeholder="84 / 85 M-Pesa Number" required>
                <button>Add Funds</button>
            </form>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #0052ff, #003db3); color: white;">
            <span class="action-label" style="color:white;"><i class="fas fa-bolt"></i> Quick SMS Loan</span>
            <p style="font-size:12px; opacity:0.8; margin-bottom:15px;">Get instant credit based on your investment activity.</p>
            <form action="/apply-sms-loan" method="POST">
                <input type="number" name="amount" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white;" placeholder="Amount (MT)" required>
                <button style="background:white; color:var(--primary);">Request Loan</button>
            </form>
        </div>

        ${u.isAdmin ? `<button onclick="window.location='/admin'" style="margin-top:20px; background:var(--text-main);">Management Panel</button>` : ''}
    </div></body></html>`);
});

app.post('/approve-deposit', async (req, res) => {
    const agent = await User.findById(req.session.userId);
    const user = await User.findById(req.body.userId);

    if (user && user.pendingDeposit.status === "Pending") {
        const amount = user.pendingDeposit.amount;
        await Loan.create({
            borrowerName: user.name,
            borrowerId: user._id,
            amount: amount,
            repayment: amount + (amount * SMS_LOAN_30_DAYS),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            agentId: agent._id
        });
        user.balance += amount; 
        user.pendingDeposit.status = "Completed";
        user.lastDepositDate = new Date();
        await user.save();
        agent.agentCommissionBalance += (amount * 0.05);
        await agent.save();
    }
    res.redirect('back');
});

app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u || !u.isAdmin) return res.send("Denied");
    const allLoans = await Loan.find({});
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    const totalLent = allLoans.reduce((s, l) => s + l.amount, 0);
    const totalProfit = allLoans.filter(l => l.status === 'Paid').reduce((s, l) => s + (l.repayment - l.amount), 0);

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body><div class="container">
        <h2 style="letter-spacing:-1px;">Treasury Overview</h2>
        <div class="card">
            <small style="color:var(--text-muted)">Active Circulation</small><h1>${totalLent.toLocaleString()} MT</h1>
            <small style="color:var(--text-muted)">Realized Interest</small><h2 style="color:var(--success)">+ ${totalProfit.toLocaleString()} MT</h2>
        </div>
        <h3>Approvals Needed (${pendings.length})</h3>
        ${pendings.map(p => `
            <div class="card">
                <b>${p.name}</b>: ${p.pendingDeposit.amount} MT<br>
                <form action="/approve-deposit" method="POST" style="margin-top:10px;">
                    <input type="hidden" name="userId" value="${p._id}">
                    <button style="padding:10px; font-size:14px;">Approve Deposit</button>
                </form>
            </div>`).join('')}
        <button onclick="window.location='/dashboard'" style="background:none; color:var(--text-main); border:1px solid #ddd; margin-top:20px;">Exit Admin</button>
    </div></body></html>`);
});

app.get('/request-withdrawal', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const msg = `SOLICITAÇÃO DE SAQUE%0ACliente: ${u.name}%0AValor: ${u.balance + u.lockedPrincipal} MT`;
    res.send(`<script>window.location.href="https://wa.me/${AGENT_WHATSAPP}?text=${msg}";</script>`);
});

app.post('/apply-sms-loan', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const msg = `PEDIDO DE SMS-LOAN%0ACliente: ${u.name}%0AValor: ${req.body.amount} MT`;
    res.send(`<script>window.location.href="https://wa.me/${AGENT_WHATSAPP}?text=${msg}";</script>`);
});

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), phone: req.body.phone, status: "Pending", date: new Date() } 
    });
    res.send("<script>alert('Pending Approval'); window.location='/dashboard';</script>");
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.get('/toggle-lang', (req, res) => { req.session.lang = req.session.lang === 'en' ? 'pt' : 'en'; res.redirect('back'); });

app.listen(3000, () => console.log("🚀 MarchaFácil: Professional Suite Live"));
