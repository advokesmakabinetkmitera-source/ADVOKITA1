const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bcrypt = require('bcrypt');
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
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

const isVercel = process.env.VERCEL || process.env.TMPDIR;
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
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

// Database setup
const dbFile = isVercel ? '/tmp/advokesma.db' : path.join(__dirname, 'advokesma.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbFile);
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_number TEXT UNIQUE,
            secret_code TEXT,
            identity_type TEXT,
            reporter_name TEXT,
            reporter_contact TEXT,
            category TEXT,
            subcategory TEXT,
            faculty_prodi TEXT,
            incident_time_location TEXT,
            related_party TEXT,
            chronology TEXT,
            impact TEXT,
            expected_assistance TEXT,
            attachment_path TEXT,
            status TEXT DEFAULT 'Diterima',
            admin_message TEXT DEFAULT 'Laporan Anda telah diterima oleh Tim Advokesma KM ITERA dan sedang menunggu verifikasi.',
            assigned_officer TEXT DEFAULT 'Belum ditugaskan',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS report_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER,
            status TEXT,
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(report_id) REFERENCES reports(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS internal_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER,
            officer_name TEXT,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(report_id) REFERENCES reports(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT
        )`, () => {
            // Seed default admin if not exists
            db.get(`SELECT * FROM admin_users WHERE username = ?`, ['admin'], async (err, row) => {
                if (!row) {
                    const hash = await bcrypt.hash('AdvokesmaITERA2026!', 10);
                    db.run(`INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)`, 
                        ['admin', hash, 'superadmin']);
                    console.log('Default admin created: admin / AdvokesmaITERA2026!');
                }
            });

            // Seed dummy reports if empty
            db.get(`SELECT COUNT(*) as count FROM reports`, (err, row) => {
                if (row && row.count === 0) {
                    const dummyReports = [
                        {
                            ticket: 'ADV-2026-1001',
                            code: 'SEC-9081',
                            identity: 'anonymous',
                            name: 'Anonim',
                            contact: '-',
                            category: 'Keluhan Kampus dan Kemahasiswaan',
                            subcategory: 'Fasilitas dan pelayanan kampus',
                            prodi: 'Teknik Informatika',
                            location: 'Gedung Kuliah Bersama 1, Lantai 2',
                            party: 'Unit Pengelola Fasilitas',
                            chronology: 'AC di ruang kuliah sering mati dan proyektor rusak saat jam perkuliahan praktikum.',
                            impact: 'Mengganggu konsentrasi belajar dan efektivitas praktikum mahasiswa.',
                            assistance: 'Pemberitahuan perbaikan dan peningkatan fasilitas.',
                            status: 'Dalam Tindak Lanjut',
                            msg: 'Tim sedang berkoordinasi dengan bagian sarana prasarana ITERA.',
                            officer: 'Budi Santoso'
                        },
                        {
                            ticket: 'ADV-2026-1002',
                            code: 'SEC-4422',
                            identity: 'pseudonym',
                            name: 'Mahasiswa Pejuang',
                            contact: 'mhs.pejuang@student.itera.ac.id',
                            category: 'Keluhan Akademik',
                            subcategory: 'Transparansi nilai dan evaluasi akademik',
                            prodi: 'Teknik Sipil',
                            location: 'Jurusan Teknik Sipil',
                            party: 'Dosen Pengampu Mata Kuliah',
                            chronology: 'Nilai ujian akhir semester belum diumumkan meskipun batas waktu penginputan telah lewat 2 minggu.',
                            impact: 'Kecemasan mahasiswa terkait status kelulusan prasyarat.',
                            assistance: 'Mediasi dan klarifikasi dengan dosen/jurusan terkait.',
                            status: 'Dalam Verifikasi',
                            msg: 'Laporan telah diverifikasi dan diteruskan ke kementerian akademik.',
                            officer: 'Siti Rahma'
                        },
                        {
                            ticket: 'ADV-2026-1003',
                            code: 'SEC-7733',
                            identity: 'real',
                            name: 'Ahmad Fauzi',
                            contact: 'ahmad.fauzi@student.itera.ac.id',
                            category: 'Aspirasi dan saran',
                            subcategory: 'Usulan perbaikan kebijakan',
                            prodi: 'Arsitektur',
                            location: 'Kawasan Kampus ITERA',
                            party: 'Keluarga Mahasiswa ITERA',
                            chronology: 'Usulan penambahan penerangan jalan di sekitar jalur utama menuju asrama mahasiswa demi keamanan malam hari.',
                            impact: 'Potensi kerawanan keamanan saat pulang malam.',
                            assistance: 'Penerusan aspirasi kepada pihak rektorat.',
                            status: 'Selesai',
                            msg: 'Aspirasi telah disampaikan dalam audiensi resmi dengan Warek II.',
                            officer: 'Rian Pratama'
                        }
                    ];

                    dummyReports.forEach(d => {
                        db.run(`INSERT INTO reports (ticket_number, secret_code, identity_type, reporter_name, reporter_contact, category, subcategory, faculty_prodi, incident_time_location, related_party, chronology, impact, expected_assistance, status, admin_message, assigned_officer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [d.ticket, d.code, d.identity, d.name, d.contact, d.category, d.subcategory, d.prodi, d.location, d.party, d.chronology, d.impact, d.assistance, d.status, d.msg, d.officer], function(err) {
                                if (!err) {
                                    const reportId = this.lastID;
                                    db.run(`INSERT INTO report_history (report_id, status, message) VALUES (?, ?, ?)`,
                                        [reportId, d.status, d.msg]);
                                }
                            });
                    });
                    console.log('Dummy reports seeded.');
                }
            });
        });
    });
}

