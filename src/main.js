// PDF.js v3 CDN exposes itself as window.pdfjsLib
// (read lazily inside DOMContentLoaded to be safe with script load order)

document.addEventListener('DOMContentLoaded', () => {
    // Generate SVG hand-drawn stars
    const starContainer = document.getElementById('drawn-stars-container');
    if (starContainer) {
        for (let i = 0; i < 45; i++) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'absolute';
            svg.style.left = `${Math.random() * 100}vw`;
            svg.style.top = `${Math.random() * 100}vh`;
            const size = 8 + Math.random() * 28;
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.classList.add('drawn-star');
            svg.style.animationDelay = `${Math.random() * 5}s`;
            svg.style.transform = `rotate(${Math.random() * 360}deg)`;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M50 0 Q50 50 100 50 Q50 50 50 100 Q50 50 0 50 Q50 50 50 0 Z');
            svg.appendChild(path);
            starContainer.appendChild(svg);
        }
    }

    // ── Nav: Contacto scrolls to footer (handled inline in HTML)

    const pdfjs = window.pdfjsLib;
    if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        loadPDF('/portafolio_hq.pdf', pdfjs);
    } else {
        console.error('PDF.js not found — check the CDN script tag in index.html');
    }
});

// ─────────────────────────────────────────────────
async function loadPDF(url, pdfjs) {
    try {
        const pdfDoc = await pdfjs.getDocument(url).promise;
        const totalPages = pdfDoc.numPages;
        const grid = document.getElementById('grid');
        if (!grid) return;

        // Section metadata (7 pages) — Lorem Ipsum placeholder text
        const sections = {
            2: { title: 'Lorem Ipsum',       tag: 'Branding & Identity',   desc: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat.',                         color: '#e07db3', text: '#fff0f7' },
            3: { title: 'Dolor Sit Amet',   tag: 'Event Design',           desc: 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis nostrud exercitation ullamco laboris nisi.',                    color: '#f4e960', text: '#1a1600' },
            4: { title: 'Dolor Sit Amet',   tag: 'Event Design',           desc: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor.',                                   color: '#f4e960', text: '#1a1600' },
            5: { title: 'Adipiscing Elit',   tag: 'Packaging',              desc: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed perspiciatis unde omnis iste natus.',              color: '#8ec6e0', text: '#081824' },
            6: { title: 'Adipiscing Elit',   tag: 'Packaging',              desc: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione sequi nesciunt.',                    color: '#8ec6e0', text: '#081824' },
            7: { title: 'Magna Aliqua',     tag: 'Editorial Design',       desc: 'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet consectetur adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore.',              color: '#c8b8f0', text: '#0e0718' },
        };

        // Render queue — max 2 pages at a time to avoid choking the main thread
        let activeRenders = 0;
        const MAX_CONCURRENT = 2;
        const renderQueue = [];

        function processQueue() {
            while (activeRenders < MAX_CONCURRENT && renderQueue.length > 0) {
                const task = renderQueue.shift();
                activeRenders++;
                task().finally(() => {
                    activeRenders--;
                    processQueue();
                });
            }
        }

        function enqueueRender(wrapper) {
            renderQueue.push(() => renderCanvas(pdfDoc, wrapper));
            processQueue();
        }

        // Lazy render observer — 80% margin pre-loads just enough without overloading
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const wrapper = entry.target;
                    if (wrapper.dataset.rendered === 'false') {
                        wrapper.dataset.rendered = 'true';
                        enqueueRender(wrapper);
                    }
                }
            });
        }, { root: null, rootMargin: '80% 0px 80% 0px' });

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            // page-outer: visible overflow so the pill can protrude into the margin
            const outer = document.createElement('div');
            outer.className = 'page-outer';
            outer.setAttribute('data-page', String(pageNum));

            // page-block: overflow:hidden clips the sliding panel
            const block = document.createElement('div');
            block.className = 'page-block';

            // Canvas wrapper (shimmer + lazy load target)
            const wrapper = document.createElement('article');
            wrapper.className = 'growing-wrapper';
            wrapper.setAttribute('data-id', pageNum);
            wrapper.dataset.rendered = 'false';

            // Reserve space with correctly-sized canvas
            const page = await pdfDoc.getPage(pageNum);
            const dpi  = Math.min(window.devicePixelRatio || 1, 2);
            const vp   = page.getViewport({ scale: dpi });

            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-canvas-bg';
            canvas.width  = vp.width;
            canvas.height = vp.height;
            canvas.style.width   = '100%';
            canvas.style.height  = 'auto';
            canvas.style.opacity = '0';
            canvas.style.transition = 'opacity 0.55s ease';

            wrapper.appendChild(canvas);
            block.appendChild(wrapper);

            // Side panel + pill for annotated pages
            if (sections[pageNum]) {
                const meta = sections[pageNum];

                // Panel slides in from the RIGHT over the image
                const panel = document.createElement('div');
                panel.className = 'info-panel';
                panel.style.setProperty('--panel-bg',   meta.color);
                panel.style.setProperty('--panel-text', meta.text);
                panel.innerHTML = `
                    <div class="info-panel-inner">
                        <span class="info-tag">${meta.tag}</span>
                        <h2 class="info-title">${meta.title}</h2>
                        <p class="info-desc">${meta.desc}</p>
                    </div>
                `;
                block.appendChild(panel); // inside page-block so overflow:hidden clips it

                // Trigger pill lives in page-outer (no clip) so it's always visible
                const trigger = document.createElement('button');
                trigger.className = 'reveal-trigger';
                trigger.setAttribute('aria-expanded', 'false');
                trigger.innerHTML = `
                    <span class="reveal-trigger-icon">+</span>
                    <span class="reveal-trigger-label">Info</span>
                `;

                trigger.addEventListener('click', () => {
                    const open = panel.classList.toggle('is-open');
                    trigger.classList.toggle('is-open', open);
                    trigger.setAttribute('aria-expanded', String(open));
                    trigger.querySelector('.reveal-trigger-icon').textContent = open ? '×' : '+';
                });

                outer.appendChild(trigger); // pill outside the clipping block
            }

            outer.appendChild(block);
            grid.appendChild(outer);
            observer.observe(wrapper);
        }
    } catch (err) {
        console.error('PDF load error:', err);
    }
}

