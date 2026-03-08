const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit'); 
const app = express();

// =============================================================
// ✅ CONFIGURATION & RULES
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";
const REFERRAL_BONUS = 5000;
const REQUIRED_REFERRALS = 20;
const MAX_DEPOSIT_FOR_QUALIFY = 20000;
const CURRENCY = "MT";

mongoose.connect(MONGO_URI).then(() => console.log("✅ MarchaFácil: Omni-Bilingual Suite Online"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'marchafacil_ultimate_2026', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ TRANSLATIONS DICTIONARY
// =============================================================
const i18n = {
    pt: {
        welcome: "BEM-VINDO", login: "Entrar", signup: "Criar conta", email: "Email", pin: "PIN",
        balance: "SALDO", deposit: "Depositar", amount: "Valor", request: "Solicitar", logout: "Sair",
        agent_panel: "Painel de Agente", confirm: "Confirmar", reject: "Rejeitar", reason: "Motivo",
        pending: "Pendentes", lang: "English", history: "Histórico", download: "Recibo PDF",
        reject_msg: "Depósito Rejeitado", csv: "Exportar CSV", lend: "Emprestar ao Sistema (10%)",
        profit_msg: "Rendimento em:", days: "dias", total_liq: "LIQUIDEZ TOTAL"
    },
    en: {
        welcome: "WELCOME", login: "Login", signup: "Sign Up", email: "Email", pin: "PIN",
        balance: "BALANCE", deposit: "Deposit", amount: "Amount", request: "Request", logout: "Logout",
        agent_panel: "Agent Panel", confirm: "Confirm", reject: "Reject", reason: "Reason",
        pending: "Pending", lang: "Português", history: "History", download: "PDF Receipt",
        reject_msg: "Deposit Rejected", csv: "Export CSV", lend: "Lend to System (10%)",
        profit_msg: "Profit in:", days: "days", total_liq: "TOTAL LIQUIDITY"
    }
};

// =============================================================
// ✅ DATA SCHEMA
// =============================================================
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    name: String,
    passcode: String,
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    isAgent: { type: Boolean, default: false },
    lastProfitDate: { type: Date, default: Date.now },
    agentLendingBalance: { type: Number, default: 0 },
    agentLendingDate: Date,
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qualifiedReferrals: { type: Number, default: 0 },
    pendingDeposit: { amount: Number, status: String, reason: String, date: Date },
    transactions: [{ type: { type: String }, amount: Number, fee: { type: Number, default: 0 }, date: String }]
});
const User = mongoose.model('User', userSchema);

// =============================================================
// ✅ UI STYLES
// =============================================================
const css = `
:root { --primary: #00e676; --bg: #0a0c10; --card: #161b22; --text: #f0f6fc; --admin: #f85149; --warn: #ffbb33; --agent: #2196f3; }
* { box-sizing: border-box; font-family: 'Segoe UI', sans-serif; } 
body { background: var(--bg); color: var(--text); margin: 0; padding-bottom: 40px; } 
.container { padding: 20px; max-width: 480px; margin: 0 auto; } 
.card { background: var(--card); padding: 20px; border-radius: 16px; border: 1px solid #30363d; margin-bottom: 15px; } 
.balance-card { background: linear-gradient(135deg, #00c853 0%, #007e33 100%); color: white; border-radius: 20px; padding: 25px; text-align: center; } 
.agent-card { background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%); color: white; border-radius: 20px; padding: 25px; text-align: center; margin-bottom: 15px; }
button { width: 100%; padding: 15px; background: var(--primary); border: none; font-weight: 700; border-radius: 10px; cursor: pointer; color: #000; margin-top: 10px; }
.btn-small { padding: 5px 10px; font-size: 11px; width: auto; background: #333; color: white; border: 1px solid #444; }
input, select { width: 100%; padding: 12px; background: #010409; border: 1px solid #30363d; color: white; border-radius: 8px; margin-bottom: 10px; }
.lang-toggle { background: transparent; color: #8b949e; border: 1px solid #333; padding: 5px 15px; border-radius: 20px; font-size: 11px; cursor: pointer; float: right; }
`;

// =============================================================
// ✅ HELPERS & MIDDLEWARE
// =============================================================
const getT = (req) => i18n[req.session.lang || 'pt'];

app.get('/toggle-lang', (req, res) => {
    req.session.lang = req.session.lang === 'en' ? 'pt' : 'en';
    res.redirect('back');
});

