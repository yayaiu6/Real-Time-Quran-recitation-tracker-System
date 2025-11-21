"""
Main entry point for Quran recitation tracker Application
"""
import sys
import os

if __name__ == '__main__':
    # Add backend to path so imports work correctly
    backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
    sys.path.insert(0, backend_path)
    
    import eventlet
    from eventlet import wsgi
    import app
    
    print("Starting Quran AI Server on http://0.0.0.0:7860")
    wsgi.server(eventlet.listen(('0.0.0.0', 7860)), app.app)

