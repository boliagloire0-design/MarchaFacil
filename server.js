const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit'); 
const { Parser } = require('json2csv'); // Run: npm install json2csv
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
// ✅ TRANSLATIONS & STYLES
// =============================================================
const i18n = {
    pt: {
        welcome: "BEM-VINDO", login: "Entrar", signup: "Criar conta", email: "Email", pin: "PIN",
        balance: "SALDO", deposit: "Depositar", amount: "Valor", request: "Solicitar", logout: "Sair",
        agent_panel: "Painel de Agente", confirm: "Confirmar", reject: "Rejeitar", reason: "Motivo",
        pending: "Pendentes", lang: "English", history: "Histórico", withdraw: "Levantar",
        profit_msg: "Rendimento em:", days: "dias", download: "PDF", export: "Exportar CSV"
    },
    en: {
        welcome: "WELCOME", login: "Login", signup: "Sign Up", email: "Email", pin: "PIN",
        balance: "BALANCE", deposit: "Deposit", amount: "Amount", request: "Request", logout: "Logout",
        agent_panel: "Agent Panel", confirm: "Confirm", reject: "Reject", reason: "Reason",
        pending: "Pending", lang: "Português", history: "History", withdraw: "Withdraw",
        profit_msg: "Profit in:", days: "days", download: "PDF", export: "Export CSV"
    }
};

const css = `
:root { --primary: #00e676; --bg: #0a0c10; --card: #161b22; --text: #f0f6fc; --accent-orange: #ffab40; --admin: #f85149; --agent: #2196f3; }
* { box-sizing: border-box; font-family: 'Inter', sans-serif; } 
body { background: var(--bg); color: var(--text); margin: 0; padding-bottom: 40px; } 
.container { padding: 20px; max-width: 480px; margin: 0 auto; } 
.insight-row { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px; }
.insight-chip { padding: 12px; border-radius: 20px; font-size: 11px; min-width: 180px; border: 1px solid var(--primary); background: rgba(0, 230, 118, 0.1); white-space: nowrap; }
.balance-card { background: var(--card); border-radius: 24px; padding: 30px; border: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
.progress-ring { width: 60px; height: 60px; border-radius: 50%; background: conic-gradient(var(--primary) 80%, #30363d 0); display: flex; align-items: center; justify-content: center; position: relative; }
.progress-ring::after { content: attr(data-percent); font-size: 10px; font-weight: bold; width: 50px; height: 50px; background: var(--card); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.action-grid { display: flex; justify-content: space-around; margin: 25px 0; }
.action-item { text-align: center; font-size: 11px; color: var(--text); cursor: pointer; }
.icon-circle { width: 55px; height: 55px; border-radius: 50%; border: 1.5px solid var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; background: rgba(0, 230, 118, 0.05); transition: 0.3s; }
.icon-circle:hover { background: var(--primary); color: #000; }
.card { background: var(--card); padding: 20px; border-radius: 16px; border: 1px solid #30363d; margin-bottom: 15px; } 
input { width: 100%; padding: 14px; background: #010409; border: 1px solid #30363d; color: white; border-radius: 12px; margin-bottom: 10px; }
button { width: 100%; padding: 15px; background: var(--primary); border: none; font-weight: 700; border-radius: 12px; cursor: pointer; color: #000; }
.btn-small { padding: 5px 10px; font-size: 11px; width: auto; background: #333; color: white; border: 1px solid #444; border-radius: 6px; cursor: pointer; }
.lang-toggle { background: transparent; color: #8b949e; border: 1px solid #333; padding: 5px 15px; border-radius: 20px; font-size: 11px; cursor: pointer; float: right; }
`;

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
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qualifiedReferrals: { type: Number, default: 0 },
    pendingDeposit: { amount: Number, status: String, reason: String, date: Date },
    pendingWithdraw: { amount: Number, status: String, date: Date },
    transactions: [{ 
        type: { type: String }, 
        amount: Number, 
        date: String, 
        timestamp: { type: Date, default: Date.now } 
    }]
});
const User = mongoose.model('User', userSchema);
const getT = (req) => i18n[req.session.lang || 'pt'];

