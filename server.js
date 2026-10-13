const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
    secret: 'advokesma-km-itera-secure-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Upload Setup (/tmp untuk Vercel)
const isVercel = process.env.VERCEL || process.env.TMPDIR;
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
        console.error('Failed to create upload dir:', e);
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// In-Memory Database (Penyimpanan sementara di memory agar tidak crash di Vercel)
const reports = [
    {
        id: 1,
        ticket_number: 'ADV-2026-1001',
        secret_code: 'SEC-9081',
        identity_type: 'anonymous',
        reporter_name: 'Anonim',
        reporter_contact: '-',
        category: 'Keluhan Kampus dan Kemahasiswaan',
        subcategory: 'Fasilitas dan pelayanan kampus',
        faculty_prodi: 'Teknik Informatika',
        incident_time_location: 'Gedung Kuliah Bersama 1, Lantai 2',
        related_party: 'Unit Pengelola Fasilitas',
        chronology: 'AC di ruang kuliah sering mati dan proyektor rusak saat jam perkuliahan praktikum.',
        impact: 'Mengganggu konsentrasi belajar dan efektivitas praktikum mahasiswa.',
        expected_assistance: 'Pemberitahuan perbaikan dan peningkatan fasilitas.',
        status: 'Dalam Tindak Lanjut',
        admin_message: 'Tim sedang berkoordinasi dengan bagian sarana prasarana ITERA.',
        assigned_officer: 'Budi Santoso',
        created_at: new Date().toISOString()
    }
];

const report_history = [
    {
        report_id: 1,
        status: 'Dalam Tindak Lanjut',
        message: 'Tim sedang berkoordinasi dengan bagian sarana prasarana ITERA.',
        created_at: new Date().toISOString()
    }
];

// Helper Auth Middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
}

// --- API ROUTES ---

app.post('/api/reports', upload.single('attachment'), (req, res) => {
    const { category, chronology, consent, identity_type, reporter_name, reporter_contact } = req.body;
    if (!category || !chronology || !consent) {
        return res.status(400).json({ error: 'Kategori, kronologi, dan persetujuan wajib diisi!' });
    }

    const ticket_number = `ADV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const secret_code = `SEC-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newReport = {
        id: reports.length + 1,
        ticket_number,
        secret_code,
        identity_type: identity_type || 'anonymous',
        reporter_name: reporter_name || 'Anonim',
        reporter_contact: reporter_contact || '-',
        category,
        chronology,
        status: 'Diterima',
        admin_message: 'Laporan Anda telah berhasil dikirim.',
        assigned_officer: 'Belum ditugaskan',
        created_at: new Date().toISOString()
    };

    reports.push(newReport);
    report_history.push({
        report_id: newReport.id,
        status: 'Diterima',
        message: 'Laporan baru dibuat.',
        created_at: new Date().toISOString()
    });

    res.json({ success: true, ticket_number, secret_code, message: 'Laporan berhasil dikirim.' });
});

app.post('/api/reports/track', (req, res) => {
    const { ticket_number, secret_code } = req.body;
    const report = reports.find(r => r.ticket_number === ticket_number?.trim() && r.secret_code === secret_code?.trim());
    
    if (!report) {
        return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
    }

    const history = report_history.filter(h => h.report_id === report.id);
    res.json({ success: true, report, history });
});

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'AdvokesmaITERA2026!') {
        req.session.admin = { id: 1, username: 'admin', role: 'superadmin' };
        return res.json({ success: true, message: 'Login berhasil', user: req.session.admin });
    }
    res.status(401).json({ error: 'Username atau password salah!' });
});

app.get('/api/admin/check', (req, res) => {
    if (req.session && req.session.admin) {
        res.json({ loggedIn: true, user: req.session.admin });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/api/admin/reports', requireAdmin, (req, res) => {
    res.json({ success: true, reports });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
    res.json({
        success: true,
        total: reports.length,
        by_category: [],
        by_status: []
    });
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
