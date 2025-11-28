/* Simple CRUD tanpa DB — menyimpan di localStorage
    Fitur: tambah, baca, edit (modal lengkap), hapus, cari, reset semua
    Tambahan: Impor/Ekspor JSON, Pemberitahuan Kustom (mengganti alert/confirm), Count Data
*/

const KEY = 'db_mahasiswa_v1';
let db = JSON.parse(localStorage.getItem(KEY) || '[]');
let isResetMode = false; // Flag untuk membedakan mode Hapus dan Reset Total

// --- Elemen Utama ---
const form = document.getElementById('mahasiswaForm');
const tableBody = document.querySelector('#mahasiswaTable tbody');
const searchInput = document.getElementById('search');
const clearStorageBtn = document.getElementById('clearStorage');
const resetBtn = document.getElementById('resetBtn');
const dataCountEl = document.getElementById('dataCount');
const emptyTableMessage = document.getElementById('emptyTableMessage');
const mahasiswaTable = document.getElementById('mahasiswaTable');

// --- Modal Edit ---
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editProdiSelect = document.getElementById('editProdi');

// --- Modal Delete & Reset Confirmation ---
const deleteModal = document.getElementById('deleteModal');
const deleteNameDisplay = document.getElementById('deleteNameDisplay');
const deleteNimDisplay = document.getElementById('deleteNimDisplay');
const confirmDelete = document.getElementById('confirmDelete');
let deleteIndex = null;

// --- Impor/Ekspor ---
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const fileInput = document.getElementById('fileInput');

// --- Inisialisasi Awal ---
(function init() {
    loadDB();
    renderTable();
    attachNav();
    attachListeners();
    populateProdiOptions();
})();

// Mengisi opsi Prodi ke Modal Edit
function populateProdiOptions() {
    const prodiOptions = Array.from(document.getElementById('prodi').options)
        .filter(opt => opt.value !== '')
        .map(opt => `<option value="${opt.value}">${opt.textContent}</option>`)
        .join('');
    editProdiSelect.innerHTML = prodiOptions;
}

// Memuat data dari localStorage saat startup
function loadDB() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
        try {
            db = JSON.parse(raw);
        } catch (e) {
            db = [];
            showToast('Kesalahan memuat data dari LocalStorage.', 'error');
        }
    }
}

// --- Fungsionalitas Umum ---

// Simpan ke localStorage
function saveDB() {
    localStorage.setItem(KEY, JSON.stringify(db));
    updateDataCount();
}

// Update jumlah data
function updateDataCount() {
    dataCountEl.textContent = db.length;
}

// Custom Toast/Pesan sementara (mengganti alert)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fixed bottom-5 right-5 p-3 rounded-xl shadow-lg text-sm text-white transition-opacity duration-300`;
    toast.textContent = message;

    toast.style.backgroundColor = type === 'error' ? 'var(--color-danger)' : 'var(--color-success)';
    toast.style.zIndex = 9999;

    document.body.appendChild(toast);

    // Hapus setelah 3 detik
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// Membaca form pendaftaran
function readForm() {
    return {
        nama: document.getElementById('nama').value.trim(),
        nim: document.getElementById('nim').value.trim(),
        jenisKelamin: document.getElementById('jenisKelamin').value,
        tempatLahir: document.getElementById('tempatLahir').value.trim(),
        tanggalLahir: document.getElementById('tanggalLahir').value,
        golonganDarah: document.getElementById('golonganDarah').value,
        agama: document.getElementById('agama').value,
        alamat: document.getElementById('alamat').value.trim(),
        telepon: document.getElementById('telepon').value.trim(),
        prodi: document.getElementById('prodi').value,
        dosen: document.getElementById('dosen').value.trim(),
        angkatan: document.getElementById('angkatan').value,
        createdAt: new Date().toISOString()
    };
}

