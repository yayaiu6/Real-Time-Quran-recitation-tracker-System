# Real-Time Quran recitation tracker System

[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An open-source, AI-powered system for real-time assessment and word-by-word tracking of Quranic recitation. This project leverages advanced fuzzy string matching algorithms inspired by [Tarteel AI's research](https://tarteel.ai/blog) to provide accurate, tolerant alignment between spoken recitation and the canonical Quranic text.

---

##  Overview

This project is an web-based application designed to assist Muslims worldwide in memorizing and perfecting their recitation of the Holy Quran. The system provides:

- **Real-time word-by-word tracking**: Highlights recited words on screen as they are spoken
- **Intelligent error detection**: Identifies skipped words, mispronunciations, and repetitions
- **Adaptive alignment**: Handles dialectal variations, tajweed differences, and minor errors
- **Low-latency feedback**: Optimized for mobile and web deployment with minimal processing delay
- **Open-source accessibility**: Free for educational, personal, and research purposes

Unlike page-level or verse-level systems, this project focuses on **word-level granularity**, enabling precise feedback that accelerates memorization and improves pronunciation accuracy.

---

##  Background

### Inspiration from Tarteel AI Research

This project draws heavily from the pioneering work of [Tarteel AI](https://tarteel.ai/blog), particularly their published research and technical blogs:

1. **[The Tarteel Dataset: Crowd-Sourced and Labeled Quranic Recitation](https://openreview.net/pdf?id=TAdzPkgnnV8)** (OpenReview, 2021)
   - Describes the creation of a diverse Quranic recitation dataset from over 1,000 contributors
   - Details the fuzzy-search alignment pipeline for matching transcriptions to Quranic text
   - Reports >98% accuracy in word-level alignment

2. **[Tarteel's ML Journey: Part 1 - Data Collection](https://tarteel.ai/blog/tarteels-ml-journey-part-1-intro-data-collection/)**
   - Explains the preprocessing and transcription pipeline using dialect-tuned ASR
   - Discusses the use of Levenshtein distance for similarity scoring

3. **[Introducing Tarteel Version 4: Faster Algorithms](https://tarteel.ai/blog/introducing-tarteel-version-4--faster-algorithms--quran-translations--and-more/)**
   - Details optimizations for real-time processing on mobile devices
   - Describes improvements in repetition detection and accent handling

### Core Insight: Fuzzy String Matching vs. Temporal Alignment

Tarteel's approach **avoids complex acoustic alignment methods** like Dynamic Time Warping (DTW), which align audio signals at the waveform level. Instead, it performs **text-based fuzzy matching** on transcriptions, offering:

- **Efficiency**: Text comparisons are computationally lighter than DTW
- **Robustness**: Tolerates ASR transcription errors through edit distance metrics
- **Simplicity**: Easier to debug and tune for word-level feedback

This project implements this philosophy using:
- **Groq Whisper API** for Arabic speech-to-text transcription
- **Levenshtein distance** for fuzzy word matching
- **Custom segment search** for context-aware alignment

### ASR Architecture & Model Selection Strategy

For real-time Quranic recitation tracking, the choice of Automatic Speech Recognition (ASR) backend is critical, balancing **latency**, **accuracy**, and **computational cost**.

1. **OpenAI Whisper**: While a robust general-purpose model trained on 100+ languages, Whisper often prioritizes broad multilingual support over the specific nuances of Quranic recitation. It can also introduce higher latency or require significant cloud resources (e.g., Groq API) for real-time performance.

2. **NVIDIA NeMo**: An open-source, high-performance ASR framework optimized for speed. However, standard pre-trained NeMo models are typically English-centric or lack specific tuning for Arabic dialects.

3. **Tarteel AI's Proprietary Model**: As noted in their research, Tarteel utilizes a NeMo-based model fine-tuned specifically for the Quran, achieving >96% accuracy in error detection. However, this model is closed-source and unavailable for community development.

**Our Solution: Specialized Open-Source Arabic ASR**

To bridge the gap between open-source accessibility and specialized performance, this project recommends using **[MostafaAhmed98/Conformer-CTC-Arabic-ASR](https://huggingface.co/MostafaAhmed98/Conformer-CTC-Arabic-ASR)**. 

- **Architecture**: Fine-tuned NVIDIA NeMo Conformer-CTC (Connectionist Temporal Classification)
- **Dataset**: Trained on the Arabic Common Voice dataset
- **Performance**: Offers an approximate **60% performance improvement** in inference speed and dialect handling compared to general-purpose models for this specific task.
- **License**: MIT (Open Source)

This model provides the optimal trade-off for this project: it is lightweight enough for local deployment, faster than Whisper for short audio chunks, and significantly more accurate for Arabic phonemes than generic models.

**Usage Example (NeMo):**

```python
import nemo.collections.asr as nemo_asr

# Load the specialized Arabic model
asr_model = nemo_asr.models.EncDecCTCModel.from_pretrained("MostafaAhmed98/Conformer-CTC-Arabic-ASR")

# Transcribe audio
audio_file = "path/to/arabic_audio.wav"
transcription = asr_model.transcribe([audio_file])
print(transcription[0])
```

---

##  Algorithmic Foundation

### 1. Text Normalization

Quranic Arabic contains diacritics (tashkeel), elongation marks, and special characters that must be normalized for comparison. The system applies:

```
normalize(text) = remove_diacritics(remove_tatweel(remove_punctuation(text)))
```

**Example:**
```
Input:  "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
Output: "بسم الله الرحمن الرحيم"
```

### 2. Levenshtein Distance (Edit Distance)

The core similarity metric, Levenshtein distance `Lev(a, b)`, measures the minimum number of single-character edits (insertions, deletions, substitutions) required to transform string `a` into string `b`.

**Recursive Definition:**
```
Lev(a, b) = 
  ⎧ |a|                           if |b| = 0
  ⎪ |b|                           if |a| = 0
  ⎨ Lev(tail(a), tail(b))         if head(a) = head(b)
  ⎪ 1 + min(
  ⎪   Lev(tail(a), b),           # deletion
  ⎩   Lev(a, tail(b)),           # insertion
      Lev(tail(a), tail(b))      # substitution
    )
```

**Python Implementation:**
```python
from Levenshtein import distance

lev_distance = distance("الرحمن", "الرحيم")  # = 2 (substitution of "من" → "يم")
```

### 3. Segment Scoring Function

Given a transcribed phrase `T` and a candidate Quranic segment `Q`, the similarity score is computed as:

```
Score(T, Q) = α × (1 - Lev(T, Q) / max(|T|, |Q|)) - β × |len(T) - len(Q)| / max(|T|, |Q|)
```

Where:
- **α** (alpha): Weight for normalized Levenshtein similarity (default: 0.7)
- **β** (beta): Penalty for length mismatch (default: 0.3)
- **|T|, |Q|**: Character lengths of transcription and Quran segment

**Thresholding:**
```
if Score(T, Q) ≥ SEGMENT_THRESHOLD:
    Q is a valid candidate segment
```

### 4. Needleman-Wunsch Word Alignment

Once a best-matching segment is found, individual spoken words are aligned to Quranic words using a modified **Needleman-Wunsch algorithm** (global sequence alignment):

**Scoring Matrix:**
```
S[i][j] = max(
  S[i-1][j-1] + match_score(spoken[i], quran[j]),   # match/substitution
  S[i-1][j] + DELETE_COST,                          # deletion (extra spoken word)
  S[i][j-1] + INSERT_COST                           # insertion (skipped Quran word)
)
```

**Match Score:**
```
match_score(w1, w2) = 1 - Lev(w1, w2) / max(|w1|, |w2|)
```

**Word-Level Decision:**
```
if match_score(spoken_word, quran_word) ≥ WORD_THRESHOLD:
    Mark word as CORRECT
else:
    Mark word as INCORRECT
```

### 5. Dual-Mode Tracking

The system operates in two modes to balance accuracy and efficiency:

#### **Tracking Mode** (Default)
- Searches within a **local window** around the last known position
- Window size: `anchor_pos - BACKWARD_MARGIN` to `anchor_pos + WINDOW_SIZE`
- **Advantages**: Fast, prevents large jumps, follows linear recitation
- **Use case**: Continuous recitation without errors

#### **Search Mode** (Fallback)
- Activated after `MAX_LOW_CONFIDENCE_CHUNKS` consecutive low-confidence alignments
- Searches the **entire page** for the best match
- **Advantages**: Recovers from skipped verses, repetitions, or user restarts
- **Use case**: Correcting mistakes or jumping between verses

**Mode Transition:**
```python
if confidence < CONFIDENCE_THRESHOLD:
    consecutive_low_confidence += 1
    if consecutive_low_confidence >= MAX_LOW_CONFIDENCE_CHUNKS:
        mode = "search"
else:
    consecutive_low_confidence = 0
    mode = "tracking"
```

---

##  Implementation

### Segment Generation

For a Quran text with `N` total words, segments are generated using a sliding window:

```python
def generate_segments(words: List[WordEntry], min_len=5, max_len=25, stride=3):
    segments = []
    for start in range(0, len(words), stride):
        for length in range(min_len, min(max_len + 1, len(words) - start + 1)):
            segment_words = words[start:start + length]
            segments.append(SegmentCandidate(
                words=segment_words,
                text=' '.join([w.text for w in segment_words]),
                start_global_index=segment_words[0].global_index,
                end_global_index=segment_words[-1].global_index
            ))
    return segments
```

**Complexity:** O(N × M) where M = (max_len - min_len) / stride

### Alignment Complexity

Given:
- `S`: Number of segments in search space
- `T`: Number of transcribed words
- `Q`: Average segment length

**Total Complexity:**
```
Segment Scoring:   O(S × avg(|T|, |Q|))  # Levenshtein for each segment
Word Alignment:    O(T × Q)                # Needleman-Wunsch on best segment
Overall:           O(S × L + T × Q)        # where L = avg character length
```

**Optimizations:**
1. Early stopping: Discard segments with score < threshold
2. Segment caching: Precompute segment texts during initialization
3. Tracking mode: Reduce S by limiting search window

---

##  System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Frontend (HTML/JS)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Microphone  │→ │ MediaRecorder│→ │   SocketIO   │          │
│  │   Input      │  │  (WebM/Opus) │  │   Client     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────────┬───────────────────────────────┘
                                 │ Audio Chunks (5s intervals)
                                 ↓
┌────────────────────────────────────────────────────────────────┐
│                      Backend (Flask/SocketIO)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   FFmpeg     │→ │ Groq Whisper │→ │  Normalize   │          │
│  │ WebM → WAV   │  │  (ASR API)   │  │     Text     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                           ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          Quran Alignment Engine                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │  Segment   │→ │   Score    │→ │   Align    │         │   │
│  │  │ Generation │  │  (Lev+α,β) │  │ (N-W Algo) │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                    │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Session    │→ │   Emit Word  │                            │
│  │   Manager    │  │   Results    │                            │
│  └──────────────┘  └──────────────┘                            │
└────────────────────────────────────────────────────────────────┘
                                 │ Word-level feedback
                                 ↓
┌────────────────────────────────────────────────────────────────┐
│                  Frontend (Word Highlighting)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Correct    │  │  Incorrect   │  │   Hidden     │          │
│  │ (Revealed)   │  │  (Remains    │  │   (Pending)  │          │
│  │              │  │   Hidden)    │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JS | User interface, audio capture, real-time display |
| **Audio Processing** | MediaRecorder API, FFmpeg | WebM encoding, WAV conversion (16kHz mono) |
| **ASR** | Groq Whisper-large-v3-turbo OR NVIDIA NeMo CTC | Arabic speech-to-text (cloud or local) |
| **Alignment Engine** | Python, Levenshtein | Fuzzy segment matching, word alignment |
| **Session Management** | Flask-SocketIO | WebSocket communication, state persistence |
| **Data** | JSON (hafs_smart_v8) | Quranic text with metadata (sura, aya, juz) |

---

##  Installation & Usage

### Prerequisites

- **Python 3.8+**
- **FFmpeg** (for audio conversion)

**For Groq Whisper Backend (Cloud API - Default):**
- **Groq API Key** ([Get one here](https://console.groq.com/))

**For NVIDIA NeMo Backend (Local Processing):**
- **NVIDIA GPU with CUDA** (highly recommended for real-time performance)
- **NeMo Model File**: `arabic-asr/conformer_ctc_small_60e_adamw_30wtr_32wv_40wte.nemo`
- **PyTorch with CUDA support** (install from [pytorch.org](https://pytorch.org/))

### Direct Execution

#### Step 1: Clone and Setup Environment
in `Terminal`
```bash
# Clone the repository
git clone https://github.com/yayaiu6/Real-Time-Quran-recitation-tracker-System
cd Real-Time-Quran-recitation-tracker-System

# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

#### Step 2: Install Dependencies
```bash
# Install base dependencies
pip install -r requirements.txt

# For NeMo backend: Install PyTorch with CUDA
# Visit https://pytorch.org/ and install the appropriate version for your system
# Example for CUDA 11.8:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### Step 3: Configure ASR Backend

**Option A: Using Groq Whisper (Default - Cloud API)**

Create `.env` file:
```.env
GROQ_API_KEY=your_groq_api_key_here
```

In `backend/config.py`, ensure:
```python
ASR_BACKEND = "whisper"  # Default
```

**Option B: Using NVIDIA NeMo (Local Processing)**

Ensure the NeMo model file exists at:
```
arabic-asr/conformer_ctc_small_60e_adamw_30wtr_32wv_40wte.nemo
```

In `backend/config.py`, change:
```python
ASR_BACKEND = "nemo"
```

Or set environment variable:
```bash
export ASR_BACKEND=nemo  # Linux/Mac
set ASR_BACKEND=nemo     # Windows
```

#### Step 4: Test Configuration (Optional but Recommended)
```bash
python test_asr_backends.py
```
This will verify your ASR backend is properly configured before running the app.

#### Step 5: Run the Application
```bash
python run.py
```
The app will be available at `http://localhost:7860`

**Note**: Check the startup logs to confirm which ASR backend is active:
```
INFO: ASR Backend: whisper (cloud)
# or
INFO: ASR Backend: nemo (local)
INFO: NeMo model loaded on CUDA (GPU)
```

---

##  Configuration

All tunable parameters are located in `backend/config.py`:

### ASR Backend Selection

```python
ASR_BACKEND = "whisper"  # Options: "whisper" (Groq cloud) or "nemo" (local)
NEMO_MODEL_PATH = "arabic-asr/conformer_ctc_small_60e_adamw_30wtr_32wv_40wte.nemo"
AUDIO_BUFFER_MAX_DURATION = 8.0  # Cumulative audio buffer (seconds) for better context
```

**Cumulative Audio Buffer (Sliding Window)**:
- The system maintains a sliding window of audio (default: 8 seconds)
- Each new chunk is added to the buffer, providing more context to the ASR model
- Older audio gradually fades out as new audio comes in
- This significantly improves transcription accuracy, especially for NeMo
- Adjust `AUDIO_BUFFER_MAX_DURATION` (6-10 seconds recommended)

### Alignment Settings

```python
WORD_SIMILARITY_THRESHOLD = 0.45    # Min similarity for correct word (0.0-1.0)
SEGMENT_SCORE_THRESHOLD = 0.5       # Min score for candidate segments
LEVENSHTEIN_WEIGHT = 0.7            # α: Weight for edit distance
LENGTH_PENALTY_WEIGHT = 0.3         # β: Weight for length difference
```

### Tracking Window

```python
TRACKING_WINDOW_SIZE = 60           # Words to search ahead in tracking mode
BACKWARD_MARGIN = 15                # Words to search behind anchor position
```

### Segment Generation

```python
MIN_SEGMENT_WORDS = 5               # Minimum words per segment
MAX_SEGMENT_WORDS = 25              # Maximum words per segment
SEGMENT_STRIDE = 3                  # Overlap between segments
```

### Audio Processing

```python
MIN_AUDIO_ENERGY = 0.01             # RMS threshold for silence detection
                                    # 0.005 = very sensitive
                                    # 0.01  = medium (default)
                                    # 0.02  = strict
```

### Session Management

```python
CONFIDENCE_THRESHOLD = 0.4          # Switch to search mode if below this
MAX_LOW_CONFIDENCE_CHUNKS = 3       # Consecutive low chunks before search mode
```

### Tuning Recommendations

**If you experience:**

1. **Too many false positives** (incorrect words marked correct):
   - Increase `WORD_SIMILARITY_THRESHOLD` to 0.7-0.8
   - Increase `SEGMENT_SCORE_THRESHOLD` to 0.55

2. **Too many false negatives** (correct words marked incorrect):
   - Decrease `WORD_SIMILARITY_THRESHOLD` to 0.4-0.5
   - Decrease `SEGMENT_SCORE_THRESHOLD` to 0.4

3. **Tracking loses position frequently**:
   - Increase `TRACKING_WINDOW_SIZE` to 80-100
   - Increase `BACKWARD_MARGIN` to 20-25

4. **Silence processed as speech**:
   - Increase `MIN_AUDIO_ENERGY` to 0.02-0.03

5. **Real audio rejected as noise**:
   - Decrease `MIN_AUDIO_ENERGY` to 0.005

6. **Want to switch ASR backend**:
   - For cloud processing: Set `ASR_BACKEND = "whisper"` and ensure `GROQ_API_KEY` is set
   - For local processing: Set `ASR_BACKEND = "nemo"` and ensure GPU/CUDA is available
   - Check logs on startup to confirm which backend is active

7. **NeMo transcription is slow**:
   - Verify CUDA is available (logs should show "Model loaded on CUDA")
   - If on CPU, consider switching to `ASR_BACKEND = "whisper"` for better latency
   - Ensure PyTorch CUDA version matches your GPU drivers

---

## 📁 Project Structure

```
quraan_ai/
├── backend/                    # Backend server
│   ├── app.py                  # Flask application + SocketIO handlers
│   ├── asr_backend.py          # ASR abstraction layer (Whisper/NeMo)
│   ├── config.py               # Configuration parameters
│   ├── quran_alignment.py      # Core alignment engine (Tarteel-inspired)
│   ├── session_manager.py      # User session state management
│   └── __init__.py
├── frontend/                   # Frontend interface
│   ├── index.html              # Main HTML page
│   ├── style.css               # Styling (RTL-optimized for Arabic)
│   ├── core.js                 # Quran display, navigation, search
│   └── AI_integration.js       # Audio capture, WebSocket communication
├── arabic-asr/                 # NeMo ASR model (for local processing)
│   ├── app.py                  # Standalone Gradio demo
│   └── conformer_ctc_small_60e_adamw_30wtr_32wv_40wte.nemo  # Model file
├── assets/                     # Static resources
│   ├── hafs_smart_v8.json      # Quranic text data (Hafs recitation)
│   └── HafsSmart_08.ttf        # Arabic font
├── .env                        # Environment variables (GROQ_API_KEY, ASR_BACKEND)
├── run.py                      # Application entry point
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

---

##  Research References

This project is built upon the following research and technical documentation:

1. **Anas Abou Allaban, Abubakar Abid, et al.** (2021)  
   *The Tarteel Dataset: Evocative Evaluations for Machine Learning in Arabic Text and Speech Recognition*  
   [OpenReview](https://openreview.net/pdf?id=TAdzPkgnnV8)

2. **Tarteel AI Blog** (2020)  
   *Tarteel's ML Journey: Part 1 - Intro & Data Collection*  
   [Blog Post](https://tarteel.ai/blog/tarteels-ml-journey-part-1-intro-data-collection/)

3. **Tarteel AI Blog** (2021)  
   *Introducing Tarteel Version 4: Faster Algorithms, Quran Translations, and More*  
   [Blog Post](https://tarteel.ai/blog/introducing-tarteel-version-4--faster-algorithms--quran-translations--and-more/)

4. **Levenshtein, Vladimir I.** (1966)  
   *Binary codes capable of correcting deletions, insertions, and reversals*  
   Soviet Physics Doklady, 10(8), 707-710.

5. **Needleman, Saul B., and Christian D. Wunsch** (1970)  
   *A general method applicable to the search for similarities in the amino acid sequence of two proteins*  
   Journal of Molecular Biology, 48(3), 443-453.

---

### Areas for Contribution

- **Algorithm Improvements**: Enhance alignment accuracy, speed optimizations
- **UI/UX**: Better visual feedback, mobile responsiveness, accessibility
- **Multilingual Support**: Add translations for interface text
- **Testing**: Unit tests, integration tests, benchmarking

##  Acknowledgments

- **Tarteel AI Team**: For their groundbreaking research in Quranic AI applications
- **Groq**: For providing fast, accurate Whisper API access
- **NVIDIA**: For the NeMo toolkit and Arabic ASR models enabling local processing
---

## 📧 Contact

For questions, bug reports, or feature requests, please open an issue on GitHub

**Contact Us**

***Email***: mailto:yahyamahroof35@gmail.com

***whatsapp***: http://wa.me/201001866276


