let currentFile = null;
let totalPages = 0;
let selectedDeg = 90;
let scope = 'all';

const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') handleFile(f);
});

async function handleFile(file) {
    currentFile = file;
    try {
        const { PDFDocument } = PDFLib;
        const buf = await file.arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        totalPages = pdf.getPageCount();
        const sizeStr = file.size > 1048576 ? (file.size/1048576).toFixed(1)+' MB' : (file.size/1024).toFixed(0)+' KB';
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-meta').textContent = `${totalPages} pages • ${sizeStr}`;
        document.getElementById('rotate-card').style.display = 'block';
        document.getElementById('drop-zone').style.display = 'none';
    } catch (e) {
        showStatus('❌ Could not read this PDF. Make sure it is not password-protected.', 'error');
    }
}

function selectRotation(deg, btn) {
    selectedDeg = deg;
    document.querySelectorAll('.rot-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function setScope(s) {
    scope = s;
    document.getElementById('specific-pages-section').style.display = s === 'specific' ? 'block' : 'none';
}

function parsePages(input, total) {
    const pages = new Set();
    input.split(',').map(s => s.trim()).forEach(part => {
        if (part.includes('-')) {
            const [a, b] = part.split('-').map(n => parseInt(n));
            for (let i = Math.max(1,a); i <= Math.min(total,b); i++) pages.add(i);
        } else {
            const n = parseInt(part);
            if (!isNaN(n) && n >= 1 && n <= total) pages.add(n);
        }
    });
    return [...pages].sort((a,b)=>a-b);
}

async function rotatePDF() {
    if (!currentFile) return;
    const btn = document.getElementById('rotate-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Rotating...';

    try {
        const { PDFDocument, degrees } = PDFLib;
        const buf = await currentFile.arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });

        let pagesToRotate;
        if (scope === 'all') {
            pagesToRotate = Array.from({length: totalPages}, (_, i) => i + 1);
        } else {
            const input = document.getElementById('specific-pages').value.trim();
            pagesToRotate = parsePages(input, totalPages);
            if (!pagesToRotate.length) { showStatus('No valid pages entered.', 'error'); return; }
        }

        const pages = pdf.getPages();
        pagesToRotate.forEach(num => {
            const page = pages[num - 1];
            const currentRot = page.getRotation().angle;
            page.setRotation(degrees((currentRot + selectedDeg) % 360));
        });

        const pdfBytes = await pdf.save();
        const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
        const fname = currentFile.name.replace('.pdf', '_rotated.pdf');

        showStatus(`
            <div style="font-size:28px;margin-bottom:8px">✅</div>
            <div style="font-weight:700;color:#27ae60;font-size:16px">Rotation Complete!</div>
            <div style="color:#666;font-size:14px;margin:6px 0">${pagesToRotate.length} page(s) rotated by ${selectedDeg}°</div>
            <a href="${url}" download="${fname}" class="download-btn">⬇️ Download ${fname}</a>
        `, 'success');
    } catch (err) {
        showStatus(`❌ Error: ${err.message || 'Could not rotate PDF.'}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Rotate PDF';
    }
}

function reset() {
    currentFile = null;
    totalPages = 0;
    document.getElementById('rotate-card').style.display = 'none';
    document.getElementById('drop-zone').style.display = 'block';
    document.getElementById('file-input').value = '';
    document.getElementById('status-card').style.display = 'none';
}

function showStatus(html, type) {
    const card = document.getElementById('status-card');
    card.style.display = 'block';
    card.innerHTML = html;
    card.style.borderLeft = type === 'error' ? '4px solid #e74c3c' : '4px solid #27ae60';
}
