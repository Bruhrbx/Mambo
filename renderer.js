// --- DOM Elements ---
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const goBtn = document.getElementById('go-btn');
const newTabBtn = document.getElementById('new-tab-btn');
const extensionsBtn = document.getElementById('extensions-btn');
const tabsList = document.getElementById('tabs-list');
const tabsContainer = document.getElementById('tabs-container');
const extensionModal = document.getElementById('extension-modal');
const closeModal = document.querySelector('.close');
const loadExtensionBtn = document.getElementById('load-extension-btn');
const loadCrxBtn = document.getElementById('load-crx-btn');
const extensionUrlInput = document.getElementById('extension-url');
const extensionFileInput = document.getElementById('extension-file');
const extensionsList = document.getElementById('extensions-list');
const progressBar = document.getElementById('progress-bar');

// --- State Management ---
let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let extensions = [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    createTab('https://search.tiago.zip/');
});

// --- Core Tab Functions ---
// --- Core Tab Functions ---
function createTab(url = 'https://search.tiago.zip/') {
    const tabId = tabCounter++; // Berupa Number
    
    // 1. Create Webview
    const webview = document.createElement('webview');
    webview.src = url;
    webview.id = `webview-${tabId}`;
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('nodeintegration', 'false');
    webview.classList.add('webview-content'); 
    
    if (tabs.length === 0) {
        webview.classList.add('active');
    } else {
        webview.classList.remove('active');
    }
    tabsContainer.appendChild(webview); // Memasukkan webview ke kontainer HTML
    
    // 2. Create Tab UI
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    if (tabs.length === 0) tabElement.classList.add('active');
    tabElement.id = `tab-${tabId}`;
    
    // MENYIMPAN ID SEBAGAI NUMBER DI DATASET
    tabElement.dataset.tabId = tabId; 
    
    tabElement.innerHTML = `
        <span class="tab-favicon">🌐</span>
        <span class="tab-title">New Tab</span>
        <span class="tab-close" title="Close Tab">✕</span>
    `;
    tabsList.appendChild(tabElement);
    
    const tabObj = { id: tabId, webview, tabElement, url, isLoading: false };
    tabs.push(tabObj);
    
    // Jika ini tab pertama, langsung set aktif
    if (tabs.length === 1) {
        activeTabId = tabId;
    }

    updateUIState();

    // --- Tab Events (Menggunakan Listener Langsung yang Aman) ---
    
    // Tombol Close (✕)
    tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation(); // Mencegah klik tab ikut terpicu
        closeTab(tabId);
    });
    
    // Klik Area Tab untuk Berpindah
    tabElement.addEventListener('click', () => {
        switchTab(tabId);
    });
    
    // Update Judul Halaman
    webview.addEventListener('page-title-updated', (e) => {
        const title = e.title || 'New Tab';
        tabElement.querySelector('.tab-title').textContent = title;
        tabElement.title = title;
    });

    // Update Favicon Halaman
    webview.addEventListener('page-favicon-updated', (e) => {
        if(e.favicons && e.favicons.length > 0) {
            tabElement.querySelector('.tab-favicon').innerHTML = `<img src="${e.favicons[0]}" width="16" height="16" style="border-radius:2px;">`;
        }
    });
    
    // Indikator Loading Mulai
    webview.addEventListener('did-start-loading', () => {
        tabObj.isLoading = true;
        if (activeTabId === tabId) {
            updateNavigationButtons();
            progressBar.style.opacity = '1';
            progressBar.style.width = '30%';
        }
    });

    // Indikator Loading Selesai
    webview.addEventListener('did-stop-loading', () => {
        tabObj.isLoading = false;
        if (activeTabId === tabId) {
            updateNavigationButtons();
            urlBar.value = webview.getURL();
            progressBar.style.width = '100%';
            setTimeout(() => { if(!tabObj.isLoading) progressBar.style.opacity = '0'; }, 300);
        }
    });

    // Sinkronisasi URL Bar
    webview.addEventListener('did-navigate', (e) => {
        if (activeTabId === tabId) urlBar.value = e.url;
        tabObj.url = e.url;
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
         if (activeTabId === tabId) urlBar.value = e.url;
    });

    // Membuka Link Baru (Target "_blank") di Tab Baru Browser
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        const newTab = createTab(e.url);
        switchTab(newTab.id);
    });

    // Injeksi Ekstensi
    webview.addEventListener('did-finish-load', () => {
        injectActiveExtensionsToWebview(webview);
    });

    return tabObj;
}

