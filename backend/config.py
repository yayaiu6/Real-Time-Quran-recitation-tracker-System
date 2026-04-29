"""
Configuration file for tunable parameters
"""

# ==============================================================================
# Alignment Settings
# ==============================================================================

# Similarity Thresholds
WORD_SIMILARITY_THRESHOLD = 0.7  # Minimum threshold to consider a word correct (0.7-0.85 recommended)
SEGMENT_SCORE_THRESHOLD = 0.5     # Minimum threshold to accept a candidate segment (0.4-0.6 recommended)

# Scoring Weights
LEVENSHTEIN_WEIGHT = 0.7  # Weight of Levenshtein distance in segment calculation
LENGTH_PENALTY_WEIGHT = 0.3  # Weight of length difference in segment calculation

# Alignment Costs
DELETE_COST = 0.8   # Cost of extra spoken word
INSERT_COST = 0.8   # Cost of missing Quranic word

# Tracking Window
TRACKING_WINDOW_SIZE = 40      # Number of words in search window (tracking mode)
BACKWARD_MARGIN = 15           # Number of words to go back from current position

# Segment Generation Limits
MIN_SEGMENT_WORDS = 5   # Minimum number of words in segment
MAX_SEGMENT_WORDS = 25  # Maximum number of words in segment
SEGMENT_STRIDE = 3      # Overlap between consecutive segments

# ==============================================================================
# Session Settings
# ==============================================================================

# Confidence & Tracking
CONFIDENCE_THRESHOLD = 0.3  # Minimum confidence before switching to search mode
MAX_LOW_CONFIDENCE_CHUNKS = 3  # Number of low confidence chunks before switching to search

# ==============================================================================
# Audio Settings
# ==============================================================================

# Silence Detection
MIN_AUDIO_ENERGY = 0.01  # Minimum audio energy (lower = silence)
                         # Recommended values:
                         # 0.005 = very sensitive
                         # 0.01  = medium (default)
                         # 0.02  = strict

# ==============================================================================
# ASR Backend Settings
# ==============================================================================

# ASR Backend Selection
ASR_BACKEND = "nemo"  # Options: "whisper" (cloud API) or "nemo" (local NVIDIA NeMo)
                         # - "whisper": Uses a cloud Whisper provider (Groq/OpenAI)
                         # - "nemo": Uses local NVIDIA NeMo model (requires GPU with CUDA for best performance)

# Cloud Whisper Provider (only used when ASR_BACKEND = "whisper")
ASR_CLOUD_PROVIDER = "groq"  # Options: "groq" or "openai"

# NeMo Model Settings (only used when ASR_BACKEND = "nemo")
NEMO_MODEL_PATH = "arabic-asr/conformer_ctc_small_60e_adamw_30wtr_32wv_40wte.nemo"  # Path to NeMo model file

# Audio Buffer Settings (Cumulative Transcription)
AUDIO_BUFFER_MAX_DURATION = 8.0  # Maximum audio buffer duration in seconds (sliding window)
                                  # Higher values = more context for ASR but slower processing
                                  # Recommended: 6-10 seconds

# ==============================================================================
# Sequence Analysis Settings (Skip Detection)
# ==============================================================================

# Sequence Skip Detection
SEQUENCE_SKIP_MIN_WORDS = 12  # Minimum words gap to consider as skip (10-15 recommended)
SEQUENCE_SKIP_MIN_AYAS = 1    # Minimum complete ayas to consider as skip
SEQUENCE_BACKWARDS_TOLERANCE = 3  # Allow going back this many words (natural correction)
SEQUENCE_LOW_CONFIDENCE_THRESHOLD = 0.3  # Below this, consider page mismatch
SEQUENCE_MIN_SEGMENT_SCORE = 0.4  # Minimum segment score for valid alignment
SEQUENCE_ALERT_MIN_CONFIDENCE = 0.5  # Minimum confidence to alert user about skip

# ==============================================================================
# Logging Settings
# ==============================================================================

LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR
LOG_AUDIO_ENERGY = True  # Log audio energy for each chunk
LOG_ALIGNMENT_DETAILS = True  # Log alignment details

# ==============================================================================
# Tuning Notes
# ==============================================================================

"""
If results show:

1. Too many false positives (incorrect words considered correct):
   - Increase WORD_SIMILARITY_THRESHOLD to 0.8
   - Increase SEGMENT_SCORE_THRESHOLD to 0.55

2. Too many false negatives (correct words considered incorrect):
   - Decrease WORD_SIMILARITY_THRESHOLD to 0.7
   - Decrease SEGMENT_SCORE_THRESHOLD to 0.45
   
3. Tracking loses position frequently:
   - Increase TRACKING_WINDOW_SIZE to 80
   - Increase BACKWARD_MARGIN to 20
   - Decrease CONFIDENCE_THRESHOLD to 0.3

4. Silence is processed as audio:
   - Increase MIN_AUDIO_ENERGY to 0.02 or 0.03

5. Real audio is rejected:
   - Decrease MIN_AUDIO_ENERGY to 0.005

6. Processing is slow:
   - Reduce TRACKING_WINDOW_SIZE to 40
   - Reduce MAX_SEGMENT_WORDS to 20

7. Want to use local ASR instead of cloud API:
   - Change ASR_BACKEND to "nemo"
   - Ensure NEMO_MODEL_PATH points to valid .nemo model file
   - GPU with CUDA highly recommended for real-time performance

8. NeMo ASR is slow:
   - Ensure CUDA is available (check logs for "Model loaded on CUDA")
   - If running on CPU, consider switching back to "whisper" for better latency

9. Too many false skip alerts (detecting skips when there are none):
   - Increase SEQUENCE_SKIP_MIN_WORDS to 15-20
   - Increase SEQUENCE_ALERT_MIN_CONFIDENCE to 0.6-0.7

10. Missing real skips (student skips ayas but not detected):
   - Decrease SEQUENCE_SKIP_MIN_WORDS to 8-10
   - Decrease SEQUENCE_ALERT_MIN_CONFIDENCE to 0.4
"""