// Escape HTML untuk keamanan
function escapeHtml(s) {
    if (!s) return '';
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

// --- Fungsionalitas Listener ---

function attachListeners() {
    // 1. Submit Form Pendaftaran
    form.addEventListener('submit', handleFormSubmit);

    // 2. Tombol Bersihkan Form
    resetBtn.addEventListener('click', () => form.reset());

    // 3. Search Input
    searchInput.addEventListener('input', () => renderTable(searchInput.value));

    // 4. Reset Semua Data
    clearStorageBtn.addEventListener('click', openResetConfirmation);

    // 5. Konfirmasi Hapus/Reset
    confirmDelete.addEventListener('click', handleConfirmation);

    // 6. Form Edit (menggunakan submit event)
    editForm.addEventListener('submit', handleEditSubmit);

    // Tombol Batal di Modal Edit
    document.getElementById('cancelEdit').addEventListener('click', () => {
        editModal.close();
    });

    // 7. Import/Export
    importBtn.addEventListener('click', () => fileInput.click());
    exportBtn.addEventListener('click', handleExport);
    fileInput.addEventListener('change', handleImport);
}


// Navigasi sidebar
function attachNav() {
    document.querySelectorAll('.sidebar nav a').forEach(a => {
        a.addEventListener('click', () => {
            document.querySelectorAll('.sidebar nav a').forEach(x => x.classList.remove('active'));
            a.classList.add('active');

            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById(a.dataset.section).classList.add('active');

            // Render ulang tabel saat pindah ke section Daftar Mahasiswa
            if (a.dataset.section === 'table') {
                renderTable(searchInput.value);
            }
        });
    });
}


// --- CRUD Handlers ---

function handleFormSubmit(e) {
    e.preventDefault();
    const data = readForm();

    // Validasi NIM unik
    if (db.some(d => d.nim === data.nim)) {
        showToast(`NIM ${data.nim} sudah terdaftar. Gunakan tombol 'Edit' untuk mengubah data.`, 'error');
        return;
    }

    db.push(data);
    saveDB();
    form.reset();
    renderTable();
    showToast('Data mahasiswa berhasil ditambahkan!', 'success');
}

// Render Tabel
function renderTable(filter = '') {
    tableBody.innerHTML = '';
    updateDataCount(); // Pastikan hitungan selalu update

    const filteredData = db.filter(d => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (
            (d.nama || '').toLowerCase().includes(q) ||
            (d.nim || '').toLowerCase().includes(q) ||
            (d.prodi || '').toLowerCase().includes(q)
        );
    });

    if (filteredData.length === 0) {
        if (filter) {
            emptyTableMessage.textContent = 'Tidak ada data yang cocok dengan kriteria pencarian.';
        } else {
            emptyTableMessage.textContent = 'Belum ada data mahasiswa yang tersimpan.';
        }
        emptyTableMessage.style.display = 'block';
        mahasiswaTable.style.display = 'none';
        return;
    }

    emptyTableMessage.style.display = 'none';
    mahasiswaTable.style.display = 'table';

    filteredData.forEach((d, i) => {
        // Cari index asli di DB, bukan index di filteredData
        const originalIndex = db.findIndex(item => item.nim === d.nim);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(d.nama)}</td>
            <td>${escapeHtml(d.nim)}</td>
            <td>${escapeHtml(d.prodi)}</td>
            <td>${escapeHtml(d.telepon || '—')}</td>
            <td>${escapeHtml(d.angkatan || '—')}</td>
            <td class="actions">
                <button class="edit" data-index="${originalIndex}">Edit</button>
                <button class="del" data-index="${originalIndex}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    attachTableButtons();
}

// Pasang event listener untuk tombol Edit & Hapus di tabel
function attachTableButtons() {
    document.querySelectorAll('.actions .edit').forEach(b => {
        b.onclick = () => openEdit(parseInt(b.dataset.index, 10));
    });

    document.querySelectorAll('.actions .del').forEach(b => {
        b.onclick = () => openDelete(parseInt(b.dataset.index, 10));
    });
}

// --- Modal Edit Logic ---

function openEdit(index) {
    const d = db[index];

    // Isi semua fields di modal edit
    document.getElementById('editIndex').value = index;
    document.getElementById('editNama').value = d.nama;
    document.getElementById('editNim').value = d.nim;
    document.getElementById('editProdi').value = d.prodi;
    document.getElementById('editDosen').value = d.dosen;
    document.getElementById('editJenisKelamin').value = d.jenisKelamin;
    document.getElementById('editTelepon').value = d.telepon;
    document.getElementById('editAngkatan').value = d.angkatan;

    // Pastikan modal reset kembali ke mode 'Edit'
    document.querySelector('#deleteModal h3').textContent = 'Edit Mahasiswa'; 

    editModal.showModal();
}

function handleEditSubmit(e) {
    e.preventDefault(); // Mencegah form menutup modal jika ada masalah
    
    const idx = parseInt(document.getElementById('editIndex').value, 10);
    if (Number.isNaN(idx)) return;

    // Ambil data yang sudah divalidasi oleh form HTML
    const nimBaru = document.getElementById('editNim').value.trim();

    // Validasi NIM unik, kecuali untuk data yang sedang di-edit
    if (db.some((d, i) => d.nim === nimBaru && i !== idx)) {
        showToast(`NIM ${nimBaru} sudah terdaftar pada data lain.`, 'error');
        return;
    }

    // Update semua fields
    db[idx].nama = document.getElementById('editNama').value.trim();
    db[idx].nim = nimBaru; // Gunakan nim yang sudah divalidasi
    db[idx].prodi = document.getElementById('editProdi').value;
    db[idx].dosen = document.getElementById('editDosen').value.trim();
    db[idx].jenisKelamin = document.getElementById('editJenisKelamin').value;
    db[idx].telepon = document.getElementById('editTelepon').value.trim();
    db[idx].angkatan = document.getElementById('editAngkatan').value;

    saveDB();
    renderTable(searchInput.value);
    showToast('Data berhasil diperbarui.', 'success');
    editModal.close();
}


// --- Modal Delete & Reset Logic (Custom Confirmation) ---

function openDelete(index) {
    isResetMode = false;
    deleteIndex = index;
    const d = db[index];

    // Mengatur tampilan modal untuk HAPUS
    document.querySelector('#deleteModal h3').textContent = 'Konfirmasi Hapus';
    document.querySelector('#deleteModal p').innerHTML = 'Yakin ingin menghapus data ***<span id="deleteNameDisplay"></span> dengan NIM ***<span id="deleteNimDisplay"></span>?';

    deleteNameDisplay.textContent = d.nama;
    deleteNimDisplay.textContent = d.nim;
    document.getElementById('deleteIndex').value = index;

    deleteModal.showModal();
}


function openResetConfirmation() {
    isResetMode = true;
    deleteIndex = null; // Tidak ada index yang dihapus

    // Mengatur tampilan modal untuk RESET
    document.querySelector('#deleteModal h3').textContent = 'Konfirmasi Reset Semua Data';
    document.querySelector('#deleteModal p').innerHTML = 'Anda akan menghapus SEMUA data mahasiswa yang tersimpan. Tindakan ini TIDAK dapat dibatalkan.';

    // Kosongkan display nama/nim agar tidak membingungkan
    deleteNameDisplay.textContent = '';
    deleteNimDisplay.textContent = '';
    document.getElementById('deleteIndex').value = '';

    deleteModal.showModal();
}

function handleConfirmation() {
    if (isResetMode) {
        // Logika Reset Total
        db = [];
        saveDB();
        renderTable();
        showToast('Semua data mahasiswa berhasil direset.', 'success');

    } else if (deleteIndex !== null) {
        // Logika Hapus Data Tunggal
        db.splice(deleteIndex, 1);
        saveDB();
        renderTable(searchInput.value);
        showToast('Data mahasiswa berhasil dihapus.', 'success');
    }

    deleteModal.close();
    deleteIndex = null;
    isResetMode = false;
    
    // Pastikan modal kembali ke template aslinya setelah ditutup (walaupun akan di-override lagi saat dibuka)
    document.querySelector('#deleteModal h3').textContent = 'Konfirmasi Hapus'; 
}

// --- Import/Export Logic ---

function handleExport() {
    if (db.length === 0) {
        showToast('Tidak ada data untuk diekspor.', 'error');
        return;
    }
    const json = JSON.stringify(db, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_mahasiswa_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data berhasil diekspor sebagai JSON.', 'success');
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                // Terapkan data baru
                db = importedData;
                saveDB();
                renderTable();
                showToast(`Data (${importedData.length} entri) berhasil diimpor!`, 'success');
            } else {
                showToast('Format file tidak valid (bukan array JSON).', 'error');
            }
        } catch (err) {
            showToast('Gagal memproses file JSON.', 'error');
        }
    };
    reader.readAsText(file);
    fileInput.value = null; // Bersihkan input file
}