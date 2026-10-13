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

// Folder Statis (Mengarahkan ke folder public dan uploads)
app.use(express.static(path.join(__dirname, 'public')));

const isVercel = process.env.VERCEL || process.env.TMPDIR;
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
        console.error('Failed to create upload dir:', e);
    }
}
app.use('/uploads', express.static(uploadDir));

// Session configuration
app.use(session({
    secret: 'advokesma-km-itera-secure-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Multer setup for attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extName && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar (JPEG/PNG), PDF, dan Dokumen (DOC/DOCX) yang diizinkan!'));
        }
    }
});

// Mock Database (Penyimpanan sementara agar aplikasi berjalan mulus di Vercel Serverless)
let reports = [
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

let report_history = [
    {
        report_id: 1,
        status: 'Dalam Tindak Lanjut',
        message: 'Tim sedang berkoordinasi dengan bagian sarana prasarana ITERA.',
        created_at: new Date().toISOString()
    }
];

let internal_notes = [];

// Helper Authentication Middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
}

// --- ROUTE UTAMA (Agar tidak Cannot GET /) ---
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('<h1>Server Advokesma KM ITERA Berjalan!</h1><p>File index.html belum ditemukan di dalam folder public.</p>');
    }
});

// --- API ROUTES ---

// 1. Submit Report
app.post('/api/reports', upload.single('attachment'), (req, res) => {
    const {
        identity_type,
        reporter_name,
        reporter_contact,
        category,
        subcategory,
        faculty_prodi,
        incident_time_location,
        related_party,
        chronology,
        impact,
        expected_assistance,
        consent
    } = req.body;

    if (!category || !chronology || !consent) {
        return res.status(400).json({ error: 'Kategori, kronologi kejadian, dan persetujuan kebijakan wajib diisi!' });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticket_number = `ADV-2026-${randomNum}`;
    const secret_code = `SEC-${Math.floor(1000 + Math.random() * 9000)}`;
    
    let finalName = 'Anonim';
    let finalContact = '-';

    if (identity_type === 'real') {
        finalName = reporter_name || 'Tanpa Nama';
        finalContact = reporter_contact || '-';
    } else if (identity_type === 'pseudonym') {
        finalName = reporter_name || 'Nama Samaran';
        finalContact = reporter_contact || '-';
    }

    const newReport = {
        id: reports.length + 1,
        ticket_number,
        secret_code,
        identity_type: identity_type || 'anonymous',
        reporter_name: finalName,
        reporter_contact: finalContact,
        category,
        subcategory: subcategory || '-',
        faculty_prodi: faculty_prodi || '-',
        incident_time_location: incident_time_location || '-',
        related_party: related_party || '-',
        chronology,
        impact: impact || '-',
        expected_assistance: expected_assistance || '-',
        attachment_path: req.file ? `/uploads/${req.file.filename}` : null,
        status: 'Diterima',
        admin_message: 'Laporan Anda telah berhasil dikirim dan masuk dalam antrean verifikasi Tim Advokesma KM ITERA.',
        assigned_officer: 'Belum ditugaskan',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    reports.unshift(newReport);
    report_history.push({
        report_id: newReport.id,
        status: 'Diterima',
        message: 'Laporan baru dibuat dan masuk sistem.',
        created_at: new Date().toISOString()
    });

    res.json({
        success: true,
        ticket_number,
        secret_code,
        message: 'Laporan berhasil dikirim.'
    });
});

// 2. Track Report
app.post('/api/reports/track', (req, res) => {
    const { ticket_number, secret_code } = req.body;
    if (!ticket_number || !secret_code) {
        return res.status(400).json({ error: 'Nomor tiket dan kode rahasia wajib diisi!' });
    }

    const report = reports.find(r => r.ticket_number === ticket_number.trim() && r.secret_code === secret_code.trim());
    if (!report) {
        return res.status(404).json({ error: 'Laporan tidak ditemukan. Periksa kembali Nomor Tiket dan Kode Rahasia Anda.' });
    }

    const history = report_history.filter(h => h.report_id === report.id);
    res.json({
        success: true,
        report,
        history: history || []
    });
});

// 3. Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi!' });
    }

    if (username === 'admin' && password === 'AdvokesmaITERA2026!') {
        req.session.admin = {
            id: 1,
            username: 'admin',
            role: 'superadmin'
        };
        return res.json({ success: true, message: 'Login berhasil', user: req.session.admin });
    }

    res.status(401).json({ error: 'Username atau password salah!' });
});

// 4. Admin Logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Logout berhasil' });
    });
});

// 5. Admin Check Session
app.get('/api/admin/check', (req, res) => {
    if (req.session && req.session.admin) {
        res.json({ loggedIn: true, user: req.session.admin });
    } else {
        res.json({ loggedIn: false });
    }
});

// 6. Admin Get Reports
app.get('/api/admin/reports', requireAdmin, (req, res) => {
    const { category, status, search } = req.query;
    let filtered = [...reports];

    if (category) {
        filtered = filtered.filter(r => r.category === category);
    }
    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }
    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(r => 
            r.ticket_number.toLowerCase().includes(s) || 
            r.reporter_name.toLowerCase().includes(s) || 
            r.chronology.toLowerCase().includes(s) || 
            r.faculty_prodi.toLowerCase().includes(s)
        );
    }

    res.json({ success: true, reports: filtered });
});

// 7. Admin Get Report Detail
app.get('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const reportId = parseInt(req.params.id);
    const report = reports.find(r => r.id === reportId);
    if (!report) {
        return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
    }

    const history = report_history.filter(h => h.report_id === reportId);
    const notes = internal_notes.filter(n => n.report_id === reportId);

    res.json({
        success: true,
        report,
        history,
        internal_notes: notes
    });
});

// 8. Admin Update Report
app.put('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const reportId = parseInt(req.params.id);
    const { status, admin_message, assigned_officer } = req.body;

    const report = reports.find(r => r.id === reportId);
    if (!report) {
        return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
    }

    report.status = status || report.status;
    report.admin_message = admin_message !== undefined ? admin_message : report.admin_message;
    report.assigned_officer = assigned_officer !== undefined ? assigned_officer : report.assigned_officer;
    report.updated_at = new Date().toISOString();

    report_history.push({
        report_id: reportId,
        status: report.status,
        message: `Status diperbarui ke "${report.status}". Pesan: ${report.admin_message}`,
        created_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'Laporan berhasil diperbarui.' });
});

// 9. Admin Add Internal Note
app.post('/api/admin/reports/:id/notes', requireAdmin, (req, res) => {
    const reportId = parseInt(req.params.id);
    const { note } = req.body;
    const officerName = req.session.admin.username;

    if (!note) {
        return res.status(400).json({ error: 'Catatan internal tidak boleh kosong!' });
    }

    internal_notes.unshift({
        report_id: reportId,
        officer_name: officerName,
        note,
        created_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'Catatan internal ditambahkan.' });
});

// 10. Admin Statistics
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const byCategoryMap = {};
    const byStatusMap = {};

    reports.forEach(r => {
        byCategoryMap[r.category] = (byCategoryMap[r.category] || 0) + 1;
        byStatusMap[r.status] = (byStatusMap[r.status] || 0) + 1;
    });

    res.json({
        success: true,
        total: reports.length,
        by_category: Object.keys(byCategoryMap).map(cat => ({ category: cat, count: byCategoryMap[cat] })),
        by_status: Object.keys(byStatusMap).map(st => ({ status: st, count: byStatusMap[st] }))
    });
});

// Jalankan lokal jika tidak di Vercel
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Ekspor modul untuk Vercel Serverless
module.exports = app;