function switchTab(tabId) {
    // Memastikan tipe data tabId dikonversi ke Number agar COCOK saat dicari (===)
    const targetId = Number(tabId);
    
    if (activeTabId === targetId) return;

    // Nonaktifkan tab yang saat ini sedang aktif
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) {
        currentTab.tabElement.classList.remove('active');
        currentTab.webview.classList.remove('active');
    }
    
    // Aktifkan tab yang baru dituju
    activeTabId = targetId;
    const newTab = tabs.find(t => t.id === targetId);
    if (newTab) {
        newTab.tabElement.classList.add('active');
        newTab.webview.classList.add('active');
        urlBar.value = newTab.webview.getURL() || '';
        updateNavigationButtons();
        newTab.webview.focus();
    }
}

function closeTab(tabId) {
    const targetId = Number(tabId);
    const index = tabs.findIndex(t => t.id === targetId);
    if (index === -1) return;

    // Hapus elemen dari DOM HTML
    tabs[index].webview.remove();
    tabs[index].tabElement.remove();
    
    // Hapus data dari array state
    tabs.splice(index, 1);
    
    if (tabs.length === 0) {
        // Jika tab habis, buat satu tab kosong otomatis
        createTab();
    } else if (activeTabId === targetId) {
        // Jika tab yang ditutup adalah tab aktif, pindah ke tab terdekat
        const newIndex = Math.max(0, index - 1);
        switchTab(tabs[newIndex].id);
    }
}

function getActiveWebview() {
    return tabs.find(t => t.id === activeTabId)?.webview || null;
}

function updateNavigationButtons() {
    const webview = getActiveWebview();
    if (!webview) {
        backBtn.disabled = true;
        forwardBtn.disabled = true;
        reloadBtn.textContent = '↻';
        return;
    }

    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
    
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && activeTab.isLoading) {
        reloadBtn.textContent = '✕';
        reloadBtn.title = 'Stop Loading';
    } else {
        reloadBtn.textContent = '↻';
        reloadBtn.title = 'Reload';
    }
}

function updateUIState() {
    updateNavigationButtons();
}

// --- Smart URL Handling ---
function loadURL() {
    let input = urlBar.value.trim();
    if (!input) return;
    
    const webview = getActiveWebview();
    if (!webview) return;

    let finalUrl = input;
    const isUrl = /^(https?:\/\/|localhost|file:\/\/)/i.test(input) || 
                  (input.includes('.') && !input.includes(' '));

    if (!isUrl) {
        finalUrl = `https://search.tiago.zip/?q=${encodeURIComponent(input)}`;
    } else if (!/^https?:\/\//i.test(input)) {
        finalUrl = `https://${input}`;
    }

    webview.src = finalUrl;
}

// --- Global Controls Event Listeners ---
goBtn.addEventListener('click', loadURL);
urlBar.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadURL(); });
backBtn.addEventListener('click', () => { const wv = getActiveWebview(); if (wv?.canGoBack()) wv.goBack(); });
forwardBtn.addEventListener('click', () => { const wv = getActiveWebview(); if (wv?.canGoForward()) wv.goForward(); });

reloadBtn.addEventListener('click', () => {
    const wv = getActiveWebview();
    if (!wv) return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab?.isLoading) { wv.stop(); } else { wv.reload(); }
});