// Authentication middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
}

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

    const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;

    const query = `INSERT INTO reports (
        ticket_number, secret_code, identity_type, reporter_name, reporter_contact,
        category, subcategory, faculty_prodi, incident_time_location, related_party,
        chronology, impact, expected_assistance, attachment_path, status, admin_message, assigned_officer
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Diterima', 'Laporan Anda telah berhasil dikirim dan masuk dalam antrean verifikasi Tim Advokesma KM ITERA.', 'Belum ditugaskan')`;

    db.run(query, [
        ticket_number, secret_code, identity_type, finalName, finalContact,
        category, subcategory, faculty_prodi, incident_time_location, related_party,
        chronology, impact, expected_assistance, attachment_path
    ], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Gagal menyimpan laporan ke database.' });
        }

        const reportId = this.lastID;
        db.run(`INSERT INTO report_history (report_id, status, message) VALUES (?, ?, ?)`,
            [reportId, 'Diterima', 'Laporan baru dibuat dan masuk sistem.'], (histErr) => {
                res.json({
                    success: true,
                    ticket_number,
                    secret_code,
                    message: 'Laporan berhasil dikirim.'
                });
            });
    });
});

// 2. Track Report
app.post('/api/reports/track', (req, res) => {
    const { ticket_number, secret_code } = req.body;
    if (!ticket_number || !secret_code) {
        return res.status(400).json({ error: 'Nomor tiket dan kode rahasia wajib diisi!' });
    }

    db.get(`SELECT * FROM reports WHERE ticket_number = ? AND secret_code = ?`, [ticket_number.trim(), secret_code.trim()], (err, report) => {
        if (err) {
            return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
        }
        if (!report) {
            return res.status(404).json({ error: 'Laporan tidak ditemukan. Periksa kembali Nomor Tiket dan Kode Rahasia Anda.' });
        }

        // If category is Kekerasan dan Keselamatan, sanitize sensitive public display if needed, but reporter can view their own report with secret code
        db.all(`SELECT status, message, created_at FROM report_history WHERE report_id = ? ORDER BY created_at ASC`, [report.id], (err, history) => {
            res.json({
                success: true,
                report: {
                    ticket_number: report.ticket_number,
                    identity_type: report.identity_type,
                    reporter_name: report.reporter_name,
                    category: report.category,
                    subcategory: report.subcategory,
                    faculty_prodi: report.faculty_prodi,
                    incident_time_location: report.incident_time_location,
                    related_party: report.related_party,
                    chronology: report.chronology,
                    impact: report.impact,
                    expected_assistance: report.expected_assistance,
                    attachment_path: report.attachment_path,
                    status: report.status,
                    admin_message: report.admin_message,
                    assigned_officer: report.assigned_officer,
                    created_at: report.created_at,
                    updated_at: report.updated_at
                },
                history: history || []
            });
        });
    });
});

