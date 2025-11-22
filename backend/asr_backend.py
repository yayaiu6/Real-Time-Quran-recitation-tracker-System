"""
ASR Backend Layer - Unified interface for speech-to-text transcription
Supports both Groq Whisper (cloud) and NVIDIA NeMo (local) backends
"""

import io
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional, cast

import config as app_config

# Global variables for lazy loading
_asr_backend: Optional[str] = None
_groq_client = None
_nemo_model = None


def _get_asr_backend() -> str:
    """Get ASR backend from environment or config"""
    global _asr_backend
    if _asr_backend is None:
        # Allow environment variable to override config
        _asr_backend = os.getenv("ASR_BACKEND", app_config.ASR_BACKEND).lower()
        if _asr_backend not in ["whisper", "nemo"]:
            logging.warning(f"Invalid ASR_BACKEND '{_asr_backend}', defaulting to 'whisper'")
            _asr_backend = "whisper"
        logging.info(f"ASR Backend selected: {_asr_backend}")
    return _asr_backend


# ==============================================================================
# Groq Whisper Backend (Cloud API)
# ==============================================================================

def _get_groq_client():
    """Get or create Groq client (lazy initialization)"""
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("Missing Groq API key. Set GROQ_API_KEY in your environment or .env file.")
        _groq_client = Groq(api_key=api_key)
        logging.info("Groq Whisper client initialized")
    return _groq_client


def whisper_transcribe_wav_bytes(wav_bytes: bytes) -> str:
    """
    Transcribe audio using Groq Whisper API
    
    Args:
        wav_bytes: WAV audio data as bytes (16kHz mono recommended)
    
    Returns:
        Transcribed text in Arabic
    """
    try:
        client = _get_groq_client()
        wav_buffer = io.BytesIO(wav_bytes)
        
        transcription = client.audio.transcriptions.create(
            file=("audio.wav", wav_buffer),
            model="whisper-large-v3-turbo",
            language="ar"
        ).text
        
        return transcription
    except Exception as e:
        logging.error(f"Groq Whisper transcription error: {e}")
        raise


# ==============================================================================
# NVIDIA NeMo Backend (Local GPU/CPU)
# ==============================================================================

def _load_nemo_model():
    """Load NeMo ASR model (lazy initialization)"""
    global _nemo_model
    if _nemo_model is None:
        try:
            import torch
            import nemo.collections.asr as nemo_asr
            
            model_path = Path(app_config.NEMO_MODEL_PATH)
            if not model_path.exists():
                raise FileNotFoundError(
                    f"NeMo model not found at: {model_path}\n"
                    f"Please ensure the model file exists or update NEMO_MODEL_PATH in config.py"
                )
            
            logging.info(f"Loading NeMo model from: {model_path}")
            
            # Load model
            _nemo_model = cast(
                nemo_asr.models.EncDecCTCModelBPE,
                nemo_asr.models.EncDecCTCModelBPE.restore_from(restore_path=str(model_path))
            )
            
            # Move to CUDA if available
            if torch.cuda.is_available():
                device = torch.device("cuda")
                _nemo_model = _nemo_model.to(device)
                logging.info("NeMo model loaded on CUDA (GPU)")
            else:
                logging.warning(
                    "CUDA is not available. NeMo model running on CPU. "
                    "Performance will be significantly slower. "
                    "Consider using ASR_BACKEND='whisper' for better latency."
                )
            
            _nemo_model.eval()
            logging.info("NeMo model ready for inference")
            
        except ImportError as e:
            logging.error(
                f"Failed to import NeMo dependencies: {e}\n"
                f"Please install: pip install nemo-toolkit[asr] torch"
            )
            raise
        except Exception as e:
            logging.error(f"Failed to load NeMo model: {e}")
            raise
    
    return _nemo_model


def _convert_wav_to_16k(wav_bytes: bytes, sr: int = 16000) -> str:
    """
    Resample WAV audio to 16kHz mono and save to temporary file
    
    Args:
        wav_bytes: Input WAV audio data
        sr: Target sample rate (default 16000Hz)
    
    Returns:
        Path to temporary WAV file at 16kHz
    """
    try:
        import librosa
        import soundfile as sf
        
        # Load audio from bytes
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_input:
            tmp_input.write(wav_bytes)
            tmp_input_path = tmp_input.name
        
        # Resample to target sample rate
        audio, sample_rate = librosa.load(tmp_input_path, sr=sr)
        
        # Write to new temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_output:
            sf.write(tmp_output.name, audio, sample_rate)
            output_path = tmp_output.name
        
        # Clean up input temp file
        try:
            os.unlink(tmp_input_path)
        except:
            pass
        
        return output_path
        
    except ImportError as e:
        logging.error(
            f"Failed to import audio processing dependencies: {e}\n"
            f"Please install: pip install librosa soundfile"
        )
        raise
    except Exception as e:
        logging.error(f"Audio resampling error: {e}")
        raise


