"""
Convert YOLOv7 PyTorch model to TensorFlow.js format

This script converts a YOLOv7 PyTorch model to TensorFlow.js format.
It requires the following packages:
- torch
- tensorflow
- tensorflowjs

Usage:
python convert_yolo_to_tfjs.py --weights yolov7-tiny.pt --output ../client/public/models/yolov7-tiny
"""

import argparse
import os
import sys
import torch
import tensorflow as tf
import tensorflowjs as tfjs

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', type=str, default='yolov7-tiny.pt', help='PyTorch model weights')
    parser.add_argument('--output', type=str, default='../client/public/models/yolov7-tiny', help='Output directory')
    parser.add_argument('--img-size', nargs='+', type=int, default=[416, 416], help='Image size for model input')
    return parser.parse_args()

def main():
    args = parse_args()
    
    print(f"Converting {args.weights} to TensorFlow.js format...")
    
    # Check if weights file exists
    if not os.path.isfile(args.weights):
        print(f"Error: Weights file {args.weights} not found.")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output, exist_ok=True)
    
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
    
    # Convert to ONNX format first (intermediate step)
    onnx_path = os.path.join(args.output, 'model.onnx')
    print(f"Converting to ONNX format: {onnx_path}")
    
    try:
        # Create dummy input
        dummy_input = torch.zeros((1, 3, args.img_size[0], args.img_size[1]))
        
        # Export to ONNX
        torch.onnx.export(
            model,
            dummy_input,
            onnx_path,
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
    except Exception as e:
        print(f"Error converting to ONNX: {e}")
        sys.exit(1)
    
    # Convert ONNX to TensorFlow SavedModel
    saved_model_path = os.path.join(args.output, 'saved_model')
    print(f"Converting ONNX to TensorFlow SavedModel: {saved_model_path}")
    
    try:
        # Use tf.keras to load the ONNX model
        # Note: This requires the onnx-tf package
        import onnx
        from onnx_tf.backend import prepare
        
        onnx_model = onnx.load(onnx_path)
        tf_rep = prepare(onnx_model)
        tf_rep.export_graph(saved_model_path)
        print("TensorFlow SavedModel conversion successful.")
    except Exception as e:
        print(f"Error converting to TensorFlow SavedModel: {e}")
        print("Make sure you have installed onnx-tf: pip install onnx-tf")
        sys.exit(1)
    
    # Convert SavedModel to TensorFlow.js format
    tfjs_path = os.path.join(args.output, 'tfjs')
    print(f"Converting TensorFlow SavedModel to TensorFlow.js: {tfjs_path}")
    
    try:
        tfjs.converters.convert_tf_saved_model(
            saved_model_path,
            tfjs_path
        )
        print("TensorFlow.js conversion successful.")
    except Exception as e:
        print(f"Error converting to TensorFlow.js: {e}")
        sys.exit(1)
    
    print(f"Conversion complete. TensorFlow.js model saved to: {tfjs_path}")
    print("You can now use this model in your web application.")
    print(f"Model URL: '/models/yolov7-tiny/tfjs/model.json'")

if __name__ == '__main__':
    main()
