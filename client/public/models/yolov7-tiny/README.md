# YOLOv7 Tiny Model for TensorFlow.js

This directory contains the YOLOv7 tiny model converted to TensorFlow.js format for use in web applications.

## Model Structure

The model is stored in the `tfjs` subdirectory with the following structure:
- `model.json` - The model architecture and weights manifest
- `*.bin` files - The model weights

## How to Convert the Model

1. Install the required packages:
```bash
pip install torch tensorflow tensorflowjs onnx onnx-tf
```

2. Run the conversion script:
```bash
cd server
python convert_yolo_to_tfjs.py --weights yolov7-tiny.pt --output ../client/public/models/yolov7-tiny
```

3. The converted model will be saved in the `tfjs` subdirectory.

## Usage in JavaScript

```javascript
import * as tf from '@tensorflow/tfjs';

// Load the model
const model = await tf.loadGraphModel('/models/yolov7-tiny/tfjs/model.json');

// Preprocess input
const img = tf.browser.fromPixels(imageElement);
const resized = tf.image.resizeBilinear(img, [416, 416]);
const normalized = resized.div(255);
const batched = normalized.expandDims(0);

// Run inference
const predictions = await model.predict(batched);

// Process predictions
// ...

// Clean up tensors
img.dispose();
resized.dispose();
normalized.dispose();
batched.dispose();
predictions.dispose();
```

## Model Information

- Input shape: [1, 416, 416, 3]
- Input format: RGB images normalized to [0, 1]
- Output: Detection boxes, scores, and class probabilities

## Credits

- YOLOv7: https://github.com/WongKinYiu/yolov7
