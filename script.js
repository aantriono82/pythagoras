document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculate');
    const limitInput = document.getElementById('limit');
    const primitiveCheckbox = document.getElementById('primitive');
    const resultsBody = document.getElementById('results-body');
    const resultsCount = document.getElementById('results-count');
    const noResults = document.getElementById('no-results');
    const loader = document.getElementById('loader');
    const triangleForm = document.getElementById('triangle-form');
    const triangleInputs = {
        a: document.getElementById('side-a'),
        b: document.getElementById('side-b'),
        c: document.getElementById('side-c')
    };
    const calculationResults = document.getElementById('calculation-results');
    let calculationTimer = null;
    let calculationRequest = 0;

    const formatNumber = value => Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

    function updateTriangleVisual(values) {
        const labels = document.querySelectorAll('.svg-label');
        const names = ['a', 'b', 'c'];
        labels.forEach((label, index) => {
            const name = names[index];
            label.textContent = values[name] !== null && values[name] !== undefined ? `${name} = ${formatNumber(values[name])}` : name;
        });
        const description = values.a && values.b && values.c
            ? `Segitiga siku-siku dengan sisi a ${formatNumber(values.a)}, sisi b ${formatNumber(values.b)}, dan sisi miring c ${formatNumber(values.c)}.`
            : 'Segitiga siku-siku dengan sisi a, b, dan sisi miring c.';
        document.getElementById('triangle-visual-desc').textContent = description;
    }

    function calculateTriangle(event) {
        event?.preventDefault();
        const values = Object.fromEntries(Object.entries(triangleInputs).map(([name, input]) => [name, input.value === '' ? null : Number(input.value)]));
        const filled = Object.values(values).filter(value => value !== null);
        const status = document.getElementById('calculator-status');
        if (filled.length !== 2 || filled.some(value => !Number.isFinite(value) || value <= 0)) {
            status.textContent = 'Isi tepat dua sisi dengan nilai lebih besar dari 0.';
            status.className = 'calculator-status error-text';
            calculationResults.hidden = true;
            updateTriangleVisual({
                a: Number.isFinite(values.a) && values.a > 0 ? values.a : null,
                b: Number.isFinite(values.b) && values.b > 0 ? values.b : null,
                c: Number.isFinite(values.c) && values.c > 0 ? values.c : null
            });
            return;
        }

        let missing;
        if (values.a === null) {
            missing = 'a';
            if (values.c <= values.b) {
                invalidTriangle(status);
                updateTriangleVisual(values);
                return;
            }
            values.a = Math.sqrt(values.c ** 2 - values.b ** 2);
        } else if (values.b === null) {
            missing = 'b';
            if (values.c <= values.a) {
                invalidTriangle(status);
                updateTriangleVisual(values);
                return;
            }
            values.b = Math.sqrt(values.c ** 2 - values.a ** 2);
        } else {
            missing = 'c';
            values.c = Math.hypot(values.a, values.b);
        }

        triangleInputs[missing].value = formatNumber(values[missing]);
        const area = (values.a * values.b) / 2;
        const perimeter = values.a + values.b + values.c;
        const angleA = Math.atan(values.a / values.b) * 180 / Math.PI;
        const angleB = 90 - angleA;
        document.getElementById('missing-side-result').textContent = `${missing} = ${formatNumber(values[missing])}`;
        document.getElementById('area-result').textContent = formatNumber(area);
        document.getElementById('perimeter-result').textContent = formatNumber(perimeter);
        document.getElementById('angles-result').textContent = `${formatNumber(angleA)}° dan ${formatNumber(angleB)}°`;
        calculationResults.hidden = false;
        status.textContent = `Berhasil menghitung sisi ${missing}.`;
        status.className = 'calculator-status success-text';
        updateTriangleVisual(values);
    }

    function invalidTriangle(status) {
        status.textContent = 'Sisi miring (c) harus lebih panjang daripada sisi siku-siku.';
        status.className = 'calculator-status error-text';
        calculationResults.hidden = true;
    }

    function clearTriangle() {
        Object.values(triangleInputs).forEach(input => { input.value = ''; });
        calculationResults.hidden = true;
        const status = document.getElementById('calculator-status');
        status.textContent = '';
        status.className = 'calculator-status';
        updateTriangleVisual({ a: null, b: null, c: null });
    }

    function gcd(a, b) {
        while (b !== 0) [a, b] = [b, a % b];
        return Math.abs(a);
    }

    // Rumus Euclid menghasilkan tripel primitif dan seluruh kelipatannya.
    function findTriples(limit, primitiveOnly) {
        const triples = [];
        const maxM = Math.floor(Math.sqrt(limit - 1));
        for (let m = 2; m <= maxM; m += 1) {
            for (let n = 1; n < m; n += 1) {
                if (gcd(m, n) !== 1 || (m % 2 === 1 && n % 2 === 1)) continue;
                const primitiveC = m * m + n * n;
                if (primitiveC > limit) break;
                const primitiveA = m * m - n * n;
                const primitiveB = 2 * m * n;
                const a = Math.min(primitiveA, primitiveB);
                const b = Math.max(primitiveA, primitiveB);
                const maxMultiplier = primitiveOnly ? 1 : Math.floor(limit / primitiveC);
                for (let k = 1; k <= maxMultiplier; k += 1) {
                    triples.push([a * k, b * k, primitiveC * k]);
                }
            }
        }
        return triples.sort((x, y) => x[2] - y[2] || x[0] - y[0] || x[1] - y[1]);
    }

    function updateUrl() {
        const params = new URLSearchParams({ limit: limitInput.value, primitive: primitiveCheckbox.checked ? 'true' : 'false' });
        const url = new URL(window.location.href);
        url.search = params.toString();
        history.replaceState(null, '', url);
    }

    function setLoading(isLoading) {
        loader.style.display = isLoading ? 'block' : 'none';
        loader.setAttribute('aria-hidden', String(!isLoading));
        loader.setAttribute('aria-busy', String(isLoading));
        calculateBtn.disabled = isLoading;
        limitInput.disabled = isLoading;
        primitiveCheckbox.disabled = isLoading;
    }

    function showMessage(message, type = 'info') {
        document.querySelector('.message-alert')?.remove();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-alert ${type}`;
        messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        window.setTimeout(() => messageDiv.remove(), 3000);
    }

    function displayResults(triples) {
        resultsBody.replaceChildren();
        resultsCount.textContent = `${triples.length} tripel ditemukan`;
        if (!triples.length) {
            noResults.hidden = false;
            noResults.textContent = 'Tidak ditemukan tripel untuk batas ini. Coba gunakan batas yang lebih tinggi.';
            return;
        }
        noResults.hidden = true;
        const fragment = document.createDocumentFragment();
        triples.forEach(([a, b, c], index) => {
            const row = document.createElement('tr');
            [index + 1, a, b, c].forEach((value, cellIndex) => {
                const cell = document.createElement('td');
                cell.textContent = value;
                if (cellIndex > 0) cell.className = 'number-cell';
                row.appendChild(cell);
            });
            const verification = document.createElement('td');
            verification.className = 'verification';
            verification.append(`${a}² + ${b}² = ${c}²`);
            const details = document.createElement('small');
            details.textContent = `${a * a} + ${b * b} = ${c * c} ✓`;
            verification.appendChild(details);
            verification.setAttribute('aria-label', `${a} kuadrat ditambah ${b} kuadrat sama dengan ${c} kuadrat`);
            row.appendChild(verification);
            row.classList.add('valid-triple');
            fragment.appendChild(row);
        });
        resultsBody.appendChild(fragment);
    }

    function calculateTriples() {
        const limit = Number(limitInput.value);
        if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
            showMessage('Masukkan bilangan bulat antara 1 sampai 1000.', 'error');
            limitInput.focus();
            return;
        }
        if (calculationTimer !== null) window.clearTimeout(calculationTimer);
        const request = ++calculationRequest;
        setLoading(true);
        calculationTimer = window.setTimeout(() => {
            calculationTimer = null;
            if (request !== calculationRequest) return;
            try {
                displayResults(findTriples(limit, primitiveCheckbox.checked));
                updateUrl();
            } catch (error) {
                console.error(error);
                showMessage('Terjadi kesalahan dalam perhitungan.', 'error');
            } finally {
                if (request === calculationRequest) setLoading(false);
            }
        }, 0);
    }

    async function copyLink() {
        const url = window.location.href;
        try {
            if (!navigator.clipboard) throw new Error('Clipboard API tidak tersedia');
            await navigator.clipboard.writeText(url);
            showMessage('Tautan berhasil disalin.', 'success');
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.setAttribute('readonly', '');
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            const copied = document.execCommand('copy');
            textArea.remove();
            showMessage(copied ? 'Tautan berhasil disalin.' : 'Salin tautan dari bilah alamat browser.', copied ? 'success' : 'warning');
        }
    }

    async function shareContent(platform) {
        const title = 'Pencari Tripel Pythagoras';
        const text = 'Jelajahi tripel Pythagoras dengan rumus a² + b² = c².';
        const url = window.location.href;
        if (platform === 'link' || platform === 'instagram') {
            await copyLink();
            if (platform === 'instagram') showMessage('Tautan siap ditempel di Instagram.', 'info');
            return;
        }
        if (platform === 'native') {
            if (!navigator.share) {
                await copyLink();
                return;
            }
            try {
                await navigator.share({ title, text, url });
            } catch (error) {
                if (error?.name !== 'AbortError') await copyLink();
            }
            return;
        }
        const shareUrls = {
            whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=Pythagoras,Matematika`,
            telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
        };
        if (shareUrls[platform]) window.open(shareUrls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
    }

    function loadState() {
        const params = new URLSearchParams(window.location.search);
        const limit = Number(params.get('limit'));
        if (Number.isInteger(limit) && limit >= 1 && limit <= 1000) limitInput.value = limit;
        primitiveCheckbox.checked = params.get('primitive') === 'true';
    }

    calculateBtn.addEventListener('click', calculateTriples);
    triangleForm.addEventListener('submit', calculateTriangle);
    document.getElementById('clear-triangle').addEventListener('click', clearTriangle);
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.section).scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    limitInput.addEventListener('input', () => {
        const value = Number(limitInput.value);
        if (limitInput.value !== '' && Number.isFinite(value)) limitInput.value = Math.min(1000, Math.max(1, value));
    });
    primitiveCheckbox.addEventListener('change', calculateTriples);
    document.querySelectorAll('.share-btn').forEach(button => button.addEventListener('click', () => shareContent(button.dataset.platform)));
    document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            calculateTriples();
        }
        if (event.key === 'Escape') {
            limitInput.focus();
            limitInput.select();
        }
    });

    loadState();
    calculateTriples();
});
