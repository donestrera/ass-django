#!/usr/bin/env python3
"""
YOLOv7 Setup Script

This script installs the required dependencies for YOLOv7 detection,
downloads the model weights if needed, and tests if the setup was successful.
"""

import os
import sys
import subprocess
import time
import importlib.util

def print_status(message, success=None):
    """Print a formatted status message"""
    if success is None:
        print(f"[*] {message}")
    elif success:
        print(f"[✓] {message}")
    else:
        print(f"[✗] {message}")

def install_package(package_name):
    """Install a Python package using pip"""
    print_status(f"Installing {package_name}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        print_status(f"Successfully installed {package_name}", True)
        return True
    except subprocess.CalledProcessError:
        print_status(f"Failed to install {package_name}", False)
        return False

def install_dependencies():
    """Install all required dependencies"""
    print_status("Installing dependencies...")
    dependencies = [
        "numpy",
        "torch",
        "torchvision",
        "opencv-python",
        "pillow",
        "requests"
    ]
    
    for dep in dependencies:
        install_package(dep)

def download_model():
    """Download YOLOv7 model weights if they don't exist"""
    model_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "yolov7-tiny.pt")
    
    if os.path.exists(model_file):
        print_status(f"Model file already exists at {model_file}", True)
        return True
    
    print_status("Downloading YOLOv7 model weights...")
    try:
        # Try using requests if available
        try:
            import requests
            print_status("Downloading using requests...")
            url = "https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt"
            response = requests.get(url, stream=True)
            total_size = int(response.headers.get('content-length', 0))
            
            if response.status_code == 200:
                with open(model_file, 'wb') as f:
                    chunk_size = 1024 * 1024  # 1MB chunks
                    for i, chunk in enumerate(response.iter_content(chunk_size=chunk_size)):
                        if chunk:
                            f.write(chunk)
                            # Print progress every 5MB
                            if (i * chunk_size) % (5 * chunk_size) == 0:
                                print_status(f"Downloaded {i * chunk_size / (1024 * 1024):.1f}MB / {total_size / (1024 * 1024):.1f}MB")
                
                print_status(f"Successfully downloaded model to {model_file}", True)
                return True
        except:
            print_status("Requests download failed, trying urllib", False)
            
            # Fallback to urllib
            try:
                import urllib.request
                url = "https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt"
                print_status(f"Downloading {url}...")
                urllib.request.urlretrieve(url, model_file)
                print_status(f"Successfully downloaded model to {model_file}", True)
                return True
            except:
                print_status("urllib download failed", False)
        
        # If both methods failed, try using curl or wget as a last resort
        try:
            if sys.platform == "win32":
                curl_cmd = ["curl", "-L", "https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt", "-o", model_file]
            else:
                curl_cmd = ["curl", "-L", "https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt", "-o", model_file]
            
            print_status(f"Downloading using curl...")
            subprocess.check_call(curl_cmd)
            print_status(f"Successfully downloaded model to {model_file}", True)
            return True
        except:
            print_status("curl download failed", False)
            
            try:
                wget_cmd = ["wget", "https://github.com/WongKinYiu/yolov7/releases/download/v0.1/yolov7-tiny.pt", "-O", model_file]
                print_status(f"Downloading using wget...")
                subprocess.check_call(wget_cmd)
                print_status(f"Successfully downloaded model to {model_file}", True)
                return True
            except:
                print_status("wget download failed", False)
    
    except Exception as e:
        print_status(f"Error downloading model: {e}", False)
        return False