// =============================================================
// ✅ PUBLIC ROUTES
// =============================================================
app.get('/', (req, res) => {
    const t = getT(req);
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; min-height:100vh;"><div class="container">
        <button class="lang-toggle" onclick="window.location='/toggle-lang'">${t.lang}</button>
        <h1 style="text-align:center; color:var(--primary)">MARCHAFÁCIL</h1>
        <div class="card">
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email" required>
                <input type="password" name="passcode" placeholder="PIN" required>
                <button>${t.login}</button>
            </form>
            <p style="text-align:center; font-size:12px; margin-top:15px;"><a href="/signup" style="color:var(--primary)">${t.signup}</a></p>
        </div>
    </div></body></html>`);
});

app.get('/signup', (req, res) => {
    const t = getT(req);
    const refId = req.query.ref || "";
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
    <body style="display:flex; align-items:center; min-height:100vh;"><div class="container">
        <h1 style="text-align:center; color:var(--primary)">MARCHAFÁCIL</h1>
        <div class="card">
            <h3 style="text-align:center;">${t.signup}</h3>
            <form action="/signup" method="POST">
                <input type="text" name="name" placeholder="Full Name" required>
                <input type="email" name="email" placeholder="Email" required>
                <input type="password" name="passcode" placeholder="PIN (4-6 digits)" required>
                <input type="hidden" name="referredBy" value="${refId}">
                <button type="submit">${t.signup}</button>
            </form>
        </div>
    </div></body></html>`);
});

app.post('/signup', async (req, res) => {
    try {
        const newUser = new User({ ...req.body, email: req.body.email.toLowerCase(), referredBy: mongoose.Types.ObjectId.isValid(req.body.referredBy) ? req.body.referredBy : null });
        await newUser.save();
        res.send("<script>alert('Account Created!'); window.location='/';</script>");
    } catch (err) { res.send("Error: Email exists"); }
});

app.post('/login', async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase(), passcode: req.body.passcode });
    if (u) {
        req.session.userId = u._id;
        req.session.isAdmin = u.isAdmin;
        req.session.isAgent = u.isAgent;
        return res.redirect('/dashboard');
    }
    res.send("<script>alert('Invalid Credentials'); window.location='/';</script>");
});

