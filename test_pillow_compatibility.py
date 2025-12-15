#!/usr/bin/env python3
"""
Test script to verify Pillow compatibility with Python 3.13
"""
import sys
import subprocess

def test_pillow_installation():
    print(f"Python version: {sys.version}")
    print("Testing Pillow installation...")
    
    try:
        # Test installing Pillow with the updated requirements
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "Pillow>=10.4.0"
        ], capture_output=True, text=True, check=True)
        
        print("✅ Pillow installation successful!")
        
        # Test importing Pillow
        try:
            import PIL
            print(f"✅ Pillow import successful! Version: {PIL.__version__}")
            return True
        except ImportError as e:
            print(f"❌ Pillow import failed: {e}")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Pillow installation failed: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False

if __name__ == "__main__":
    success = test_pillow_installation()
    if success:
        print("\n🎉 Pillow compatibility test PASSED!")
        print("The deployment should now work with Python 3.13")
    else:
        print("\n💥 Pillow compatibility test FAILED!")
        print("There may be additional issues that need to be addressed")
