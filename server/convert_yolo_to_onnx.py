"""
Convert YOLOv7 PyTorch model to ONNX format

This script converts a YOLOv7 PyTorch model to ONNX format for web use.
It requires the following packages:
- torch
- onnx

Usage:
python convert_yolo_to_onnx.py --weights yolov7-tiny.pt --output ../client/public/models/yolov7-tiny/model.onnx
"""

import argparse
import os
import sys
import torch

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', type=str, default='yolov7-tiny.pt', help='PyTorch model weights')
    parser.add_argument('--output', type=str, default='../client/public/models/yolov7-tiny/model.onnx', help='Output ONNX file')
    parser.add_argument('--img-size', nargs='+', type=int, default=[416, 416], help='Image size for model input')
    return parser.parse_args()

def main():
    args = parse_args()
    
    print(f"Converting {args.weights} to ONNX format...")
    
    # Check if weights file exists
    if not os.path.isfile(args.weights):
        print(f"Error: Weights file {args.weights} not found.")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    # Load PyTorch model
    print("Loading PyTorch model...")
    try:
        model = torch.load(args.weights, map_location=torch.device('cpu'))
        if 'model' in model:
            model = model['model']
        print("PyTorch model loaded successfully.")
    except Exception as e:
        print(f"Error loading PyTorch model: {e}")
        sys.exit(1)
    
    # Convert to ONNX format
    print(f"Converting to ONNX format: {args.output}")
    
    try:
        # Create dummy input
        dummy_input = torch.zeros((1, 3, args.img_size[0], args.img_size[1]))
        
        # Export to ONNX
        torch.onnx.export(
            model,
            dummy_input,
            args.output,
            verbose=False,
            opset_version=12,
            input_names=['images'],
            output_names=['output'],
            dynamic_axes={
                'images': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        )
        print("ONNX conversion successful.")
        print(f"Model saved to: {args.output}")
        print("You can now use this model in your web application with ONNX.js")
    except Exception as e:
        print(f"Error converting to ONNX: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
