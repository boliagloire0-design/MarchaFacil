const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ DATABASE CONNECTION
// =============================================================
const dbUser = "boliagloire0_db_user";
const dbPass = encodeURIComponent("George1933"); 
const MONGO_URI = `mongodb+srv://${dbUser}:${dbPass}@cluster0.e1lz0pj.mongodb.net/marchafacil?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(MONGO_URI).then(() => console.log("✅ MarchaFácil Online")).catch(err => process.exit(1));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'marchafacil_vault_2026', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ EXCHANGE RATES & SCHEMAS
// =============================================================
const RATES = {
    "Mozambique": 63.50, "Uganda": 3800, "DR Congo": 2800, "South Africa": 19.05, 
    "Ghana": 12.80, "Zimbabwe": 1.00, "Guinea Bissau": 605, "Lesotho": 19.05
};

const transactionSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    amountLocal: Number,
    amountTokens: Number,
    country: String,
    method: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    name: String,
    passcode: String,
    usdTokenBalance: { type: Number, default: 0 }, 
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// =============================================================
// ✅ STYLING
// =============================================================
const css = `
:root { --primary: #0052ff; --success: #05d182; --bg: #ffffff; --surface: #f4f7f9; --text: #0a192f; --muted: #5b616e; }
* { box-sizing: border-box; font-family: -apple-system, system-ui, sans-serif; }
body { background: var(--bg); color: var(--text); margin: 0; padding-bottom: 30px; }
.container { padding: 20px; max-width: 500px; margin: 0 auto; }
.card { background: var(--surface); padding: 20px; border-radius: 20px; margin-bottom: 16px; border: 1px solid #eef2f8; }
.wallet-card { background: var(--primary); color: white; text-align: center; padding: 30px 20px; }
input, select { width: 100%; padding: 14px; border: 1px solid #ddd; border-radius: 12px; margin-bottom: 10px; font-size: 16px; }
button { width: 100%; padding: 16px; background: var(--primary); border: none; border-radius: 50px; color: #fff; font-weight: 700; cursor: pointer; }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
.status-pill { font-size: 10px; padding: 4px 8px; border-radius: 10px; font-weight: bold; text-transform: uppercase; }
.pending { background: #fff3cd; color: #856404; }
.completed { background: #d4edda; color: #155724; }
`;

const header = (title) => `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div class="container"><h3>${title}</h3>`;

// =============================================================
// ✅ ROUTES
// =============================================================

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    const txs = await Transaction.find({ userId: u._id }).sort({ date: -1 }).limit(5);

    res.send(`${header('My Wallet')}
        <div class="card wallet-card">
            <small style="opacity:0.8;">BALANCE</small>
            <h1 style="font-size:42px; margin:5px 0;">$ ${u.usdTokenBalance.toFixed(2)}</h1>
        </div>
        
        <div class="card">
            <h4 style="margin:0 0 15px 0;">Deposit Mobile Money</h4>
            <form action="/deposit" method="POST">
                <select name="country">${Object.keys(RATES).map(c => `<option value="${c}">${c}</option>`).join('')}</select>
                <select name="method"><option>M-Pesa</option><option>E-Mola</option><option>Airtel Money</option><option>MTN Momo</option></select>
                <input type="number" name="amount" placeholder="Amount (Local)" required>
                <button>Add Tokens</button>
            </form>
        </div>

        <h4>Recent Activity</h4>
        <div class="card">
            ${txs.length === 0 ? '<p style="color:var(--muted); font-size:14px;">No transactions yet.</p>' : txs.map(t => `
                <div class="history-item">
                    <div>
                        <div style="font-weight:bold; font-size:14px;">+ $${t.amountTokens.toFixed(2)}</div>
                        <small style="color:var(--muted);">${new Date(t.date).toLocaleDateString()}</small>
                    </div>
                    <span class="status-pill ${t.status.toLowerCase()}">${t.status}</span>
                </div>
            `).join('')}
        </div>
        <a href="/logout" style="display:block; text-align:center; color:var(--muted); text-decoration:none; font-size:14px; margin-top:20px;">Logout</a>
    </div></body></html>`);
});

app.post('/deposit', async (req, res) => {
    const { country, method, amount } = req.body;
    const tokenVal = parseFloat(amount) / RATES[country];
    
    await new Transaction({
        userId: req.session.userId,
        amountLocal: parseFloat(amount),
        amountTokens: tokenVal,
        country,
        method,
        status: 'Pending'
    }).save();
    
    res.send("<script>alert('Deposit request logged.'); window.location='/dashboard';</script>");
});

app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u?.isAdmin) return res.send("Denied");
    const pendings = await Transaction.find({ status: 'Pending' });

    res.send(`${header('Admin Approval')}
        ${pendings.length === 0 ? '<p>No pending deposits.</p>' : pendings.map(p => `
            <div class="card">
                <b>Sent:</b> ${p.amountLocal} (${p.country})<br>
                <b>Credit:</b> <span style="color:var(--primary); font-weight:bold;">$${p.amountTokens.toFixed(2)} Tokens</span><br>
                <form action="/approve" method="POST" style="margin-top:10px;">
                    <input type="hidden" name="txId" value="${p._id}">
                    <button style="background:var(--success);">Confirm & Sync Wallet</button>
                </form>
            </div>
        `).join('')}
        <a href="/logout" style="display:block; text-align:center; margin-top:20px;">Exit</a>
    </div></body></html>`);
});

app.post('/approve', async (req, res) => {
    const tx = await Transaction.findById(req.body.txId);
    if (tx && tx.status === 'Pending') {
        tx.status = 'Completed';
        await User.findByIdAndUpdate(tx.userId, { $inc: { usdTokenBalance: tx.amountTokens } });
        await tx.save();
    }
    res.redirect('/admin');
});

// AUTH LOGIC
app.post('/login', async (req, res) => {
    const u = await User.findOne({ email: req.body.email.toLowerCase(), passcode: req.body.passcode });
    if (u) { req.session.userId = u._id; return u.isAdmin ? res.redirect('/admin') : res.redirect('/dashboard'); }
    res.send("Invalid.");
});
app.get('/', (req, res) => res.send(`${header('MarchaFácil Login')}<div class="card"><form action="/login" method="POST"><input type="email" name="email" placeholder="Email"><input type="password" name="passcode" placeholder="PIN"><button>Login</button></form></div></div></body></html>`));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

app.listen(process.env.PORT || 10000);