// =============================================================
// ✅ DASHBOARD & EXPORTS
// =============================================================
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const t = getT(req);
    const daysLeft = 30 - Math.floor((new Date() - new Date(u.lastProfitDate)) / (1000 * 60 * 60 * 24));
    
    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>${css}</style></head><body>
    <div class="container">
        <button class="lang-toggle" onclick="window.location='/toggle-lang'">${t.lang}</button>
        <div class="insight-row">
            <div class="insight-chip">Welcome, ${u.name}! →</div>
            <div class="insight-chip warn">${t.profit_msg} ${daysLeft > 0 ? daysLeft : 0} ${t.days} →</div>
        </div>

        <div class="balance-card">
            <div><h1 style="margin:0;">${u.balance.toLocaleString()} ${CURRENCY}</h1><small style="opacity:0.5">Available Balance</small></div>
            <div class="progress-ring" data-percent="100%"></div>
        </div>

        <div class="action-grid">
            <div class="action-item" onclick="window.location='/export-csv'"><div class="icon-circle"><i class="fa fa-file-csv"></i></div>CSV</div>
            <div class="action-item" onclick="document.getElementById('wd-form').scrollIntoView()"><div class="icon-circle"><i class="fa fa-arrow-up"></i></div>${t.withdraw}</div>
            <div class="action-item" onclick="document.getElementById('dep-form').scrollIntoView()"><div class="icon-circle"><i class="fa fa-plus"></i></div>Top Up</div>
        </div>

        <div id="wd-form" class="card">
            <h3>${t.withdraw}</h3>
            <form action="/withdraw" method="POST"><input type="number" name="amount" placeholder="Min 100 MT" required><button style="background:var(--accent-orange)">Confirm</button></form>
        </div>

        <div id="dep-form" class="card">
            <h3>${t.deposit}</h3>
            <form action="/deposit" method="POST"><input type="number" name="amount" required><button>${t.request}</button></form>
        </div>

        <h4 style="margin:25px 0 10px 5px; opacity:0.7">${t.history}</h4>
        <div class="card">
            ${u.transactions.length > 0 ? u.transactions.slice(-10).reverse().map((tx, i) => `
                <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;">
                    <span><b>${tx.type}</b><br><small>${tx.date}</small></span>
                    <div style="text-align:right">
                        <b style="color:${tx.amount < 0 ? 'var(--admin)' : 'var(--primary)'}">${tx.amount} ${CURRENCY}</b><br>
                        <button class="btn-small" onclick="window.location='/receipt/${u.transactions.length - 1 - i}'" style="margin-top:5px;">${t.download}</button>
                    </div>
                </div>`).join('') : '<p>No history</p>'}
        </div>
        
        ${u.isAgent || u.isAdmin ? `<button onclick="window.location='/agent'" style="background:var(--agent); color:white; margin-top:10px;">${t.agent_panel}</button>` : ''}
        <button onclick="window.location='/logout'" style="background:transparent; color:#8b949e; border:1px solid #30363d; margin-top:20px;">${t.logout}</button>
    </div></body></html>`);
});

app.get('/export-csv', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const fields = ['type', 'amount', 'date', 'timestamp'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(u.transactions);
    res.header('Content-Type', 'text/csv');
    res.attachment(`MarchaFacil_History_${u.name}.csv`);
    return res.send(csv);
});

// =============================================================
// ✅ TRANSACTION LOGIC
// =============================================================
app.post('/deposit', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), status: "Pending", date: new Date() } 
    });
    res.redirect('/dashboard');
});

app.post('/withdraw', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const amt = parseFloat(req.body.amount);
    if (u.balance >= amt && amt >= 100) {
        u.balance -= amt;
        u.transactions.push({ type: "Withdrawal (Pending)", amount: -amt, date: new Date().toLocaleDateString() });
        u.pendingWithdraw = { amount: amt, status: "Pending", date: new Date() };
        await u.save();
        res.send("<script>alert('Withdrawal Request Sent!'); window.location='/dashboard';</script>");
    } else { res.send("<script>alert('Insufficient Balance'); window.location='/dashboard';</script>"); }
});

// =============================================================
// ✅ AGENT PANEL
// =============================================================
app.get('/agent', async (req, res) => {
    if (!req.session.isAgent && !req.session.isAdmin) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const d_pendings = await User.find({ "pendingDeposit.status": "Pending" });
    const w_pendings = await User.find({ "pendingWithdraw.status": "Pending" });
    const refLink = `https://marchafacil.onrender.com/signup?ref=${u._id}`;

    res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <div class="container">
        <h3>Agent Tools</h3>
        <div class="card" style="text-align:center">
            <small>REFERRAL LINK</small>
            <input type="text" value="${refLink}" readonly style="font-size:10px; text-align:center">
            <button onclick="navigator.clipboard.writeText('${refLink}');alert('Copied!')" style="background:white; height:auto; padding:10px; width:auto;">Copy</button>
        </div>
        
        <h4>Pending Deposits</h4>
        ${d_pendings.map(p => `<div class="card">${p.email} | ${p.pendingDeposit.amount} MT
            <form action="/confirm-deposit" method="POST"><input type="hidden" name="uid" value="${p._id}"><button>Confirm</button></form>
        </div>`).join('')}

        <h4>Pending Withdrawals</h4>
        ${w_pendings.map(p => `<div class="card">${p.email} | ${p.pendingWithdraw.amount} MT
            <form action="/confirm-withdraw" method="POST"><input type="hidden" name="uid" value="${p._id}"><button style="background:var(--accent-orange)">Mark Paid</button></form>
        </div>`).join('')}
        
        <button onclick="window.location='/dashboard'">Back to Dashboard</button>
    </div></body></html>`);
});

app.post('/confirm-deposit', async (req, res) => {
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit.status === "Pending") {
        const amt = u.pendingDeposit.amount;
        u.balance += amt;
        u.pendingDeposit.status = "Confirmed";
        u.transactions.push({ type: "Depósito", amount: amt, date: new Date().toLocaleDateString() });
        await u.save();
        
        if (u.referredBy && amt <= MAX_DEPOSIT_FOR_QUALIFY) {
            const agent = await User.findById(u.referredBy);
            if (agent) { 
                agent.qualifiedReferrals += 1; 
                if (agent.qualifiedReferrals === REQUIRED_REFERRALS) agent.balance += REFERRAL_BONUS; 
                await agent.save(); 
            }
        }
    }
    res.redirect('/agent');
});

app.post('/confirm-withdraw', async (req, res) => {
    await User.findOneAndUpdate({ _id: req.body.uid }, { "pendingWithdraw.status": "Paid" });
    res.redirect('/agent');
});

// =============================================================
// ✅ SYSTEM ROUTES
// =============================================================
app.get('/receipt/:txIndex', async (req, res) => {
    const u = await User.findById(req.session.userId);
    const tx = u.transactions[req.params.txIndex];
    if(!tx) return res.send("Not Found");
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);
    doc.fontSize(20).text('MARCHAFÁCIL RECEIPT', { align: 'center' });
    doc.fontSize(12).text(`\nUser: ${u.email}\nDate: ${tx.date}\nType: ${tx.type}\nAmount: ${tx.amount} ${CURRENCY}`);
    doc.end();
});

app.get('/toggle-lang', (req, res) => { req.session.lang = req.session.lang === 'en' ? 'pt' : 'en'; res.redirect('back'); });
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.listen(3000, () => console.log("🚀 MarchaFácil Omni-Suite Live on port 3000"));
