import io
import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, cast

import ffmpeg
from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory, request as flask_request
from flask_compress import Compress
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from quran_alignment import AlignmentConfig, QuranAlignmentEngine, normalize_text
from session_manager import SessionManager
import config as app_config
import asr_backend

# Setup logging
logging.basicConfig(level=getattr(logging, app_config.LOG_LEVEL), format='%(asctime)s %(levelname)s: %(message)s')

# Load environment variables (supports .env files)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

app = Flask(__name__)
CORS(app)
Compress(app)  # Enable gzip compression for all responses
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    max_http_buffer_size=10 * 1024 * 1024,  # 10MB buffer for large JSON data
    ping_timeout=60,
    ping_interval=25,
    async_mode='eventlet'  # Use eventlet for async processing
)

# Thread pool for parallel processing
executor = ThreadPoolExecutor(max_workers=4)

# Performance metrics
performance_metrics = {
    'audio_processing_times': [],
    'transcription_times': [],
    'alignment_times': [],
    'total_chunks_processed': 0
}

# Load Quran data and build indexes
with open('assets/hafs_smart_v8.json', 'r', encoding='utf-8') as file:
    quran_data = json.load(file)

# Build indexes for fast lookup
page_index = {}  # page_number -> list of ayat
sura_index = {}  # sura_number -> list of ayat
juz_index = {}   # juz_number -> list of ayat

for aya in quran_data:
    # Page index
    page_num = aya.get('page')
    if page_num:
        if page_num not in page_index:
            page_index[page_num] = []
        page_index[page_num].append(aya)
    
    # Sura index
    sura_num = aya.get('sura_no')
    if sura_num:
        if sura_num not in sura_index:
            sura_index[sura_num] = []
        sura_index[sura_num].append(aya)
    
    # Juz index
    juz_num = aya.get('jozz')
    if juz_num:
        if juz_num not in juz_index:
            juz_index[juz_num] = []
        juz_index[juz_num].append(aya)

# Build metadata for quick access
metadata = {
    'total_pages': max(page_index.keys()) if page_index else 0,
    'total_suras': max(sura_index.keys()) if sura_index else 0,
    'total_juz': max(juz_index.keys()) if juz_index else 0,
    'suras': [],
    'pages': list(range(1, max(page_index.keys()) + 1)) if page_index else []
}

# Build sura list with names
seen_suras = set()
for aya in quran_data:
    if aya['sura_no'] not in seen_suras:
        seen_suras.add(aya['sura_no'])
        metadata['suras'].append({
            'no': aya['sura_no'],
            'name': aya['sura_name_ar'],
            'first_page': aya['page']
        })

metadata['suras'].sort(key=lambda x: x['no'])

logging.info(f"Loaded {len(quran_data)} verses, {metadata['total_pages']} pages, {metadata['total_suras']} suras")

# Initialize alignment engine (Tarteel-style fuzzy matching)
logging.info("Initializing Quran alignment engine...")

# Create settings with custom values
alignment_config = AlignmentConfig()
# Override defaults with config file values
alignment_config.WORD_THRESHOLD = app_config.WORD_SIMILARITY_THRESHOLD
alignment_config.SEGMENT_THRESHOLD = app_config.SEGMENT_SCORE_THRESHOLD
alignment_config.ALPHA = app_config.LEVENSHTEIN_WEIGHT
alignment_config.BETA = app_config.LENGTH_PENALTY_WEIGHT
alignment_config.DELETE_COST = app_config.DELETE_COST
alignment_config.INSERT_COST = app_config.INSERT_COST
alignment_config.WINDOW_SIZE = app_config.TRACKING_WINDOW_SIZE # type: ignore
alignment_config.BACKWARD_MARGIN = app_config.BACKWARD_MARGIN
alignment_config.MIN_SEGMENT_WORDS = app_config.MIN_SEGMENT_WORDS
alignment_config.MAX_SEGMENT_WORDS = app_config.MAX_SEGMENT_WORDS
alignment_config.SEGMENT_STRIDE = app_config.SEGMENT_STRIDE # type: ignore
alignment_config.CONFIDENCE_THRESHOLD = app_config.CONFIDENCE_THRESHOLD

