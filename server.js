const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ CONFIGURATION & BRANDING
// =============================================================
const MONGO_URI = "mongodb+srv://Gloirebolia1995:Sheilla9611@cluster0.bem8n8n.mongodb.net/marchafacil?retryWrites=true&w=majority";
const ADMIN_PHONE = "258855917810"; 
const CURRENCY = "MT"; 

mongoose.connect(MONGO_URI).then(() => console.log("✅ MarchaFácil Online")).catch(err => console.error(err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'marchafacil_ultra_2026', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ DATA SCHEMA
// =============================================================
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    passcode: String,
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    isAgent: { type: Boolean, default: false }, // New Agent Role
    investments: [{ capital: Number, monthlyProfit: Number, date: Date }],
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
.balance-card { background: linear-gradient(135deg, #00c853 0%, #007e33 100%); color: white; border-radius: 24px; padding: 30px; text-align: center; margin-bottom: 25px; } 
input, select { width: 100%; padding: 14px; background: #010409; border: 1px solid #30363d; color: white; border-radius: 8px; margin-bottom: 10px; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; font-weight: 700; border-radius: 12px; cursor: pointer; } 
.btn-agent { background: var(--agent); color: white; }
.badge { font-size: 10px; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 10px; display: inline-block; }
`;

// =============================================================
// ✅ AUTH & DASHBOARD
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body><div class="container" style="text-align:center; padding-top:60px;">
        <h1 style="color:var(--primary)">MARCHAFÁCIL</h1>
        <div class="card"><form action="/login" method="POST">
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="Passcode" required>
            <button type="submit">Entrar</button>
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
    res.send("<script>alert('Erro no Login'); window.location='/';</script>");
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const history = [...u.transactions].reverse();
    const pending = u.pendingDeposit?.status === "Pending" ? u.pendingDeposit : null;

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="balance-card">
            <small>SALDO</small>
            <div style="font-size:38px; font-weight:800;">${u.balance.toLocaleString()} ${CURRENCY}</div>
        </div>
        ${pending ? `<div class="card" style="border:1px dashed var(--warn)">⏳ Depósito Pendente: ${pending.amount} MT</div>` : ''}
        <div class="card">
            <h3>Depósito / Levantamento</h3>
            <form action="/deposit" method="POST"><input type="number" name="amount" placeholder="Valor" required><select name="method"><option value="Bank">Banco</option><option value="Mpesa">M-Pesa (250 MT)</option></select><button>Solicitar</button></form>
            <form action="/withdraw" method="POST" style="margin-top:10px;"><input type="number" name="amount" placeholder="Valor Saída" required><select name="method"><option value="Bank">Banco</option><option value="Mpesa">M-Pesa (250 MT)</option></select><button style="background:var(--warn); color:black">Levantar</button></form>
        </div>
        <div class="card"><h3>Histórico</h3>${history.map(t => `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333"><span>${t.type}</span><b>${t.amount} MT</b></div>`).join('')}</div>
        <button onclick="window.location='/logout'" class="btn-agent" style="background:transparent; border:1px solid #444">Sair</button>
    </div></body></html>`);
});

// =============================================================
// ✅ AGENT PANEL (For Tellers/M-Pesa Handlers)
// =============================================================

app.get('/agent', async (req, res) => {
    if (!req.session.isAgent && !req.session.isAdmin) return res.redirect('/');
    const users = await User.find({ "pendingDeposit.status": "Pending" });

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="badge" style="background:var(--agent); color:white;">MODO AGENTE</div>
        <h2>Depósitos para Validar</h2>
        ${users.length === 0 ? '<p>Sem pendentes.</p>' : users.map(u => `
            <div class="card">
                <b>${u.email}</b><br>${u.pendingDeposit.amount} ${CURRENCY} (${u.pendingDeposit.method})
                <form action="/confirm-action" method="POST" style="margin-top:10px;">
                    <input type="hidden" name="uid" value="${u._id}">
                    <button class="btn-agent">Aprovar Recebimento</button>
                </form>
            </div>
        `).join('')}
        <button onclick="window.location='/dashboard'" class="btn-agent" style="background:transparent; border:1px solid var(--agent); color:var(--agent)">Dashboard Pessoal</button>
    </div></body></html>`);
});

// =============================================================
// ✅ ADMIN PANEL (Full Control)
// =============================================

app.get('/admin', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    const users = await User.find({});
    const totalLiq = users.reduce((a, b) => a + b.balance, 0);

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <div class="badge" style="background:var(--admin); color:white;">ADMINISTRADOR</div>
        <div class="card" style="background:var(--admin); text-align:center;">
            <small>LIQUIDEZ TOTAL</small><div style="font-size:30px; font-weight:bold;">${totalLiq.toLocaleString()} MT</div>
        </div>
        <div class="card">
            <h3>Aprovar Empréstimo</h3>
            <form action="/approve-loan" method="POST">
                <input type="text" name="email" placeholder="Email do Cliente" required>
                <input type="number" name="amount" placeholder="Valor" required>
                <button style="background:var(--warn); color:black">Liberar Crédito</button>
            </form>
        </div>
        <div class="card">
            <h3>Gestão Global</h3>
            <button onclick="window.location='/agent'" class="btn-agent" style="margin-bottom:10px;">Validar Depósitos (Agent View)</button>
            <button onclick="if(confirm('Distribuir 5% de lucro?')) window.location='/distribute-profit'" style="background:#4caf50;">Distribuir Lucro Mensal (5%)</button>
        </div>
        <button onclick="window.location='/logout'" style="background:transparent; border:1px solid #444; color:white">Logout</button>
    </div></body></html>`);
});

// =============================================================
// ✅ GLOBAL LOGIC (Confirmations & Profits)
// =============================================================

app.post('/confirm-action', async (req, res) => {
    if (!req.session.isAgent && !req.session.isAdmin) return res.send("Denied");
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit.status === "Pending") {
        const amt = parseFloat(u.pendingDeposit.amount);
        u.balance += amt;
        u.transactions.push({ type: "Depósito Confirmado ✅", amount: amt, date: new Date().toLocaleDateString() });
        u.pendingDeposit.status = "Confirmed";
        await u.save();
        res.redirect(req.session.isAdmin ? '/admin' : '/agent');
    }
});

app.post('/approve-loan', async (req, res) => {
    if (!req.session.isAdmin) return res.send("Denied");
    const u = await User.findOne({ email: req.body.email.toLowerCase() });
    if (u) {
        const amt = parseFloat(req.body.amount);
        u.balance += amt;
        u.transactions.push({ type: "Empréstimo Aprovado 📄", amount: amt, date: new Date().toLocaleDateString() });
        await u.save();
        res.redirect('/admin');
    }
});

app.get('/distribute-profit', async (req, res) => {
    if (!req.session.isAdmin) return res.send("Denied");
    const users = await User.find({ balance: { $gt: 0 } });
    for (let u of users) {
        const profit = u.balance * 0.05;
        u.balance += profit;
        u.transactions.push({ type: "Lucro Mensal (5%) 📈", amount: profit, date: new Date().toLocaleDateString() });
        await u.save();
    }
    res.send("<script>alert('Lucros distribuídos!'); window.location='/admin';</script>");
});

app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { pendingDeposit: { amount: req.body.amount, method: req.body.method, status: "Pending", date: new Date() } });
    res.redirect('/dashboard');
});

app.post('/withdraw', async (req, res) => {
    const { amount, method } = req.body;
    const u = await User.findById(req.session.userId);
    const fee = method === 'Mpesa' ? 250 : 0;
    if (u.balance < (parseFloat(amount) + fee)) return res.send("Saldo insuficiente");
    u.balance -= (parseFloat(amount) + fee);
    u.transactions.push({ type: `Saída (${method})`, amount: -parseFloat(amount), fee, date: new Date().toLocaleDateString() });
    await u.save();
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.listen(3000, () => console.log("🚀 MarchaFácil Live"));
