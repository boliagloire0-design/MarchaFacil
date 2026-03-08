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
    status: { type: String, default: 'Active' }, // 'Active', 'Paid', 'Overdue'
    agentId: mongoose.Schema.Types.ObjectId
});
const Loan = mongoose.model('Loan', loanSchema);

const i18n = {
    pt: { balance: "LUCRO DISPONÍVEL", total: "TOTAL DE ATIVOS", locked: "CAPITAL INVESTIDO", deposit: "Investir via M-Pesa", lang: "English", maturity: "Maturidade", sms: "Empréstimo Rápido" },
    en: { balance: "AVAILABLE PROFIT", total: "TOTAL ASSETS", locked: "LOCKED CAPITAL", deposit: "Invest via M-Pesa", lang: "Português", maturity: "Maturity", sms: "SMS Loan" }
};
const getT = (req) => i18n[req.session.lang || 'pt'];

const css = `
:root { --primary: #00e676; --bg: #000; --card: #1c1c1e; --text: #fff; --surface: #2c2c2e; --loan: #e6192e; }
* { box-sizing: border-box; font-family: 'Inter', sans-serif; }
body { background: var(--bg); color: var(--text); margin: 0; padding-bottom: 50px; }
.container { padding: 20px; max-width: 480px; margin: 0 auto; }
.smart-balance { padding: 30px 0; border-bottom: 1px solid #333; margin-bottom: 20px; }
.smart-balance h1 { font-size: 42px; margin: 5px 0; color: var(--primary); }
.card { background: var(--card); padding: 20px; border-radius: 20px; border: 1px solid #333; margin-top: 20px; position: relative; }
.locked-box { background: var(--surface); padding: 15px; border-radius: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #333; }
input, select { width: 100%; padding: 16px; background: #000; border: 1px solid #333; color: #fff; border-radius: 12px; margin-bottom: 12px; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; font-weight: 700; border-radius: 12px; cursor: pointer; color: #000; }
.badge { font-size: 10px; padding: 4px 8px; border-radius: 4px; float: right; text-transform: uppercase; }
`;