logging.info("Configuration applied:")
logging.info(f"  - Word threshold: {alignment_config.WORD_THRESHOLD}")
logging.info(f"  - Segment threshold: {alignment_config.SEGMENT_THRESHOLD}")
logging.info(f"  - Window size: {alignment_config.WINDOW_SIZE}")
logging.info(f"  - Min audio energy: {app_config.MIN_AUDIO_ENERGY}")

alignment_engine = QuranAlignmentEngine(quran_data, alignment_config)
logging.info(f"Alignment engine ready. Total words indexed: {len(alignment_engine.all_words)}")

# Initialize session manager
session_manager = SessionManager(
    confidence_threshold=alignment_config.CONFIDENCE_THRESHOLD,
    max_low_confidence=app_config.MAX_LOW_CONFIDENCE_CHUNKS,
    audio_buffer_max_duration=app_config.AUDIO_BUFFER_MAX_DURATION
)

# Initialize and deploy ASR backend
logging.info("Initializing ASR backend...")
try:
    asr_backend.initialize_backend()
    asr_info = asr_backend.get_backend_info()
    logging.info(f"✓ ASR Backend ready: {asr_info['backend']} ({asr_info['type']})")
    if 'device' in asr_info:
        logging.info(f"  Device: {asr_info['device']}")
except Exception as e:
    logging.error(f"✗ Failed to initialize ASR backend: {e}")
    logging.error("  Application may not work correctly. Please check configuration.")

@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    # Serve files from frontend or assets based on type
    if filename.endswith(('.html', '.css', '.js')):
        return send_from_directory('../frontend', filename)
    elif filename.endswith(('.ttf', '.json')):
        return send_from_directory('../assets', filename)
    return send_from_directory('../frontend', filename)

