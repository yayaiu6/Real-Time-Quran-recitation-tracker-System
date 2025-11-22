"""
Session State Manager for Quran Recitation Tracking
Maintains per-user session state for alignment continuity
"""

from typing import Dict, Any, List
from dataclasses import dataclass, asdict, field
import io


@dataclass
class SessionState:
    """State for a single recitation session"""
    global_word_pos: int = 0
    last_confidence: float = 0.0
    mode: str = "tracking"  # "tracking" or "search"
    consecutive_low_confidence: int = 0
    webm_header: bytes = None  # pyright: ignore[reportAssignmentType] # WebM container header for chunks
    
    # Audio buffer for cumulative transcription (sliding window)
    audio_buffer_wav: List[bytes] = field(default_factory=list)  # List of WAV chunks
    audio_buffer_duration: float = 0.0  # Total duration in seconds
    max_buffer_duration: float = 8.0  # Maximum buffer duration (8 seconds)


class SessionManager:
    """Manages session states for all connected users"""
    
    def __init__(self, confidence_threshold: float = 0.4, max_low_confidence: int = 3, audio_buffer_max_duration: float = 8.0):
        self.sessions: Dict[str, SessionState] = {}
        self.confidence_threshold = confidence_threshold
        self.max_low_confidence = max_low_confidence
        self.audio_buffer_max_duration = audio_buffer_max_duration
    
    def create_session(self, sid: str) -> SessionState:
        """Create a new session"""
        state = SessionState()
        state.max_buffer_duration = self.audio_buffer_max_duration
        self.sessions[sid] = state
        return state
    
    def get_session(self, sid: str) -> SessionState:
        """Get session state, creating if not exists"""
        if sid not in self.sessions:
            return self.create_session(sid)
        return self.sessions[sid]
    
    def delete_session(self, sid: str):
        """Delete a session"""
        if sid in self.sessions:
            del self.sessions[sid]
    
    def update_from_alignment(self, sid: str, confidence: float, furthest_global_index: int):
        """Update session state based on alignment result"""
        state = self.get_session(sid)
        
        # Update position (only move forward)
        state.global_word_pos = max(state.global_word_pos, furthest_global_index)
        
        # Update confidence
        state.last_confidence = confidence
        
        # Track consecutive low confidence
        if confidence < self.confidence_threshold:
            state.consecutive_low_confidence += 1
        else:
            state.consecutive_low_confidence = 0
        
        # Switch to search mode if confidence is consistently low
        if state.consecutive_low_confidence >= self.max_low_confidence:
            state.mode = "search"
        else:
            state.mode = "tracking"
    
    def add_audio_to_buffer(self, sid: str, wav_bytes: bytes, duration: float):
        """
        Add audio chunk to session buffer (sliding window approach)
        
        Args:
            sid: Session ID
            wav_bytes: WAV audio data
            duration: Duration of this chunk in seconds
        """
        state = self.get_session(sid)
        
        # Add new chunk
        state.audio_buffer_wav.append(wav_bytes)
        state.audio_buffer_duration += duration
        
        # Trim old chunks if buffer exceeds max duration
        while (state.audio_buffer_duration > state.max_buffer_duration and 
               len(state.audio_buffer_wav) > 1):
            # Remove oldest chunk (estimate ~2 seconds per chunk)
            removed_chunk = state.audio_buffer_wav.pop(0)
            # Estimate duration of removed chunk (rough approximation)
            estimated_duration = 2.0  # Most chunks are ~2 seconds
            state.audio_buffer_duration -= estimated_duration
    
    def get_cumulative_audio(self, sid: str) -> bytes:
        """
        Get cumulative audio buffer as single WAV file
        
        Returns:
            Combined WAV audio data from all buffered chunks
        """
        state = self.get_session(sid)
        
        if not state.audio_buffer_wav:
            return b''
        
        # If only one chunk, return it directly
        if len(state.audio_buffer_wav) == 1:
            return state.audio_buffer_wav[0]
        
        # Combine multiple WAV chunks
        # Note: This is a simple concatenation approach
        # For proper WAV merging, we'd need to parse headers and combine data sections
        # For now, we'll use the first chunk's header and append the rest
        combined = io.BytesIO()
        
        # Write first chunk completely (includes WAV header)
        combined.write(state.audio_buffer_wav[0])
        
        # For subsequent chunks, skip WAV header (first 44 bytes) and append only audio data
        for chunk in state.audio_buffer_wav[1:]:
            if len(chunk) > 44:
                combined.write(chunk[44:])  # Skip WAV header
        
        return combined.getvalue()
    
    def clear_audio_buffer(self, sid: str):
        """Clear audio buffer for a session"""
        state = self.get_session(sid)
        state.audio_buffer_wav.clear()
        state.audio_buffer_duration = 0.0
    
    def reset_session_progress(self, sid: str):
        """Reset progress (e.g., when user changes page)"""
        state = self.get_session(sid)
        state.global_word_pos = 0
        state.last_confidence = 0.0
        state.mode = "tracking"
        state.consecutive_low_confidence = 0
        state.webm_header = None # type: ignore
        # Clear audio buffer on reset
        self.clear_audio_buffer(sid)
    
    def get_session_info(self, sid: str) -> Dict[str, Any]:
        """Get session info as dict for debugging/monitoring"""
        state = self.get_session(sid)
        return asdict(state)
    
    def has_session(self, sid: str) -> bool:
        """Check if session exists"""
        return sid in self.sessions

