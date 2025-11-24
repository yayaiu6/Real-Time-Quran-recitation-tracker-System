let quranData = [];
let isDataLoaded = false;
let currentPage = 1;
let totalPages = 1;
let currentSura = null;

// Cache for loaded pages and metadata
let pageCache = new Map(); 
let metadata = null;
const MAX_CACHE_SIZE = 10; 

// Juz names
const juzNames = {
    1: 'الجزء الأول', 2: 'الجزء الثاني', 3: 'الجزء الثالث', 4: 'الجزء الرابع',
    5: 'الجزء الخامس', 6: 'الجزء السادس', 7: 'الجزء السابع', 8: 'الجزء الثامن',
    9: 'الجزء التاسع', 10: 'الجزء العاشر', 11: 'الجزء الحادي عشر', 12: 'الجزء الثاني عشر',
    13: 'الجزء الثالث عشر', 14: 'الجزء الرابع عشر', 15: 'الجزء الخامس عشر', 16: 'الجزء السادس عشر',
    17: 'الجزء السابع عشر', 18: 'الجزء الثامن عشر', 19: 'الجزء التاسع عشر', 20: 'الجزء العشرون',
    21: 'الجزء الحادي والعشرون', 22: 'الجزء الثاني والعشرون', 23: 'الجزء الثالث والعشرون',
    24: 'الجزء الرابع والعشرون', 25: 'الجزء الخامس والعشرون', 26: 'الجزء السادس والعشرون',
    27: 'الجزء السابع والعشرون', 28: 'الجزء الثامن والعشرون', 29: 'الجزء التاسع والعشرون',
    30: 'الجزء الثلاثون'
};


async function loadMetadata() {
    try {
        const response = await fetch('/quran-data/metadata');
        if (!response.ok) {
            throw new Error(`خطأ في تحميل البيانات: ${response.status} ${response.statusText}`);
        }
        metadata = await response.json();
        if (metadata.error) {
            throw new Error(metadata.error);
        }
        isDataLoaded = true;
        totalPages = metadata.total_pages;
        console.log(`تم تحميل البيانات الأساسية: ${metadata.total_pages} صفحة، ${metadata.total_suras} سورة`);
        return true;
    } catch (error) {
        console.error('خطأ في تحميل البيانات الأساسية:', error);
        throw error;
    }
}

// Load specific page data
async function loadPageData(pageNum) {
    if (pageCache.has(pageNum)) {
        console.log(`تحميل الصفحة ${pageNum} من الذاكرة المؤقتة`);
        return pageCache.get(pageNum);
    }
    
    try {
        const response = await fetch(`/quran-data/page/${pageNum}`);
        if (!response.ok) {
            throw new Error(`خطأ في تحميل الصفحة: ${response.status} ${response.statusText}`);
        }
        const pageData = await response.json();
        if (pageData.error) {
            throw new Error(pageData.error);
        }
        
        // Add to cache
        pageCache.set(pageNum, pageData);
        

        if (pageCache.size > MAX_CACHE_SIZE) {
            const firstKey = pageCache.keys().next().value;
            pageCache.delete(firstKey);
        }
        
        console.log(`تم تحميل الصفحة ${pageNum}: ${pageData.length} آية`);
        return pageData;
    } catch (error) {
        console.error(`خطأ في تحميل الصفحة ${pageNum}:`, error);
        throw error;
    }
}

// Legacy function for compatibility
async function loadQuranData() {
    try {
        await loadMetadata();

        console.log('تم تحميل البيانات الأساسية بنجاح');
    } catch (error) {
        console.error('خطأ في تحميل بيانات القرآن:', error);
        document.getElementById('mushafPage').innerHTML = `
            <div style="text-align: center; padding: 50px; color: #d63031;">
                <h3>خطأ في تحميل البيانات</h3>
                <p>تعذر الاتصال بالخادم أو تحميل بيانات القرآن</p>
                <p style="color: #666; font-size: 0.9rem; margin-top: 15px;">
                    خطأ: ${error.message}
                </p>
            </div>
        `;
    }
}

// Initialize app
async function initApp() {

    document.getElementById('mushafPage').innerHTML = `
        <div class="loading">
            <div style="margin-bottom: 15px;">جاري تحميل القرآن الكريم...</div>
            <div style="font-size: 1rem; color: #666;">يرجى الانتظار...</div>
        </div>
    `;
    // Load metadata first (fast)
    await loadQuranData();
    // Populate controls with metadata
    populateControls();
    // Setup event listeners
    setupEventListeners();
    // Load first page
    displayPage(1);
}

