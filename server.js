const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ DATABASE CONNECTION
// =============================================================
const dbUser = "boliagloire0_db_user"; 
const dbPass = encodeURIComponent("George1933@"); 
const cluster = "cluster0.e1lz0pj.mongodb.net";

const MONGO_URI = `mongodb+srv://${dbUser}:${dbPass}@${cluster}/marchafacil?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Cluster"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'marchafacil_secure_key_2026', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ USER SCHEMA (Updated with Transfer Logic)
// =============================================================
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, unique: true },
    passcode: String,
    name: String,
    isAdmin: { type: Boolean, default: false },
    mznTokenBalance: { type: Number, default: 0 },
    usdTokenBalance: { type: Number, default: 0 },
    pendingDeposit: { amount: Number, currency: String, status: { type: String, default: "None" } },
    transactions: [{ type: { type: String }, amount: Number, currency: String, date: String, note: String }]
}));

// =============================================================
// ✅ UI STYLES
// =============================================================
const css = `
    body { background: #0b0e11; color: white; font-family: sans-serif; margin: 0; padding: 15px; }
    .container { max-width: 450px; margin: auto; }
    .card { background: #1c2026; padding: 20px; border-radius: 15px; margin-bottom: 15px; border: 1px solid #2a2f38; }
    .balance-box { background: linear-gradient(135deg, #194bfd, #6e00ff); padding: 25px; border-radius: 20px; text-align: center; margin-bottom: 20px;}
    input, select { width: 100%; padding: 14px; margin: 8px 0; border-radius: 10px; border: none; background: #000; color: white; box-sizing: border-box; }
    button { width: 100%; padding: 15px; background: #194bfd; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold; margin-top: 5px; }
    .badge { background: orange; color: black; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: bold; }
`;

// =============================================================
// ✅ AUTH & REGISTRATION
// =============================================================
app.get('/', (req, res) => res.send(`<html><style>${css}</style><body><div class="container" style="text-align:center; margin-top:80px;"><h1>MARCHAFÁCIL</h1><form action="/login" method="POST"><input name="email" placeholder="Email" required><input type="password" name="passcode" placeholder="Passcode" required><button>Login</button></form><br><a href="/signup" style="color:#848e9c; text-decoration:none;">Create Account</a></div></body></html>`));

app.get('/signup', (req, res) => res.send(`<html><style>${css}</style><body><div class="container" style="text-align:center; margin-top:80px;"><h1>Sign Up</h1><form action="/register" method="POST"><input name="name" placeholder="Full Name" required><input name="email" placeholder="Email" required><input type="password" name="passcode" placeholder="Passcode" required><button>Register</button></form></div></body></html>`));

app.post('/register', async (req, res) => {
    try {
        const newUser = new User({ name: req.body.name, email: req.body.email.toLowerCase().trim(), passcode: req.body.passcode.trim() });
        await newUser.save();
        res.send("Success! <a href='/'>Login</a>");
    } catch (e) { res.send("Error: Email exists."); }
});

app.post('/login', async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const pass = req.body.passcode.trim();
    if (email === "swedbank.bolia@icloud.com" && pass === "George1933@") {
        const admin = await User.findOneAndUpdate({ email }, { isAdmin: true, passcode: pass, name: "Admin" }, { upsert: true, new: true });
        req.session.userId = admin._id;
        return res.redirect('/admin');
    }
    const user = await User.findOne({ email, passcode: pass });
    if (user) { req.session.userId = user._id; return res.redirect(user.isAdmin ? '/admin' : '/dashboard'); }
    res.send("Invalid. <a href='/'>Try Again</a>");
});

// =============================================================
// ✅ DASHBOARD & CORE FEATURES
// =============================================================
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    res.send(`<html><style>${css}</style><body><div class="container">
        <div class="balance-box">
            <small>USD TOKEN</small><h2>$ ${u.usdTokenBalance.toFixed(2)}</h2>
            <hr style="opacity:0.1">
            <small>MZN TOKEN</small><h2>MT ${u.mznTokenBalance.toFixed(2)}</h2>
        </div>

        <div class="card">
            <h3>Deposit</h3>
            <form action="/dep" method="POST">
                <select name="currency"><option value="MZN">Metical (MZN)</option><option value="USD">Dollar (USD)</option></select>
                <input type="number" name="amount" placeholder="Amount" required><button>Notify Admin</button>
            </form>
            ${u.pendingDeposit.status === "Pending" ? `<p class="badge">Pending: ${u.pendingDeposit.amount} ${u.pendingDeposit.currency}</p>` : ''}
        </div>

        <div class="card">
            <h3>Send Tokens</h3>
            <form action="/transfer" method="POST">
                <input name="recipientEmail" placeholder="Recipient Email" required>
                <select name="currency"><option value="MZN">MZN Tokens</option><option value="USD">USD Tokens</option></select>
                <input type="number" name="amount" placeholder="Amount" required><button style="background:#00c853">Transfer Instantly</button>
            </form>
        </div>

        <h3>History</h3>
        ${u.transactions.slice(-5).reverse().map(t => `<div class="card"><small>${t.date}</small><br>${t.type}: ${t.amount} ${t.currency} ${t.note ? `<br><i>${t.note}</i>` : ''}</div>`).join('')}
    </div></body></html>`);
});

// DEPOSIT NOTIFICATION
app.post('/dep', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { pendingDeposit: { amount: parseFloat(req.body.amount), currency: req.body.currency, status: "Pending" } });
    res.redirect('/dashboard');
});

// P2P TRANSFER LOGIC
app.post('/transfer', async (req, res) => {
    const { recipientEmail, currency, amount } = req.body;
    const amt = parseFloat(amount);
    const sender = await User.findById(req.session.userId);
    const recipient = await User.findOne({ email: recipientEmail.toLowerCase().trim() });

    if (!recipient) return res.send("User not found. <a href='/dashboard'>Go Back</a>");
    if (sender.email === recipient.email) return res.send("Cannot send to yourself.");

    const balanceKey = currency === "MZN" ? "mznTokenBalance" : "usdTokenBalance";
    if (sender[balanceKey] < amt) return res.send("Insufficient balance.");

    // Deduct from sender
    sender[balanceKey] -= amt;
    sender.transactions.push({ type: "Transfer Sent", amount: amt, currency, date: new Date().toLocaleDateString(), note: `To: ${recipient.email}` });
    
    // Add to recipient
    recipient[balanceKey] += amt;
    recipient.transactions.push({ type: "Transfer Received", amount: amt, currency, date: new Date().toLocaleDateString(), note: `From: ${sender.email}` });

    await sender.save();
    await recipient.save();
    res.redirect('/dashboard');
});

// =============================================================
// ✅ ADMIN PANEL
// =============================================================
app.get('/admin', async (req, res) => {
    const u = await User.findById(req.session.userId);
    if (!u || !u.isAdmin) return res.redirect('/');
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    res.send(`<html><style>${css}</style><body><div class="container">
        <h2>Admin Approvals</h2>
        ${pendings.map(p => `<div class="card">
            <b>${p.email}</b><br>Amount: ${p.pendingDeposit.amount} ${p.pendingDeposit.currency}
            <form action="/confirm" method="POST">
                <input type="hidden" name="uid" value="${p._id}"><button style="background:#00c853">Approve Deposit</button>
            </form>
        </div>`).join('') || '<p>No pending deposits.</p>'}
        <a href="/dashboard">Go to My Dashboard</a>
    </div></body></html>`);
});

app.post('/confirm', async (req, res) => {
    const u = await User.findById(req.body.uid);
    if (u && u.pendingDeposit.status === "Pending") {
        const { amount, currency } = u.pendingDeposit;
        currency === "MZN" ? u.mznTokenBalance += amount : u.usdTokenBalance += amount;
        u.transactions.push({ type: "Deposit", amount, currency, date: new Date().toLocaleDateString() });
        u.pendingDeposit.status = "Completed";
        await u.save();
    }
    res.redirect('/admin');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Live on ${PORT}`));