@app.route('/quran-data')
def serve_quran_data():
    """Legacy endpoint - returns all data (deprecated, use paginated endpoints)"""
    try:
        return jsonify(quran_data)
    except Exception as e:
        logging.error(f"Error loading Quran data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/quran-data/metadata')
def serve_metadata():
    """Get Quran metadata (suras, pages, juz info) - lightweight"""
    try:
        response = jsonify(metadata)
        response.headers['Cache-Control'] = 'public, max-age=86400'  # Cache for 24 hours
        return response
    except Exception as e:
        logging.error(f"Error loading metadata: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/quran-data/page/<int:page_num>')
def serve_page_data(page_num):
    """Get data for a specific page - optimized for fast loading"""
    try:
        if page_num not in page_index:
            return jsonify({'error': 'Page not found'}), 404
        
        response = jsonify(page_index[page_num])
        response.headers['Cache-Control'] = 'public, max-age=86400'  # Cache for 24 hours
        return response
    except Exception as e:
        logging.error(f"Error loading page {page_num}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/quran-data/sura/<int:sura_num>')
def serve_sura_data(sura_num):
    """Get data for a specific sura"""
    try:
        if sura_num not in sura_index:
            return jsonify({'error': 'Sura not found'}), 404
        
        response = jsonify(sura_index[sura_num])
        response.headers['Cache-Control'] = 'public, max-age=86400'  # Cache for 24 hours
        return response
    except Exception as e:
        logging.error(f"Error loading sura {sura_num}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/quran-data/search')
def search_quran():
    """Search Quran text - returns limited results"""
    try:
        query = flask_request.args.get('q', '').strip()
        limit = int(flask_request.args.get('limit', 10))
        
        if not query:
            return jsonify({'results': [], 'total': 0})
        
        results = []
        for aya in quran_data:
            if query in aya['aya_text_emlaey'] or query in aya['sura_name_ar']:
                results.append(aya)
                if len(results) >= limit:
                    break
        
        response = jsonify({'results': results, 'total': len(results), 'query': query})
        response.headers['Cache-Control'] = 'public, max-age=3600'  # Cache for 1 hour
        return response
    except Exception as e:
        logging.error(f"Error searching Quran: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/metrics')
def get_metrics():
    """Get performance metrics"""
    try:
        avg_audio = sum(performance_metrics['audio_processing_times']) / len(performance_metrics['audio_processing_times']) if performance_metrics['audio_processing_times'] else 0
        avg_transcription = sum(performance_metrics['transcription_times']) / len(performance_metrics['transcription_times']) if performance_metrics['transcription_times'] else 0
        avg_alignment = sum(performance_metrics['alignment_times']) / len(performance_metrics['alignment_times']) if performance_metrics['alignment_times'] else 0
        
        return jsonify({
            'total_chunks_processed': performance_metrics['total_chunks_processed'],
            'average_audio_processing_time': round(avg_audio, 3),
            'average_transcription_time': round(avg_transcription, 3),
            'average_alignment_time': round(avg_alignment, 3),
            'average_total_time': round(avg_audio + avg_transcription + avg_alignment, 3),
            'samples': {
                'audio': len(performance_metrics['audio_processing_times']),
                'transcription': len(performance_metrics['transcription_times']),
                'alignment': len(performance_metrics['alignment_times'])
            }
        })
    except Exception as e:
        logging.error(f"Error getting metrics: {e}")
        return jsonify({'error': str(e)}), 500

# Helper function to get page verses
def get_page_verses(page_number: int, quran_data_list) -> list:
    """Get all verse IDs for a given page using the 'page' field"""
    page_ayats = [aya for aya in quran_data_list if aya.get('page') == page_number]
    return [aya['id'] for aya in page_ayats]

@socketio.on('connect')
def handle_connect():
    sid = cast(Any, flask_request).sid
    session_manager.create_session(sid)
    logging.info(f"Session connected: {sid}")

@socketio.on('disconnect')
def handle_disconnect():
    sid = cast(Any, flask_request).sid
    session_manager.delete_session(sid)
    logging.info(f"Session disconnected: {sid}")

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """
    Handle audio chunk with Tarteel-style fuzzy alignment (optimized with timing)
    """
    chunk_start_time = time.time()
    
    try:
        req = cast(Any, flask_request)
        sid = req.sid
        
        logging.info(f"[{sid[:8]}] Received audio chunk: {len(data)} bytes")
        
        # Get session state
        session_state = session_manager.get_session(sid)
        
        # Read audio data (WebM format from browser or ArrayBuffer)
        if isinstance(data, bytes):
            audio_data = data
        else:
            audio_file = io.BytesIO(data)
            audio_data = audio_file.read()

        # Handle WebM header persistence (CORRECT WAY)
        if session_state.webm_header is None:
            # First chunk: extract and save WebM header (first 500 bytes)
            session_state.webm_header = audio_data[:500]
            process_data = audio_data
            logging.info(f"[{sid[:8]}] Saved WebM header ({len(session_state.webm_header)} bytes)")
        else:
            # Subsequent chunks: prepend header to make complete WebM file
            process_data = session_state.webm_header + audio_data
            logging.info(f"[{sid[:8]}] Prepended WebM header to chunk")

        # Convert WebM to WAV using ffmpeg (timed)
        audio_start = time.time()
        try:
            stream = ffmpeg.input('pipe:', format='webm').output(
                'pipe:', format='wav', acodec='pcm_s16le', ar=16000, ac=1
            )
            wav_buffer = io.BytesIO()
            out, err = stream.run(input=process_data, capture_stdout=True, capture_stderr=True)
            wav_buffer.write(out)
            wav_buffer.seek(0)
            audio_time = time.time() - audio_start
            performance_metrics['audio_processing_times'].append(audio_time)
            logging.info(f"[{sid[:8]}] Audio conversion: {audio_time:.3f}s")
        except ffmpeg._run.Error as e:
            logging.error(f"[{sid[:8]}] Audio conversion error: {e.stderr.decode()}")
            emit('word_result', {'error': f"Audio conversion failed: {e.stderr.decode()}"})
            return

        # Add current chunk to cumulative audio buffer (sliding window)
        current_wav_bytes = wav_buffer.getvalue()
        chunk_duration = 2.0  # Approximate duration per chunk
        session_manager.add_audio_to_buffer(sid, current_wav_bytes, chunk_duration)
        
        # Get cumulative audio for transcription (sliding window approach)
        cumulative_wav = session_manager.get_cumulative_audio(sid)
        buffer_duration = session_manager.get_session(sid).audio_buffer_duration
        logging.info(f"[{sid[:8]}] Cumulative buffer: {buffer_duration:.1f}s, {len(cumulative_wav)} bytes")

        # Transcribe with configured ASR backend (timed)
        transcription_start = time.time()
        backend_info = asr_backend.get_backend_info()
        logging.info(f"[{sid[:8]}] Transcribing with ASR backend: {backend_info['backend']}...")
        
        try:
            # Transcribe cumulative audio (sliding window)
            transcription = asr_backend.transcribe_audio(cumulative_wav)
        except RuntimeError as e:
            logging.error(f"[{sid[:8]}] ASR backend error: {e}")
            emit('word_result', {'error': 'asr_error', 'message': str(e)})
            return
        except Exception as e:
            logging.error(f"[{sid[:8]}] Transcription failed: {e}")
            emit('word_result', {'error': 'transcription_failed', 'message': str(e)})
            return
        
        transcription_time = time.time() - transcription_start
        performance_metrics['transcription_times'].append(transcription_time)
        
        logging.info(f"[{sid[:8]}] ASR output: {transcription} (took {transcription_time:.3f}s)")

        # Validate transcription
        if not transcription.strip():
            logging.warning(f"[{sid[:8]}] Empty transcription")
            emit('word_result', {'error': 'No speech detected'})
            return

        # Normalize and tokenize
        spoken_text = normalize_text(transcription)
        spoken_words = spoken_text.split()
        
        if not spoken_words:
            logging.warning(f"[{sid[:8]}] No words after normalization")
            emit('word_result', {'error': 'No valid words detected'})
            return

        logging.info(f"[{sid[:8]}] Spoken words: {spoken_words}")

        # Get current page and verse IDs
        current_page = int(req.args.get('page', 1))
        page_verse_ids = get_page_verses(current_page, quran_data)
        
        # Perform alignment using Tarteel-style engine (timed)
        alignment_start = time.time()
        logging.info(f"[{sid[:8]}] Starting alignment (mode={session_state.mode}, pos={session_state.global_word_pos})")
        
        alignment_result = alignment_engine.align_transcript(
            spoken_words=spoken_words,
            anchor_pos=session_state.global_word_pos,
            mode=session_state.mode,
            page_verse_ids=page_verse_ids
        )
        alignment_time = time.time() - alignment_start
        performance_metrics['alignment_times'].append(alignment_time)
        
        logging.info(f"[{sid[:8]}] Alignment complete: confidence={alignment_result.confidence:.2f}, "
                    f"segment_score={alignment_result.segment_score:.2f}, "
                    f"matches={len(alignment_result.matches)} (took {alignment_time:.3f}s)")

        # Warning if confidence is very low
        if alignment_result.confidence < 0.5:
            logging.warning(f"[{sid[:8]}] Low confidence detected! May indicate wrong recitation or audio issues.")
        
        # Update session state
        session_manager.update_from_alignment(
            sid=sid,
            confidence=alignment_result.confidence,
            furthest_global_index=alignment_result.furthest_global_index
        )
        
        # Additional information in log
        session_state_after = session_manager.get_session(sid)
        logging.info(f"[{sid[:8]}] Session mode: {session_state_after.mode}, "
                    f"Low confidence streak: {session_state_after.consecutive_low_confidence}")
        
        # Emit results for each aligned word
        for match in alignment_result.matches:
            if match.quran_word:
                emit('word_result', {
                    'aya_id': match.quran_word.aya_id,
                    'word_index': match.quran_word.word_index,
                    'is_correct': match.is_correct,
                    'similarity': round(match.similarity, 2),
                    'alignment_type': match.alignment_type,
                    'spoken_word': match.spoken_word,
                    'expected_word': match.quran_word.text
                })
        
        # Calculate total processing time
        total_time = time.time() - chunk_start_time
        performance_metrics['total_chunks_processed'] += 1
        
        # Emit chunk completion with progress info and timing
        emit('chunk_done', {
            'global_progress': session_state.global_word_pos,
            'confidence': round(alignment_result.confidence, 2),
            'mode': session_state.mode,
            'segment_score': round(alignment_result.segment_score, 2),
            'matches_count': len(alignment_result.matches),
            'processing_time': round(total_time, 3)
        })
        
        logging.info(f"[{sid[:8]}] Chunk processed successfully. New position: {session_state.global_word_pos}, "
                    f"Total time: {total_time:.3f}s")

    except Exception as e:
        logging.error(f"[{sid[:8]}] Error processing audio: {e}", exc_info=True)
        emit('word_result', {'error': str(e)})