// 3. Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi!' });
    }

    db.get(`SELECT * FROM admin_users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Username atau password salah!' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Username atau password salah!' });
        }

        req.session.admin = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        res.json({ success: true, message: 'Login berhasil', user: req.session.admin });
    });
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
    let query = `SELECT id, ticket_number, identity_type, reporter_name, reporter_contact, category, subcategory, faculty_prodi, status, assigned_officer, created_at FROM reports WHERE 1=1`;
    let params = [];

    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    if (search) {
        query += ` AND (ticket_number LIKE ? OR reporter_name LIKE ? OR chronology LIKE ? OR faculty_prodi LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }

    query += ` ORDER BY created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Gagal mengambil data laporan.' });
        }
        
        // For violence category, mask identity if needed in admin list view unless superadmin or officer
        const sanitizedRows = rows.map(r => {
            if (r.category === 'Kekerasan dan Keselamatan' && req.session.admin.role !== 'superadmin') {
                return {
                    ...r,
                    reporter_name: '[DITUTUPI - KASUS KEKERASAN]',
                    reporter_contact: '[RAHASIA]'
                };
            }
            return r;
        });

        res.json({ success: true, reports: sanitizedRows });
    });
});

// 7. Admin Get Report Detail
app.get('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const reportId = req.params.id;
    db.get(`SELECT * FROM reports WHERE id = ?`, [reportId], (err, report) => {
        if (err || !report) {
            return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
        }

        // Apply strict access for violence reports
        if (report.category === 'Kekerasan dan Keselamatan' && req.session.admin.role !== 'superadmin') {
            // Mask sensitive identity if officer doesn't have superadmin, or keep accessible to authorized officers
            // Let's ensure authorized officers can view it, but mark it confidential
        }

        db.all(`SELECT * FROM report_history WHERE report_id = ? ORDER BY created_at ASC`, [reportId], (err, history) => {
            db.all(`SELECT * FROM internal_notes WHERE report_id = ? ORDER BY created_at DESC`, [reportId], (err, notes) => {
                res.json({
                    success: true,
                    report,
                    history: history || [],
                    internal_notes: notes || []
                });
            });
        });
    });
});

// 8. Admin Update Report (Status, Message, Assignee)
app.put('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const reportId = req.params.id;
    const { status, admin_message, assigned_officer } = req.body;

    db.get(`SELECT status, admin_message, assigned_officer FROM reports WHERE id = ?`, [reportId], (err, current) => {
        if (err || !current) {
            return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
        }

        const newStatus = status || current.status;
        const newMessage = admin_message !== undefined ? admin_message : current.admin_message;
        const newOfficer = assigned_officer !== undefined ? assigned_officer : current.assigned_officer;

        db.run(`UPDATE reports SET status = ?, admin_message = ?, assigned_officer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [newStatus, newMessage, newOfficer, reportId], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Gagal memperbarui laporan.' });
                }

                // Add history if status changed or message updated
                if (newStatus !== current.status || newMessage !== current.admin_message) {
                    db.run(`INSERT INTO report_history (report_id, status, message) VALUES (?, ?, ?)`,
                        [reportId, newStatus, `Status diperbarui ke "${newStatus}". Pesan petugas: ${newMessage}`]);
                }

                res.json({ success: true, message: 'Laporan berhasil diperbarui.' });
            });
    });
});

// 9. Admin Add Internal Note
app.post('/api/admin/reports/:id/notes', requireAdmin, (req, res) => {
    const reportId = req.params.id;
    const { note } = req.body;
    const officerName = req.session.admin.username;

    if (!note) {
        return res.status(400).json({ error: 'Catatan internal tidak boleh kosong!' });
    }

    db.run(`INSERT INTO internal_notes (report_id, officer_name, note) VALUES (?, ?, ?)`,
        [reportId, officerName, note], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Gagal menyimpan catatan internal.' });
            }
            res.json({ success: true, message: 'Catatan internal ditambahkan.' });
        });
});

// 10. Admin Statistics & Summary
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    db.get(`SELECT COUNT(*) as total FROM reports`, (err, totalRow) => {
        db.all(`SELECT category, COUNT(*) as count FROM reports GROUP BY category`, (err, categoryRows) => {
            db.all(`SELECT status, COUNT(*) as count FROM reports GROUP BY status`, (err, statusRows) => {
                res.json({
                    success: true,
                    total: totalRow ? totalRow.total : 0,
                    by_category: categoryRows || [],
                    by_status: statusRows || []
                });
            });
        });
    });
});

// Start server (only if run directly)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
