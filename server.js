const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION & DATABASE
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";
const CURRENCY = "MT"; 

mongoose.connect(MONGO_URI).then(() => console.log("✅ MarchaFácil Unified System Online"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'marchafacil_omni_2026', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ DATA SCHEMA
// =============================================================
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    passcode: String,
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    isAgent: { type: Boolean, default: false },
    lastProfitDate: { type: Date, default: Date.now }, 
    agentLendingBalance: { type: Number, default: 0 },
    agentLendingDate: Date, 
    pendingDeposit: { amount: Number, method: String, status: String, date: Date },
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
.container { padding: 20px; max-width: 450px; margin: 0 auto; } 
.card { background: var(--card); padding: 20px; border-radius: 16px; border: 1px solid #30363d; margin-bottom: 20px; } 
.balance-card { background: linear-gradient(135deg, #00c853 0%, #007e33 100%); color: white; border-radius: 24px; padding: 25px; text-align: center; margin-bottom: 20px; } 
.agent-card { background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%); color: white; border-radius: 24px; padding: 25px; text-align: center; margin-bottom: 20px; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; font-weight: 700; border-radius: 12px; cursor: pointer; margin-top: 10px; color: #000; }
input, select { width: 100%; padding: 14px; background: #010409; border: 1px solid #30363d; color: white; border-radius: 8px; margin-bottom: 10px; }
.badge { font-size: 10px; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 10px; display: inline-block; }
.maturity-tag { font-size: 11px; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 10px; margin-top: 8px; display: inline-block; color: #fff; }
`;

// =============================================================
// ✅ PUBLIC ROUTES (LOGIN & RECEIPTS)
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; justify-content:center; height:100vh;"><div class="container">
        <h1 style="text-align:center; color:var(--primary); letter-spacing:-1px;">MARCHAFÁCIL</h1>
        <div class="card"><form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="PIN" required>
            <button>Entrar no Sistema</button>
        </form></div>
    </div></body></html>`);
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (user && user.passcode === req.body.passcode) {
        req.session.userId = user._id;
        req.session.isAdmin = user.isAdmin;
        req.session.isAgent = user.isAgent;
        if (user.isAdmin) return res.redirect('/admin');
        if (user.isAgent) return res.redirect('/agent');
        return res.redirect('/dashboard');
    }
    res.send("<script>alert('Acesso Negado'); window.location='/';</script>");
});

app.get('/receipt', (req, res) => {
    const { type, amount, fee } = req.query;
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container" style="text-align:center; padding-top:50px;">
        <div class="card" style="border: 2px solid var(--primary);">
            <h2 style="color:var(--primary)">RECIBO</h2>
            <p>Operação: <b>${type}</b></p>
            <p>Valor: <b>${amount} ${CURRENCY}</b></p>
            ${fee > 0 ? `<p>Taxa: <b>${fee} ${CURRENCY}</b></p>` : ''}
            <button onclick="window.location='/dashboard'">Fechar</button>
        </div>
    </div></body></html>`);
});

// =============================================================
// ✅ USER DASHBOARD (5% View)
// =============================================================

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const daysLeft = 30 - Math.floor((new Date() - new Date(u.lastProfitDate)) / (1000 * 60 * 60 * 24));

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="balance-card">
            <small>MEU SALDO</small>
            <div style="font-size:38px; font-weight:800; margin:5px 0;">${u.balance.toLocaleString()} ${CURRENCY}</div>
            <div class="maturity-tag">Próximo rendimento: ${daysLeft > 0 ? daysLeft : 0} dias</div>
        </div>
        ${u.pendingDeposit?.status === 'Pending' ? `<div class="card" style="border:1px dashed var(--warn); color:var(--warn); text-align:center;">Depósito de ${u.pendingDeposit.amount} em verificação...</div>` : ''}
        <div class="card">
            <h3>Operações</h3>
            <form action="/deposit" method="POST"><input type="number" name="amount" placeholder="Depositar Valor" required><button>Pedir Depósito</button></form>
            <form action="/withdraw" method="POST" style="margin-top:10px;"><input type="number" name="amount" placeholder="Levantar Valor" required><select name="method"><option value="Bank">Banco (Grátis)</option><option value="Mpesa">M-Pesa (250 MT)</option></select><button style="background:var(--warn)">Levantar</button></form>
        </div>
        <div class="card">
            <h3>Histórico</h3>
            ${u.transactions.slice(-5).reverse().map(t => `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #333; font-size:13px;"><span>${t.type}</span><b>${t.amount} MT</b></div>`).join('')}
        </div>
        <button onclick="window.location='/logout'" style="background:transparent; border:1px solid #444; color:white">Sair</button>
    </div></body></html>`);
});

// =============================================================
// ✅ AGENT PANEL (10% Lending & Client Validation)
// =============================================================

app.get('/agent', async (req, res) => {
    if (!req.session.isAgent && !req.session.isAdmin) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    const agentDays = 30 - Math.floor((new Date() - new Date(u.agentLendingDate || u.lastProfitDate)) / (1000 * 60 * 60 * 24));

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="badge" style="background:var(--agent); color:white;">AGENTE</div>
        <div class="agent-card">
            <small>VALOR EMPRESTADO AO SISTEMA</small>
            <div style="font-size:32px; font-weight:900;">${u.agentLendingBalance.toLocaleString()} ${CURRENCY}</div>
            <div class="maturity-tag">Ciclo de 10%: ${agentDays > 0 ? agentDays : 0} dias restantes</div>
        </div>
        <div class="card" style="border-color:var(--agent)">
            <h3>Emprestar ao MarchaFácil (10%)</h3>
            <form action="/agent/lend" method="POST"><input type="number" name="amount" placeholder="Valor" required><button style="background:var(--agent); color:white">Investir Capital</button></form>
        </div>
        <h3>Validações Pendentes</h3>
        ${pendings.length === 0 ? '<p>Nenhum pedido.</p>' : pendings.map(p => `<div class="card"><b>${p.email}</b><br>${p.pendingDeposit.amount} MT<form action="/confirm-action" method="POST" style="margin-top:10px;"><input type="hidden" name="uid" value="${p._id}"><button>Validar Recebimento</button></form></div>`).join('')}
        <button onclick="window.location='/dashboard'" style="background:transparent; border:1px solid #444; color:white">Meu Dashboard</button>
    </div></body></html>`);
});

// =============================================================
// ✅ ADMIN PANEL (Profit Distro & Loan Approval)
// =============================================================

app.get('/admin', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    const users = await User.find({});
    const totalLiq = users.reduce((a, b) => a + b.balance + b.agentLendingBalance, 0);

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="badge" style="background:var(--admin); color:white;">ADMIN</div>
        <div class="card" style="background:var(--admin); text-align:center;">
            <small>LIQUIDEZ TOTAL DO SISTEMA</small>
            <div style="font-size:30px; font-weight:bold;">${totalLiq.toLocaleString()} ${CURRENCY}</div>
        </div>
        <div class="card" style="border-color:var(--warn)">
            <h3>Aprovar Empréstimo WhatsApp</h3>
            <form action="/approve-loan" method="POST"><input type="text" name="email" placeholder="Email Cliente"><input type="number" name="amount" placeholder="Valor"><button style="background:var(--warn); color:black">Lançar Empréstimo</button></form>
        </div>
        <button onclick="window.location='/distribute-profit'" style="background:#4caf50;">Pagar Lucros Mensais (30 Dias)</button>
        <button onclick="window.location='/agent'" class="badge" style="background:var(--agent); color:white; margin-top:10px; width:100%; border:none; padding:15px;">Ir para Validações (Modo Agente)</button>
        <button onclick="window.location='/logout'" style="background:transparent; border:1px solid #444; color:white; margin-top:10px;">Logout</button>
    </div></body></html>`);
});

// =============================================================
// ✅ SYSTEM LOGIC (Transactions & Profits)
// =============================================================

app.get('/distribute-profit', async (req, res) => {
    if (!req.session.isAdmin) return res.send("Denied");
    const all = await User.find({});
    const now = new Date();
    let count = 0;
    for (let u of all) {
        let up = false;
        const days = (d) => Math.floor((now - new Date(d)) / (1000 * 60 * 60 * 24));
        if (u.balance > 0 && days(u.lastProfitDate) >= 30) {
            u.balance += (u.balance * 0.05); u.lastProfitDate = now;
            u.transactions.push({ type: "Lucro Mensal 5%", amount: u.balance * 0.05, date: now.toLocaleDateString() });
            up = true;
        }
        if (u.isAgent && u.agentLendingBalance > 0 && days(u.agentLendingDate || u.lastProfitDate) >= 30) {
            u.balance += (u.agentLendingBalance * 0.10); u.agentLendingDate = now;
            u.transactions.push({ type: "Lucro Agente 10%", amount: u.agentLendingBalance * 0.10, date: now.toLocaleDateString() });
            up = true;
        }
        if (up) { await u.save(); count++; }
    }
    res.send(`<script>alert('Maturidade atingida em ${count} contas.'); window.location='/admin';</script>`);
});

app.post('/agent/lend', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const amt = parseFloat(req.body.amount);
    if (u.balance < amt) return res.send("Saldo Insuficiente");
    u.balance -= amt; u.agentLendingBalance += amt; u.agentLendingDate = new Date();
    await u.save(); res.redirect('/agent');
});

app.post('/confirm-action', async (req, res) => {
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit.status === "Pending") {
        const amt = parseFloat(u.pendingDeposit.amount);
        u.balance += amt; u.pendingDeposit.status = "Confirmed";
        u.transactions.push({ type: "Depósito Confirmado", amount: amt, date: new Date().toLocaleDateString() });
        await u.save(); res.redirect('/agent');
    }
});

app.post('/approve-loan', async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase() });
    if (u) {
        const amt = parseFloat(req.body.amount);
        u.balance += amt; u.transactions.push({ type: "Empréstimo WhatsApp ✅", amount: amt, date: new Date().toLocaleDateString() });
        await u.save(); res.redirect('/admin');
    }
});

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { pendingDeposit: { amount: req.body.amount, status: "Pending", date: new Date() } });
    res.redirect('/dashboard');
});

app.post('/withdraw', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const fee = req.body.method === 'Mpesa' ? 250 : 0;
    const amt = parseFloat(req.body.amount);
    if (u.balance < (amt + fee)) return res.send("Saldo insuficiente");
    u.balance -= (amt + fee);
    u.transactions.push({ type: `Saída (${req.body.method})`, amount: -amt, fee, date: new Date().toLocaleDateString() });
    await u.save(); res.redirect(`/receipt?type=Levantamento&amount=${amt}&fee=${fee}`);
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.listen(3000, () => console.log("🚀 MarchaFácil Omni-System Live"));