def test_deps():
    """Test if all dependencies are installed correctly"""
    print_status("Testing dependencies...")
    
    # Create a list of results
    results = []
    
    # Check Python version
    print(f"Python version: {sys.version}")
    
    # Test each dependency
    for package in ["torch", "torchvision", "numpy", "cv2", "PIL", "requests"]:
        try:
            spec = importlib.util.find_spec(package)
            if spec is None:
                results.append((package, False))
                print_status(f"{package} is not installed", False)
            else:
                # Import the package to check version
                if package == "cv2":
                    import cv2
                    print_status(f"OpenCV: {cv2.__version__}", True)
                    results.append(("OpenCV", True))
                elif package == "torch":
                    import torch
                    print_status(f"PyTorch: {torch.__version__}", True)
                    print_status(f"CUDA Available: {torch.cuda.is_available()}")
                    results.append(("PyTorch", True))
                elif package == "PIL":
                    from PIL import Image, __version__
                    print_status(f"Pillow: {__version__}", True)
                    results.append(("Pillow", True))
                elif package == "numpy":
                    import numpy as np
                    print_status(f"NumPy: {np.__version__}", True)
                    results.append(("NumPy", True))
                else:
                    module = importlib.import_module(package)
                    if hasattr(module, '__version__'):
                        print_status(f"{package}: {module.__version__}", True)
                    else:
                        print_status(f"{package} is installed", True)
                    results.append((package, True))
        except Exception as e:
            print_status(f"Error testing {package}: {e}", False)
            results.append((package, False))
    
    # Check if the model file exists
    model_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "yolov7-tiny.pt")
    if os.path.exists(model_file):
        print_status(f"YOLOv7 model file exists: {model_file}", True)
        results.append(("Model", True))
    else:
        print_status(f"YOLOv7 model file not found: {model_file}", False)
        results.append(("Model", False))
    
    # Summarize results
    print("\nSummary:")
    all_passed = True
    for name, success in results:
        status = "PASS" if success else "FAIL"
        print(f"  {name}: {status}")
        if not success:
            all_passed = False
    
    return all_passed

def create_env_file():
    """Create or update .env file with YOLOv7 settings"""
    server_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server")
    env_file = os.path.join(server_dir, ".env")
    
    # Default settings
    yolo_settings = {
        "YOLO_BACKGROUND_MODE": "1",
        "AUTO_CAPTURE": "1",
        "CAPTURE_ON_DETECTION": "1",
        "SAVE_DETECTION_IMAGES": "1",
        "DIRECT_CAMERA_ACCESS": "1"
    }
    
    # Read existing settings if file exists
    existing_settings = {}
    if os.path.exists(env_file):
        print_status(f"Reading existing .env file: {env_file}")
        with open(env_file, 'r') as f:
            for line in f.readlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    existing_settings[key.strip()] = value.strip()
    
    # Merge settings
    merged_settings = {**existing_settings, **yolo_settings}
    
    # Write settings to file
    print_status(f"Writing YOLO settings to .env file: {env_file}")
    with open(env_file, 'w') as f:
        for key, value in merged_settings.items():
            f.write(f"{key}={value}\n")
    
    print_status(f"Updated .env file with YOLO settings", True)

def main():
    """Main function to set up YOLOv7"""
    print("\n=== YOLOv7 Setup ===\n")
    
    # Step 1: Install dependencies
    print("\nStep 1: Installing dependencies...\n")
    install_dependencies()
    
    # Step 2: Download model
    print("\nStep 2: Setting up YOLOv7 model...\n")
    download_model()
    
    # Step 3: Configure environment
    print("\nStep 3: Configuring environment...\n")
    create_env_file()
    
    # Step 4: Test setup
    print("\nStep 4: Testing setup...\n")
    success = test_deps()
    
    # Final message
    print("\n=== Setup Complete ===\n")
    if success:
        print_status("YOLOv7 setup completed successfully!", True)
        print("\nYou can now run the camera relay server with YOLOv7 detection:")
        print("  cd ../server")
        print("  python camera_relay.py")
    else:
        print_status("YOLOv7 setup completed with some issues.", False)
        print("\nPlease resolve the issues above before running the detector.")
        print("You may need to manually install missing dependencies:")
        print("  pip install torch torchvision numpy opencv-python pillow requests")

if __name__ == "__main__":
    main()