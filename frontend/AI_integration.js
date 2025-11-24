let mediaRecorder = null;
let socket = null;
let isReciting = false;
let currentAyaIndex = 0;
let audioChunks = [];
let lastRevealedGlobalIndex = -1; 
let currentPageSecondLastAyaId = null; 
let secondLastAyaCompleted = false; 
let currentPageData = null; 
let sequenceErrorsCount = 0; 


async function continueToNextPage() {
    console.log('Continue to next page clicked');
    
   
    const continueBtn = document.getElementById('continueNextPageBtn');
    if (continueBtn) {
        continueBtn.style.display = 'none';
    }
    
  
    if (currentPage >= totalPages) {
        console.log('Already on last page');
        stopRecitation();
        return;
    }
    

    stopRecitation();
    

    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Move to next page
    const nextPage = currentPage + 1;
    console.log(`Loading page ${nextPage}...`);
    await displayPage(nextPage);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Wait a moment for page to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Start recitation on new page
    console.log('Starting recitation on new page...');
    await startRecitation();
}

// Start recitation
async function startRecitation() {
    if (isReciting) return;
    isReciting = true;
    audioChunks = [];
    lastRevealedGlobalIndex = -1; /
    secondLastAyaCompleted = false; 
    
    // Hide continue button if visible
    const continueBtn = document.getElementById('continueNextPageBtn');
    if (continueBtn) {
        continueBtn.style.display = 'none';
    }

    // Request microphone permission
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        document.getElementById('startRecitationBtn').style.display = 'none';
        document.getElementById('stopRecitationBtn').style.display = 'inline-block';
        
        // Hide all words in the current page
        hideAllWords();

        // Setup WebSocket
        socket = io.connect(window.location.origin + `?page=${currentPage}`);
        socket.on('connect', () => console.log('WebSocket connected'));

        // Receive comparison results
        socket.on('word_result', (data) => {
            if (data.error) {
                if (data.error === 'تم الانتهاء من الصفحة') {
                    stopRecitation();
                    alert('تم الانتهاء من تسميع الصفحة');
                } else {
                    console.error('خطأ:', data.error);
                }
                return;
            }
            updateWordStyle(data);
        });

        // Receive sequence error alerts (skip detection)
        socket.on('sequence_error', (data) => {
            console.warn('Sequence error detected:', data);
            handleSequenceError(data);
        });

        // Collect audio chunks
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        // Send audio every 2 seconds for faster feedback
        const sendInterval = setInterval(() => {
            if (audioChunks.length > 0 && isReciting) {
                const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
                // Convert to ArrayBuffer for binary transmission (faster)
                blob.arrayBuffer().then(buffer => {
                    socket.emit('audio_chunk', buffer);
                });
                audioChunks = [];
            }
        }, 2000);

        // Store interval ID for cleanup
        window.audioSendInterval = sendInterval;

        // Start recording with 1 second chunks
        mediaRecorder.start(1000);
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone');
        isReciting = false;
        document.getElementById('startRecitationBtn').style.display = 'inline-block';
        document.getElementById('stopRecitationBtn').style.display = 'none';
    }
}

// Stop recitation
function stopRecitation() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        // Send any remaining chunks
        if (audioChunks.length > 0) {
            const blob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
            blob.arrayBuffer().then(buffer => {
                socket.emit('audio_chunk', buffer);
            });
            audioChunks = [];
        }
    }
    
    // Clear send interval
    if (window.audioSendInterval) {
        clearInterval(window.audioSendInterval);
        window.audioSendInterval = null;
    }
    
    if (socket) {
        socket.disconnect();
    }
    isReciting = false;
    currentAyaIndex = 0;
    lastRevealedGlobalIndex = -1;
    
    // Restore all words and remove all formatting
    resetAllWords();
    
    // Clear sequence error display
    clearSequenceErrorDisplay();
    
    document.getElementById('startRecitationBtn').style.display = 'inline-block';
    document.getElementById('stopRecitationBtn').style.display = 'none';
}

// Reset all words to their natural state
function resetAllWords() {
    const allWords = document.querySelectorAll('.quran-word');
    allWords.forEach(word => {
        word.classList.remove('hidden-word', 'revealed', 'correct', 'sequence-warning');
    });
}

// Hide all words on the page
function hideAllWords() {
    const allWords = document.querySelectorAll('.quran-word');
    allWords.forEach(word => {
        word.classList.add('hidden-word');
        word.classList.remove('revealed', 'correct');
    });
}

// Reveal words from the beginning up to a specific index
function revealWordsUpTo(globalIndex) {
    const allWords = document.querySelectorAll('.quran-word');
    allWords.forEach(word => {
        const wordGlobalIndex = parseInt(word.getAttribute('data-global-word-index'));
        if (wordGlobalIndex <= globalIndex) {
            word.classList.remove('hidden-word', 'correct');
            word.classList.add('revealed');
        }
    });
}

// Check if second-to-last aya of the page is completed
function checkSecondLastAyaCompletion() {
    if (!isReciting || secondLastAyaCompleted || !currentPageSecondLastAyaId) {
        return;
    }
    
    // Get all words of the second-to-last aya
    const secondLastAyaWords = document.querySelectorAll(`.quran-word[data-aya-id="${currentPageSecondLastAyaId}"]`);
    if (secondLastAyaWords.length === 0) {
        return;
    }
    
    // Check if all words of second-to-last aya are revealed (not hidden)
    let allRevealed = true;
    secondLastAyaWords.forEach(word => {
        if (word.classList.contains('hidden-word')) {
            allRevealed = false;
        }
    });
    
    // If all words of second-to-last aya are revealed, show continue button
    if (allRevealed) {
        secondLastAyaCompleted = true;
        const continueBtn = document.getElementById('continueNextPageBtn');
        if (continueBtn && currentPage < totalPages) {
            continueBtn.style.display = 'inline-block';
            console.log('Second-to-last aya completed, showing continue button');
        } else if (currentPage >= totalPages) {
            console.log('Last page reached, no more pages to continue');
        }
    }
}