newTabBtn.addEventListener('click', () => {
    const t = createTab();
    switchTab(t.id);
});

// --- Extension System ---
extensionsBtn.addEventListener('click', () => { extensionModal.style.display = 'flex'; renderExtensionsList(); });
closeModal.addEventListener('click', () => { extensionModal.style.display = 'none'; });
window.addEventListener('click', (e) => { if (e.target === extensionModal) extensionModal.style.display = 'none'; });

loadExtensionBtn.addEventListener('click', () => {
    const url = extensionUrlInput.value.trim();
    if (url) {
        addExtension({ id: `ext-${Date.now()}`, name: `Script: ${url.split('/').pop()}`, url: url, type: 'url', enabled: true });
        extensionUrlInput.value = '';
    }
});

loadCrxBtn.addEventListener('click', () => extensionFileInput.click());
extensionFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const blobUrl = URL.createObjectURL(new Blob([ev.target.result], {type: 'application/javascript'}));
            addExtension({ id: `ext-${Date.now()}`, name: file.name, url: blobUrl, type: 'blob', enabled: true });
        };
        reader.readAsText(file);
        extensionFileInput.value = '';
    }
});

function addExtension(extData) {
    extensions.push(extData);
    renderExtensionsList();
    if (extData.enabled) {
        tabs.forEach(tab => injectSingleExtension(extData, tab.webview));
    }
}

function renderExtensionsList() {
    if (extensions.length === 0) {
        extensionsList.innerHTML = '<p style="color:#888; text-align:center; padding:10px;">Belum ada ekstensi terpasang.</p>';
        return;
    }
    extensionsList.innerHTML = extensions.map(ext => `
        <div class="extension-item">
            <div>
                <strong>${ext.name}</strong>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn-primary" style="padding:4px 8px; background:${ext.enabled ? '#4cd964' : '#8e8e93'}" onclick="toggleExtension('${ext.id}')">
                    ${ext.enabled ? 'On' : 'Off'}
                </button>
                <button class="btn-primary" style="padding:4px 8px; background:#ff3b30; color:white;" onclick="removeExtension('${ext.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

window.toggleExtension = function(id) {
    const ext = extensions.find(e => e.id === id);
    if (ext) {
        ext.enabled = !ext.enabled;
        renderExtensionsList();
        tabs.forEach(t => t.webview.reload());
    }
};

window.removeExtension = function(id) {
    extensions = extensions.filter(e => e.id !== id);
    renderExtensionsList();
    tabs.forEach(t => t.webview.reload());
};

function injectActiveExtensionsToWebview(webview) {
    extensions.forEach(ext => { if (ext.enabled) injectSingleExtension(ext, webview); });
}

function injectSingleExtension(ext, webview) {
    let code = `
        (function() {
            var s = document.createElement('script');
            s.src = '${ext.url}';
            document.head.appendChild(s);
        })();
    `;
    webview.executeJavaScript(code).catch(err => console.warn('Extension blocked:', err));
}

// --- System Stats Monitor (RAM & Disk) ---
const statMem = document.getElementById('stat-mem');
const statDisk = document.getElementById('stat-disk');

async function updateSystemStats() {
    try {
        // Memanggil handler di main.js melalui IPC Bridge
        const stats = await window.ipcRenderer.invoke('get-system-stats');
        
        if (stats) {
            statMem.textContent = `📊 RAM: ${stats.memory}`;
            statDisk.textContent = `💾 Free: ${stats.disk}`;
        }
    } catch (err) {
        console.error("Gagal mengambil statistik sistem:", err);
    }
}

// Jalankan saat aplikasi pertama kali dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Beri jeda 1 detik untuk inisialisasi awal, lalu update setiap 3 detik
    setTimeout(() => {
        updateSystemStats();
        setInterval(updateSystemStats, 3000); 
    }, 1000);
});