const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const app = express();

// =============================================================
// ✅ DATABASE CONNECTION (Fixed Credentials)
// =============================================================
const dbUser = "boliagloire0"; 
const dbPass = encodeURIComponent("George1933@"); 
const cluster = "cluster0.e1lz0pj.mongodb.net";

const MONGO_URI = `mongodb+srv://${dbUser}:${dbPass}@${cluster}/marchafacil?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MarchaFácil Connected to Cluster0"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'marchafacil_secure_2026', resave: false, saveUninitialized: true }));

// =============================================================
// ✅ USER SCHEMA
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
// ✅ UI THEME
// =============================================================
const theme = `
    <style>
        body { background: #0b0e11; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .box { background: #1c2026; padding: 30px; border-radius: 20px; width: 90%; max-width: 380px; text-align: center; border: 1px solid #2a2f38; }
        .card { background: #000; padding: 15px; border-radius: 12px; margin-top: 15px; text-align: left; border: 1px solid #333; }
        input, select { width: 100%; padding: 14px; margin: 8px 0; border-radius: 10px; border: none; background: #000; color: white; box-sizing: border-box; font-size: 16px; }
        button { width: 100%; padding: 15px; background: #194bfd; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 10px; }
        .balance { font-size: 24px; font-weight: bold; color: #00c853; margin: 10px 0; }
        a { color: #848e9c; text-decoration: none; font-size: 13px; display: block; margin-top: 15px; }
    </style>
`;

// =============================================================
// ✅ ROUTES
// =============================================================

app.get('/', (req, res) => {
    res.send(`<html>${theme}<body><div class="box">
        <h1>MARCHAFÁCIL</h1>
        <form action="/login" method="POST">
            <input name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="Passcode" required>
            <button type="submit">Login</button>
        </form>
        <a href="/signup">Create Account</a>
    </div></body></html>`);
});

app.get('/signup', (req, res) => {
    res.send(`<html>${theme}<body><div class="box">
        <h1>Sign Up</h1>
        <form action="/register" method="POST">
            <input name="name" placeholder="Full Name" required>
            <input name="email" placeholder="Email" required>
            <input type="password" name="passcode" placeholder="Passcode" required>
            <button type="submit">Register</button>
        </form>
        <a href="/">Back to Login</a>
    </div></body></html>`);
});

app.post('/register', async (req, res) => {
    try {
        const newUser = new User({ 
            name: req.body.name, 
            email: req.body.email.toLowerCase().trim(), 
            passcode: req.body.passcode.trim() 
        });
        await newUser.save();
        res.send(`<html>${theme}<body><div class="box"><h2>Success!</h2><a href="/">Login Now</a></div></body></html>`);
    } catch (e) { res.send("Error: Email already exists."); }
});

app.post('/login', async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const pass = req.body.passcode.trim();

    if (email === "swedbank.bolia@icloud.com" && pass === "George1933@") {
        const admin = await User.findOneAndUpdate(
            { email }, { isAdmin: true, passcode: pass, name: "Admin" }, { upsert: true, new: true }
        );
        req.session.userId = admin._id;
        return res.redirect('/admin');
    }

    const user = await User.findOne({ email, passcode: pass });
    if (user) {
        req.session.userId = user._id;
        return res.redirect(user.isAdmin ? '/admin' : '/dashboard');
    }
    res.send(`<html>${theme}<body><div class="box"><h2>Invalid</h2><a href="/">Try Again</a></div></body></html>`);
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    res.send(`<html>${theme}<body><div class="box">
        <h2>Dashboard</h2>
        <div class="card">
            <small>MZN Tokens</small><div class="balance">MT ${u.mznTokenBalance.toFixed(2)}</div>
            <small>USD Tokens</small><div class="balance">$ ${u.usdTokenBalance.toFixed(2)}</div>
        </div>
        <div class="card">
            <h3>Deposit</h3>
            <form action="/dep" method="POST">
                <select name="currency"><option value="MZN">MZN</option><option value="USD">USD</option></select>
                <input type="number" name="amount" placeholder="Amount" required>
                <button>Notify Admin</button>
            </form>
        </div>
        <a href="/">Logout</a>
    </div></body></html>`);
});

app.post('/dep', async (req, res) => {
    await User.findByIdAndUpdate(req.session.userId, { 
        pendingDeposit: { amount: parseFloat(req.body.amount), currency: req.body.currency, status: "Pending" } 
    });
    res.redirect('/dashboard');
});

app.get('/admin', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const u = await User.findById(req.session.userId);
    if (!u.isAdmin) return res.redirect('/dashboard');
    const pendings = await User.find({ "pendingDeposit.status": "Pending" });
    res.send(`<html>${theme}<body><div class="box">
        <h2>Admin Panel</h2>
        ${pendings.map(p => `
            <div class="card">
                <b>${p.email}</b><br>${p.pendingDeposit.amount} ${p.pendingDeposit.currency}
                <form action="/confirm" method="POST">
                    <input type="hidden" name="uid" value="${p._id}">
                    <button style="background:#00c853">Approve</button>
                </form>
            </div>
        `).join('') || '<p>No pending deposits.</p>'}
        <a href="/dashboard">My Dashboard</a>
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
app.listen(PORT, () => console.log(`🚀 MarchaFácil Live`));