def nemo_transcribe_wav_bytes(wav_bytes: bytes) -> str:
    """
    Transcribe audio using local NeMo ASR model
    
    Args:
        wav_bytes: WAV audio data as bytes
    
    Returns:
        Transcribed text in Arabic
    """
    import torch
    
    temp_path = None
    try:
        model = _load_nemo_model()
        
        # Convert to 16kHz if needed
        temp_path = _convert_wav_to_16k(wav_bytes, sr=16000)
        
        # Run inference with no_grad for efficiency
        with torch.no_grad():
            try:
                # Try both parameter names for compatibility with different NeMo versions
                predictions = model.transcribe(paths2audio_files=[temp_path]) # pyright: ignore[reportCallIssue]
            except TypeError:
                predictions = model.transcribe(audio=[temp_path])
        
        # Extract text from result
        if predictions and len(predictions) > 0:
            first_pred = predictions[0]
            if hasattr(first_pred, 'text'):
                transcription = first_pred.text # type: ignore
            elif isinstance(first_pred, str):
                transcription = first_pred
            else:
                transcription = str(first_pred)
        else:
            transcription = ""
        
        return transcription # type: ignore
        
    except Exception as e:
        logging.error(f"NeMo transcription error: {e}")
        raise
    finally:
        # Clean up temporary file
        if temp_path:
            try:
                os.unlink(temp_path)
            except:
                pass


# ==============================================================================
# Unified Interface
# ==============================================================================

def initialize_backend():
    """
    Initialize the configured ASR backend at application startup
    
    This loads models and prepares the backend for immediate use,
    avoiding delays on first transcription request.
    
    Raises:
        RuntimeError: If backend initialization fails
    """
    backend = _get_asr_backend()
    
    logging.info(f"Deploying ASR backend: {backend}")
    
    if backend == "whisper":
        # Test Groq client initialization
        try:
            _get_groq_client()
            logging.info("Groq Whisper client initialized and ready")
        except Exception as e:
            logging.error(f"Failed to initialize Groq Whisper: {e}")
            raise
    
    elif backend == "nemo":
        # Load NeMo model (this can take 10-30 seconds)
        try:
            import torch
            logging.info("Loading NeMo model... (this may take 10-30 seconds)")
            model = _load_nemo_model()
            
            # Log device info
            if torch.cuda.is_available():
                logging.info(f"NeMo model deployed on GPU: {torch.cuda.get_device_name(0)}")
            else:
                logging.warning("NeMo model deployed on CPU - performance will be slow")
            
            logging.info("NeMo model loaded and ready for inference")
        except Exception as e:
            logging.error(f"Failed to initialize NeMo: {e}")
            raise
    
    else:
        raise RuntimeError(f"Unknown ASR backend: {backend}")


def transcribe_audio(wav_bytes: bytes) -> str:
    """
    Transcribe audio using the configured ASR backend
    
    This is the main entry point for audio transcription.
    Backend is selected based on ASR_BACKEND config/environment variable.
    
    Args:
        wav_bytes: WAV audio data as bytes (16kHz mono recommended)
    
    Returns:
        Transcribed text in Arabic
    
    Raises:
        RuntimeError: If backend is not properly configured
        Exception: Various exceptions from underlying ASR systems
    """
    backend = _get_asr_backend()
    
    if backend == "whisper":
        return whisper_transcribe_wav_bytes(wav_bytes)
    elif backend == "nemo":
        return nemo_transcribe_wav_bytes(wav_bytes)
    else:
        raise RuntimeError(f"Unknown ASR backend: {backend}")


def get_backend_info() -> dict:
    """
    Get information about the current ASR backend
    
    Returns:
        Dictionary with backend name and status
    """
    backend = _get_asr_backend()
    info = {
        "backend": backend,
        "initialized": False
    }
    
    if backend == "whisper":
        info["initialized"] = _groq_client is not None
        info["type"] = "cloud"
    elif backend == "nemo":
        info["initialized"] = _nemo_model is not None
        info["type"] = "local"
        if _nemo_model is not None:
            import torch
            info["device"] = "cuda" if torch.cuda.is_available() else "cpu"
    
    return info