// =============================================================
// ✅ PDF RECEIPT ENGINE
// =============================================================
app.get('/receipt/:txIndex', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const tx = u.transactions[req.params.txIndex];
    if (!tx) return res.send("Not found");

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt_${tx.date}.pdf`);
    doc.pipe(res);
    doc.fontSize(22).fillColor('#00e676').text('MARCHAFÁCIL', { align: 'center' });
    doc.fontSize(10).fillColor('black').text('Official Digital Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`User: ${u.email}`);
    doc.text(`Operation: ${tx.type}`);
    doc.text(`Amount: ${tx.amount} ${CURRENCY}`);
    doc.text(`Fee: ${tx.fee || 0} ${CURRENCY}`);
    doc.text(`Date: ${tx.date}`);
    doc.moveDown();
    doc.fontSize(8).text('MarchaFácil © 2026 - Maputo, MZ', { align: 'center' });
    doc.end();
});

// =============================================================
// ✅ DASHBOARD (Standard 5% View)
// =============================================================
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const t = getT(req);
    const daysLeft = 30 - Math.floor((new Date() - new Date(u.lastProfitDate)) / (1000 * 60 * 60 * 24));

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <button class="lang-toggle" onclick="window.location='/toggle-lang'">${t.lang}</button>
        <div class="balance-card">
            <small>${t.balance}</small>
            <h1>${u.balance.toLocaleString()} ${CURRENCY}</h1>
            <div style="font-size:11px;">${t.profit_msg} ${daysLeft > 0 ? daysLeft : 0} ${t.days}</div>
        </div>

        ${u.pendingDeposit?.status === 'Rejected' ? `<div class="card" style="color:var(--admin)"><b>${t.reject_msg}:</b> ${u.pendingDeposit.reason}</div>` : ''}

        <div class="card">
            <h3>${t.deposit}</h3>
            <form action="/deposit" method="POST"><input type="number" name="amount" required><button>${t.request}</button></form>
        </div>

        <div class="card">
            <h3>${t.history}</h3>
            ${u.transactions.slice(-4).reverse().map((tx, i) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #333;">
                    <span style="font-size:13px;">${tx.type}<br><small>${tx.date}</small></span>
                    <button class="btn-small" onclick="window.location='/receipt/${u.transactions.length - 1 - i}'">PDF</button>
                </div>
            `).join('')}
        </div>

        ${u.isAgent || u.isAdmin ? `<button onclick="window.location='/agent'" style="background:var(--agent); color:white">${t.agent_panel}</button>` : ''}
        <button onclick="window.location='/logout'" style="background:transparent; border:1px solid #444; color:white">${t.logout}</button>
    </div></body></html>`);
});

// =============================================================
// ✅ AGENT PANEL (10% Lending + Referrals)
// =============================================================
app.get('/agent', async (req, res) => {
    if (!req.session.isAgent && !req.session.isAdmin) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const t = getT(req);
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <button class="lang-toggle" onclick="window.location='/toggle-lang'">${t.lang}</button>
        <div class="agent-card">
            <small>${t.lend}</small>
            <h2>${u.agentLendingBalance.toLocaleString()} ${CURRENCY}</h2>
            <div style="font-size:11px;">Ref: ${u.qualifiedReferrals}/20 (${t.amount} <= 20k)</div>
        </div>

        <h3>${t.pending}</h3>
        ${pendings.map(p => `
            <div class="card">
                <b>${p.email}</b> | ${p.pendingDeposit.amount} ${CURRENCY}
                <form action="/confirm-deposit" method="POST">
                    <input type="hidden" name="uid" value="${p._id}">
                    <button type="submit">${t.confirm}</button>
                </form>
                <form action="/reject-deposit" method="POST" style="margin-top:5px;">
                    <input type="hidden" name="uid" value="${p._id}">
                    <input type="text" name="reason" placeholder="${t.reason}" required>
                    <button type="submit" style="background:var(--admin); color:white">${t.reject}</button>
                </form>
            </div>
        `).join('')}
        
        <div class="card">
            <h3>Invest Capital (10%)</h3>
            <form action="/agent/lend" method="POST"><input type="number" name="amount" placeholder="${t.amount}"><button style="background:var(--agent); color:white">Lend</button></form>
        </div>
        <button onclick="window.location='/dashboard'">Back</button>
    </div></body></html>`);
});

// =============================================================
// ✅ SYSTEM LOGIC (Referrals, Rejection, Lending)
// =============================================================

app.post('/confirm-deposit', async (req, res) => {
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit.status === "Pending") {
        const amt = u.pendingDeposit.amount;
        u.balance += amt;
        u.pendingDeposit = { status: "Confirmed", date: new Date() };
        u.transactions.push({ type: "Depósito", amount: amt, date: new Date().toLocaleDateString() });
        await u.save();

        // Bonus Logic: Max 20,000 MT per person
        if (u.referredBy && amt <= MAX_DEPOSIT_FOR_QUALIFY) {
            const agent = await User.findById(u.referredBy);
            if (agent) {
                agent.qualifiedReferrals += 1;
                if (agent.qualifiedReferrals === REQUIRED_REFERRALS) {
                    agent.balance += REFERRAL_BONUS;
                    agent.transactions.push({ type: "BONUS 20 REF 🎁", amount: REFERRAL_BONUS, date: new Date().toLocaleDateString() });
                }
                await agent.save();
            }
        }
    }
    res.redirect('/agent');
});

app.post('/reject-deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.body.uid, { 
        "pendingDeposit.status": "Rejected", 
        "pendingDeposit.reason": req.body.reason 
    });
    res.redirect('/agent');
});

app.post('/agent/lend', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const amt = parseFloat(req.body.amount);
    if (u.balance >= amt) {
        u.balance -= amt; u.agentLendingBalance += amt; u.agentLendingDate = new Date();
        await u.save();
    }
    res.redirect('/agent');
});

// =============================================================
// ✅ AUTH & PUBLIC
// =============================================================
app.get('/', (req, res) => {
    const t = getT(req);
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center;"><div class="container">
        <button class="lang-toggle" onclick="window.location='/toggle-lang'">${t.lang}</button>
        <h1 style="text-align:center; color:var(--primary)">MARCHAFÁCIL</h1>
        <div class="card"><form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="PIN" required>
            <button>${t.login}</button>
        </form></div>
    </div></body></html>`);
});

app.post('/login', async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase(), passcode: req.body.passcode });
    if (u) {
        req.session.userId = u._id;
        req.session.isAdmin = u.isAdmin;
        req.session.isAgent = u.isAgent;
        return res.redirect('/dashboard');
    }
    res.send("Error");
});

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), status: "Pending", date: new Date() } 
    });
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.listen(3000, () => console.log("🚀 MarchaFácil Omni-Suite Live on Port 3000"));