// Update word state in the interface (new system)
function updateWordStyle(data) {
    const ayaSpans = document.querySelectorAll(`.quran-word[data-aya-id="${data.aya_id}"][data-word-index="${data.word_index}"]`);
    
    ayaSpans.forEach(span => {
        const globalIndex = parseInt(span.getAttribute('data-global-word-index'));
        
        if (data.is_correct) {
            if (globalIndex > lastRevealedGlobalIndex) {
                lastRevealedGlobalIndex = globalIndex;
                revealWordsUpTo(globalIndex);
            }
        }

    });
    
    // Check if second-to-last aya is completed after each word update
    checkSecondLastAyaCompletion();
}

// Event listeners
document.getElementById('startRecitationBtn').addEventListener('click', () => {
    if (!isDataLoaded) {
        alert('Data not loaded yet');
        return;
    }
    startRecitation();
});

document.getElementById('stopRecitationBtn').addEventListener('click', stopRecitation);

const continueBtn = document.getElementById('continueNextPageBtn');
if (continueBtn) {
    continueBtn.addEventListener('click', continueToNextPage);
}

// Handle sequence errors (skip detection)
function handleSequenceError(data) {
    sequenceErrorsCount++;
    
    if (data.type === 'skip_aya') {
        // Highlight skipped ayas in yellow (visual feedback only)
        const skippedAyaIds = data.details.skipped_aya_ids || [];
        skippedAyaIds.forEach(ayaId => {
            const ayaWords = document.querySelectorAll(`.quran-word[data-aya-id="${ayaId}"]`);
            ayaWords.forEach(word => {
                word.classList.add('sequence-warning');
            });
        });
        
        // Log to console only (no popup messages)
        console.log(`Skip detected: Ayas ${data.details.from_aya_no} to ${data.details.to_aya_no} were skipped`);
        
    } else if (data.type === 'page_mismatch') {
        // Log to console only (no popup messages)
        console.log('Page mismatch detected - recitation does not match current page');
        
    } else if (data.type === 'backwards_anomaly') {
        // Log to console only (no popup messages)
        console.log('Backwards anomaly detected');
    }
}

// Clear all sequence error displays
function clearSequenceErrorDisplay() {
    // Remove warning classes from words
    const warningWords = document.querySelectorAll('.quran-word.sequence-warning');
    warningWords.forEach(word => {
        word.classList.remove('sequence-warning');
    });
    
    // Reset counter
    sequenceErrorsCount = 0;
}

// Modify verse display to support word wrapping with global indexing
const originalRenderPage = renderPage;
renderPage = function(pageData) {
    // Store current page data
    currentPageData = pageData;
    
    // Store second-to-last aya ID for completion check
    if (pageData && pageData.length >= 2) {
        currentPageSecondLastAyaId = pageData[pageData.length - 2].id;
        console.log(`Second-to-last aya ID: ${currentPageSecondLastAyaId}`);
    } else if (pageData && pageData.length === 1) {
        currentPageSecondLastAyaId = pageData[0].id;
        console.log(`Only one aya on page, using it: ${currentPageSecondLastAyaId}`);
    } else {
        currentPageSecondLastAyaId = null;
    }
    
    // Reset completion flag when page changes
    secondLastAyaCompleted = false;
    
    // Hide continue button when page changes
    const continueBtn = document.getElementById('continueNextPageBtn');
    if (continueBtn) {
        continueBtn.style.display = 'none';
    }
    
    // If page changed during recitation, reset counter
    if (isReciting) {
        lastRevealedGlobalIndex = -1;
    }
    
    const mushafPage = document.getElementById('mushafPage');
    let html = '';
    let currentSuraNo = null;
    let continuousText = '';
    let currentSuraName = '';
    let globalWordIndex = 0; // Sequential counter for all words on the page

    pageData.forEach((aya, index) => {
        if (aya.sura_no !== currentSuraNo) {
            if (continuousText) {
                html += `<div class="quran-text">${continuousText}</div>`;
                continuousText = '';
            }
            currentSuraNo = aya.sura_no;
            currentSuraName = aya.sura_name_ar;
            html += `
                <div class="sura-header">
                    <div class="sura-name">سورة ${aya.sura_name_ar}</div>
                    <div class="sura-info">السورة رقم ${aya.sura_no} - ${juzNames[aya.jozz]}</div>
                </div>
            `;
            if (aya.sura_no !== 9 && aya.aya_no === 1 && aya.sura_no !== 1) {
                html += `<div class="bismillah">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>`;
            }
        }
        if (continuousText) {
            continuousText += ' ';
        }
        const words = aya.aya_text_emlaey.split(/\s+/);
        continuousText += words.map((word, idx) => {
            const hiddenClass = isReciting ? 'hidden-word' : '';
            const span = `<span class="quran-word ${hiddenClass}" data-aya-id="${aya.id}" data-word-index="${idx}" data-global-word-index="${globalWordIndex}">${word}</span>`;
            globalWordIndex++;
            return span;
        }).join(' ') + ` <span class="aya-number">${aya.aya_no}</span>`;
    });

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
};
