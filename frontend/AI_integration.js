let mediaRecorder = null;
let socket = null;
let isReciting = false;
let currentAyaIndex = 0;
let audioChunks = [];
let lastRevealedGlobalIndex = -1; // Last word revealed in the current page

// Start recitation
async function startRecitation() {
    if (isReciting) return;
    isReciting = true;
    audioChunks = [];
    lastRevealedGlobalIndex = -1; // Reset counter

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
    
    document.getElementById('startRecitationBtn').style.display = 'inline-block';
    document.getElementById('stopRecitationBtn').style.display = 'none';
}

// Reset all words to their natural state
function resetAllWords() {
    const allWords = document.querySelectorAll('.quran-word');
    allWords.forEach(word => {
        word.classList.remove('hidden-word', 'revealed', 'correct');
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

// Update word state in the interface (new system)
function updateWordStyle(data) {
    const ayaSpans = document.querySelectorAll(`.quran-word[data-aya-id="${data.aya_id}"][data-word-index="${data.word_index}"]`);
    
    ayaSpans.forEach(span => {
        const globalIndex = parseInt(span.getAttribute('data-global-word-index'));
        
        if (data.is_correct) {
            // Correct word: reveal all words from the beginning up to this word
            if (globalIndex > lastRevealedGlobalIndex) {
                lastRevealedGlobalIndex = globalIndex;
                revealWordsUpTo(globalIndex);
            }
        }
        // Incorrect words: do nothing (remain hidden)
    });
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

// Modify verse display to support word wrapping with global indexing
const originalRenderPage = renderPage;
renderPage = function(pageData) {
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