// Calculate total pages (now uses metadata)
function calculateTotalPages() {
    if (!isDataLoaded || !metadata) {
        totalPages = 1;
        return;
    }
    totalPages = metadata.total_pages;
}

// Populate control elements (now uses metadata)
function populateControls() {
    if (!isDataLoaded || !metadata) return;
    const suraSelect = document.getElementById('suraSelect');
    const pageSelect = document.getElementById('pageSelect');
    const juzSelect = document.getElementById('juzSelect');

    // Clear lists first
    suraSelect.innerHTML = '<option value="">اختر السورة</option>';
    pageSelect.innerHTML = '';
    juzSelect.innerHTML = '<option value="">اختر الجزء</option>';

    // Populate sura list from metadata
    metadata.suras.forEach(sura => {
        const option = document.createElement('option');
        option.value = sura.no;
        option.textContent = `${sura.no}. ${sura.name}`;
        option.dataset.firstPage = sura.first_page;
        suraSelect.appendChild(option);
    });

    // Populate page list
    for (let i = 1; i <= totalPages; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `الصفحة ${i}`;
        pageSelect.appendChild(option);
    }

    // Populate juz list
    for (let i = 1; i <= metadata.total_juz; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = juzNames[i] || `الجزء ${i}`;
        juzSelect.appendChild(option);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Top navigation buttons
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            displayPage(currentPage - 1);
        }
    });
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentPage < totalPages) {
            displayPage(currentPage + 1);
        }
    });

    // Bottom navigation buttons with scroll-to-top
    document.getElementById('prevBtnBottom').addEventListener('click', () => {
        if (currentPage > 1) {
            displayPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    document.getElementById('nextBtnBottom').addEventListener('click', () => {
        if (currentPage < totalPages) {
            displayPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    document.getElementById('suraSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const firstPage = parseInt(selectedOption.dataset.firstPage);
            if (firstPage) {
                displayPage(firstPage);
            }
        }
    });

    document.getElementById('pageSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            displayPage(parseInt(e.target.value));
        }
    });

    document.getElementById('juzSelect').addEventListener('change', async (e) => {
        if (e.target.value) {
            const juzNo = parseInt(e.target.value);

            const estimatedPage = (juzNo - 1) * 20 + 1;
            displayPage(Math.max(1, Math.min(estimatedPage, totalPages)));
        }
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            search(e.target.value);
        }, 300);
    });
}

