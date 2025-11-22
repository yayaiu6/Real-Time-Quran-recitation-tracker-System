import tempfile
from pathlib import Path
from typing import List, Union, cast

import gradio as gr
import librosa
import soundfile as sf
import torch
import nemo.collections.asr as nemo_asr

BASE_PATH = Path(__file__).parent
MODEL_PATH = BASE_PATH / "conformer_ctc_small_60e_adamw_30wtr_32wv_40wte.nemo"

def load_asr_model(model_path: Path) -> nemo_asr.models.EncDecCTCModelBPE:
    """Load the NeMo ASR model and move it to CUDA if available."""
    # Use cast to help Pylance understand the type
    model = cast(
        nemo_asr.models.EncDecCTCModelBPE,
        nemo_asr.models.EncDecCTCModelBPE.restore_from(restore_path=str(model_path))
    )
    
    # Move model to CUDA if available
    if torch.cuda.is_available():
        model = model.to(torch.device("cuda"))
        print("Model loaded on CUDA")
    else:
        print("Warning: CUDA is not available. Running on CPU.")
    
    model.eval()
    return model

# Load model once at startup
ARABIC_ASR = load_asr_model(MODEL_PATH)

def convert_wav_to_16k(input_wav_path: str, sr: int = 16000) -> str:
    """Resample the input WAV file to 16 kHz and store it in a temp file."""
    audio, sample_rate = librosa.load(input_wav_path, sr=sr)
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
        sf.write(tmp_file.name, audio, sample_rate)
        print(f'"{input_wav_path}" has been converted to {sample_rate}Hz')
        return tmp_file.name

def predict(uploaded_wav: str) -> str:
    """Run inference on the uploaded audio file."""
    if uploaded_wav is None:
        return "Please upload an audio file"
    
    # Convert audio to 16kHz
    processed_path = convert_wav_to_16k(uploaded_wav)
    
    # Run inference with no_grad for efficiency
    with torch.no_grad():
        # Try both parameter names for compatibility
        try:
            predictions = ARABIC_ASR.transcribe(paths2audio_files=[processed_path])
        except TypeError:
            # Fallback for newer NeMo versions
            predictions = ARABIC_ASR.transcribe(audio=[processed_path])
    
    # Extract text from Hypothesis object
    if predictions and len(predictions) > 0:
        # Check if it's a Hypothesis object with .text attribute
        first_pred = predictions[0]
        if hasattr(first_pred, 'text'):
            return first_pred.text
        elif isinstance(first_pred, str):
            return first_pred
        else:
            return str(first_pred)
    
    return "No transcription available"

# Create Gradio interface
demo = gr.Interface(
    fn=predict,
    inputs=gr.Audio(
        type="filepath",
        label="Audio file",
        max_length=10,
        show_download_button=False,
        interactive=True,
    ),
    outputs=gr.Textbox(label="Transcription"),
    title="Arabic ASR with NeMo",
    description="Upload an audio file (max 10 seconds) to transcribe Arabic speech",
)

if __name__ == "__main__":
    demo.launch(debug=True, share=True)