// ─────────────────────────────────────────────────
// Two-pass render: fast 1× first → sharp 2× upgrade
async function renderCanvas(pdfDoc, wrapper) {
    const pageNum = parseInt(wrapper.getAttribute('data-id'));
    const canvas  = wrapper.querySelector('canvas');
    if (!canvas) return;

    try {
        const page = await pdfDoc.getPage(pageNum);
        const ctx  = canvas.getContext('2d');

        // ── Pass 1: render at CSS pixel resolution (fast, shows immediately) ──
        const vpFast = page.getViewport({ scale: 1 });
        canvas.width  = vpFast.width;
        canvas.height = vpFast.height;
        await page.render({ canvasContext: ctx, viewport: vpFast }).promise;
        // Fade in immediately — user sees content without waiting for HiDPI
        requestAnimationFrame(() => { canvas.style.opacity = '1'; });

        // ── Pass 2: upgrade to HiDPI in background (only on retina screens) ──
        const dpi = window.devicePixelRatio || 1;
        if (dpi > 1) {
            // Small delay so pass 1 paints first and browser stays responsive
            await new Promise(r => setTimeout(r, 120));
            const vpSharp = page.getViewport({ scale: Math.min(dpi, 2) });
            canvas.width  = vpSharp.width;
            canvas.height = vpSharp.height;
            await page.render({ canvasContext: ctx, viewport: vpSharp }).promise;
        }
    } catch (e) {
        console.warn('Render error p.' + pageNum, e);
    }
}