// Display a specific page (now loads on demand)
async function displayPage(pageNo) {
    if (!isDataLoaded) {
        document.getElementById('mushafPage').innerHTML = `
            <div class="loading">البيانات غير محملة بعد...</div>
        `;
        return;
    }
    
    // Show loading indicator
    document.getElementById('mushafPage').innerHTML = `
        <div class="loading">جاري تحميل الصفحة ${pageNo}...</div>
    `;
    
    try {
        currentPage = pageNo;
        // Load page data on demand
        const pageData = await loadPageData(pageNo);
        updatePageInfo(pageNo, pageData);
        renderPage(pageData);
        updateNavigation();
        updateControls();
        
        // Preload adjacent pages for smooth navigation
        preloadAdjacentPages(pageNo);
    } catch (error) {
        console.error('خطأ في عرض الصفحة:', error);
        document.getElementById('mushafPage').innerHTML = `
            <div style="text-align: center; padding: 50px; color: #d63031;">
                <h3>خطأ في تحميل الصفحة</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Preload adjacent pages for smooth navigation
function preloadAdjacentPages(pageNo) {
    // Preload next page
    if (pageNo < totalPages && !pageCache.has(pageNo + 1)) {
        loadPageData(pageNo + 1).catch(err => console.log('Preload failed:', err));
    }
    // Preload previous page
    if (pageNo > 1 && !pageCache.has(pageNo - 1)) {
        loadPageData(pageNo - 1).catch(err => console.log('Preload failed:', err));
    }
}

// Update page information
function updatePageInfo(pageNo, pageData) {
    const pageInfo = document.getElementById('pageInfo');
    const firstAya = pageData[0];
    const lastAya = pageData[pageData.length - 1];
    let info = `الصفحة ${pageNo} من ${totalPages}`;
    if (firstAya && lastAya) {
        if (firstAya.sura_no === lastAya.sura_no) {
            info += ` - سورة ${firstAya.sura_name_ar}`;
        } else {
            info += ` - من سورة ${firstAya.sura_name_ar} إلى سورة ${lastAya.sura_name_ar}`;
        }
        const juzSet = new Set(pageData.map(item => item.jozz));
        if (juzSet.size === 1) {
            info += ` - ${juzNames[firstAya.jozz]}`;
        } else {
            info += ` - أجزاء متعددة`;
        }
    }
    pageInfo.textContent = info;
}

// Display page with traditional design
function renderPage(pageData) {
    const mushafPage = document.getElementById('mushafPage');
    let html = '';
    let currentSuraNo = null;
    let continuousText = '';
    let currentSuraName = '';
    let showBismillah = false;
    pageData.forEach((aya, index) => {
        // Check for new sura start
        if (aya.sura_no !== currentSuraNo) {
            // End continuous text for previous sura
            if (continuousText) {
                html += `<div class="quran-text">${continuousText}</div>`;
                continuousText = '';
            }
            currentSuraNo = aya.sura_no;
            currentSuraName = aya.sura_name_ar;
            // Display sura header
            html += `
                <div class="sura-header">
                    <div class="sura-name">سورة ${aya.sura_name_ar}</div>
                    <div class="sura-info">السورة رقم ${aya.sura_no} - ${juzNames[aya.jozz]}</div>
                </div>
            `;
            // Display Bismillah (except for Sura At-Tawbah and Al-Fatihah at the beginning of the Mushaf)
            if (aya.sura_no !== 9 && aya.aya_no === 1 && aya.sura_no !== 1) {
                html += `<div class="bismillah">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>`;
            }
        }
        // Add verse text to continuous text
        if (continuousText) {
            continuousText += ' ';
        }
        continuousText += `${aya.aya_text_emlaey} <span class="aya-number">${aya.aya_no}</span>`;
    });
    // Add final continuous text
    if (continuousText) {
        html += `<div class="quran-text">${continuousText}</div>`;
    }

    const firstAya = pageData[0];
    const lastAya = pageData[pageData.length - 1];
    if (firstAya && lastAya) {
        html += `
            <div class="page-footer">
                <div>الصفحة ${currentPage} - من الآية ${firstAya.id} إلى الآية ${lastAya.id}</div>
            </div>
        `;
    }
    mushafPage.innerHTML = html;
}

// Update navigation buttons
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtnBottom = document.getElementById('prevBtnBottom');
    const nextBtnBottom = document.getElementById('nextBtnBottom');
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    prevBtnBottom.disabled = currentPage === 1;
    nextBtnBottom.disabled = currentPage === totalPages;
}

// Update control elements
function updateControls() {
    document.getElementById('pageSelect').value = currentPage;
}

// Search (now uses server-side search API)
async function search(query) {
    const searchResults = document.getElementById('searchResults');
    if (!query.trim() || !isDataLoaded) {
        searchResults.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/quran-data/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            searchResults.innerHTML = '<div style="padding: 15px; text-align: center; color: #666;">لا توجد نتائج للبحث</div>';
            searchResults.style.display = 'block';
            return;
        }
        
        let html = '<h3 style="margin-bottom: 12px; color: #2c5530; font-size: 1.1rem;">نتائج البحث:</h3>';
        data.results.forEach(aya => {
            const highlightedText = aya.aya_text_emlaey.replace(
                new RegExp(query, 'g'),
                `<span style="background: #fff3cd; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${query}</span>`
            );
            html += `
                <div class="search-result-item" onclick="goToAya(${aya.id})">
                    <div style="font-size: 1rem; margin-bottom: 5px; color: #2c5530;">
                        ${highlightedText.substring(0, 120)}${highlightedText.length > 120 ? '...' : ''}
                    </div>
                    <div style="font-size: 0.85rem; color: #666;">
                        سورة ${aya.sura_name_ar} - الآية ${aya.aya_no} - ${juzNames[aya.jozz]}
                    </div>
                </div>
            `;
        });
        searchResults.innerHTML = html;
        searchResults.style.display = 'block';
    } catch (error) {
        console.error('خطأ في البحث:', error);
        searchResults.innerHTML = '<div style="padding: 15px; text-align: center; color: #d63031;">خطأ في البحث</div>';
        searchResults.style.display = 'block';
    }
}

// Navigate to a specific verse
async function goToAya(ayaId) {
    try {

        let foundPage = null;
        
        // Check cached pages
        for (let [pageNum, pageData] of pageCache.entries()) {
            if (pageData.some(aya => aya.id === ayaId)) {
                foundPage = pageNum;
                break;
            }
        }
        

        if (!foundPage) {
            const response = await fetch(`/quran-data/search?q=&limit=10000`);
            const data = await response.json();
            const aya = data.results.find(item => item.id === ayaId);
            if (aya) {
                foundPage = aya.page;
            }
        }
        
        if (foundPage) {
            await displayPage(foundPage);
        }
    } catch (error) {
        console.error('خطأ في الانتقال للآية:', error);
    }
    
    // Hide search results
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('searchInput').value = '';
}

// Start app
initApp();