// =============================================================
// ✅ CORE USER ROUTES
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; min-height:100vh;"><div class="container">
        <h1 style="text-align:center; color:var(--primary); letter-spacing:2px;">MARCHAFÁCIL</h1>
        <div class="card"><form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="PIN" required>
            <button>Login</button>
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
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
             <button onclick="window.location='/toggle-lang'" style="width:auto; padding:5px 15px; background:var(--surface); color:#fff; font-size:12px;">${t.lang}</button>
             <button onclick="window.location='/logout'" style="width:auto; padding:5px 15px; background:transparent; color:#ff4444; border:none; font-size:12px;">Sair</button>
        </div>

        <div class="smart-balance">
            <span>${t.total}</span>
            <h1>${totalAssets.toLocaleString()} MT</h1>
            <small style="opacity:0.7;">${t.balance}: ${u.balance.toLocaleString()} MT</small>
        </div>

        <div class="locked-box">
            <div><small>${t.locked}</small><br><b>${u.lockedPrincipal.toLocaleString()} MT</b></div>
            <div style="text-align:right">
                <small>${t.maturity}</small><br>
                <b style="color:${maturityReached ? 'var(--primary)' : '#ffab40'}">
                    ${maturityReached ? 'COMPLETED' : daysRemaining + ' Days Left'}
                </b>
            </div>
        </div>

        ${maturityReached && totalAssets > 0 ? `
            <div class="card" style="border: 1px solid var(--primary); background: rgba(0,230,118,0.1);">
                <p style="margin:0 0 10px 0; font-size:13px;">Investment matured! You can now request withdrawal.</p>
                <button onclick="window.location='/request-withdrawal'">Withdraw Funds</button>
            </div>
        ` : ''}

        <div class="card" style="border: 1px solid var(--loan);">
            <h3 style="color:var(--loan); margin-top:0;"><i class="fa fa-bolt"></i> ${t.sms}</h3>
            <form action="/apply-sms-loan" method="POST">
                <input type="number" name="amount" placeholder="Loan Amount (MT)" required>
                <select name="term">
                    <option value="14">14 Days (35% Interest)</option>
                    <option value="30">30 Days (40% Interest)</option>
                </select>
                <button style="background:var(--loan); color:#fff;">Request Instant Loan</button>
            </form>
        </div>

        <div class="card">
            <h3>${t.deposit}</h3>
            <form action="/deposit" method="POST">
                <input type="number" name="amount" placeholder="Amount (MT)" required>
                <input type="text" name="phone" placeholder="M-Pesa Phone" required>
                <button>Start 30-Day Lock</button>
            </form>
        </div>

        ${u.isAdmin ? `<button onclick="window.location='/admin'" style="margin-top:20px; background:var(--primary); color:#000;">ADMIN DASHBOARD</button>` : ''}
        ${u.isAgent && !u.isAdmin ? `<button onclick="window.location='/agent'" style="margin-top:10px; background:#fff; color:#000;">AGENT PANEL</button>` : ''}
    </div></body></html>`);
});

// =============================================================
// ✅ UPDATED AGENT LOGIC (Instant Balance Injection)
// =============================================================

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

        // Add to balance for immediate UI reflection
        user.balance += amount; 
        user.pendingDeposit.status = "Completed";
        user.lastDepositDate = new Date();
        await user.save();

        // Pay agent their 5% spread
        agent.agentCommissionBalance += (amount * 0.05);
        await agent.save();
    }
    res.redirect('back');
});

// =============================================================
// ✅ MASTER ADMIN DASHBOARD (Overseas everything)
// =============================================================

app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u.isAdmin) return res.send("Denied");

    const allUsers = await User.find({});
    const allLoans = await Loan.find({});
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });

    const totalLent = allLoans.reduce((s, l) => s + l.amount, 0);
    const totalProfit = allLoans.filter(l => l.status === 'Paid').reduce((s, l) => s + (l.repayment - l.amount), 0);

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body><div class="container">
        <h2 style="color:var(--primary)">Admin Treasury</h2>
        
        <div class="card">
            <small>Active Circulation</small><h1>${totalLent.toLocaleString()} MT</h1>
            <small>Realized Interest</small><h2 style="color:var(--primary)">+ ${totalProfit.toLocaleString()} MT</h2>
        </div>

        <h3>Pending Deposits (${pendings.length})</h3>
        ${pendings.map(p => `
            <div class="card">
                <b>${p.name}</b>: ${p.pendingDeposit.amount} MT<br>
                <form action="/approve-deposit" method="POST" style="margin-top:10px;">
                    <input type="hidden" name="userId" value="${p._id}">
                    <button>Approve Deposit</button>
                </form>
            </div>`).join('')}

        <h3>Active SMS Loans</h3>
        ${allLoans.map(l => `
            <div class="card" style="font-size:12px;">
                <b>${l.borrowerName}</b> | Repay: ${l.repayment} MT<br>
                Status: <span style="color:var(--primary)">${l.status}</span>
            </div>`).join('')}

        <button onclick="window.location='/dashboard'" style="background:none; color:#fff; border:1px solid #333; margin-top:20px;">Exit Admin</button>
    </div></body></html>`);
});

// =============================================================
// ✅ WITHDRAWAL & HELPERS
// =============================================================

app.get('/request-withdrawal', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const msg = `SOLICITAÇÃO DE SAQUE (MATURIDADE)%0ACliente: ${u.name}%0AValor Total: ${u.balance + u.lockedPrincipal} MT`;
    res.send(`<script>window.location.href="https://wa.me/${AGENT_WHATSAPP}?text=${msg}";</script>`);
});

app.post('/apply-sms-loan', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const rate = (req.body.term === "14") ? SMS_LOAN_14_DAYS : SMS_LOAN_30_DAYS;
    const msg = `PEDIDO DE SMS-LOAN%0ACliente: ${u.name}%0AValor: ${req.body.amount} MT%0ARepagar: ${parseFloat(req.body.amount) * (1+rate)} MT`;
    res.send(`<script>window.location.href="https://wa.me/${AGENT_WHATSAPP}?text=${msg}";</script>`);
});

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), phone: req.body.phone, status: "Pending", date: new Date() } 
    });
    res.send("<script>alert('Aguardando Aprovação'); window.location='/dashboard';</script>");
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.get('/toggle-lang', (req, res) => { req.session.lang = req.session.lang === 'en' ? 'pt' : 'en'; res.redirect('back'); });

app.listen(3000, () => console.log("🚀 MarchaFácil: Admin & User Suite Live"));
