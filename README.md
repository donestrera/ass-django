# IoT Sensor Monitoring System

This project consists of four main components:

- A Django backend server for handling sensor data
- A React frontend client for visualization
- An Arduino component for sensor data collection
- YOLOv7 person detection for security monitoring

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm or yarn
- Arduino IDE (for sensor setup)
- MySQL Server 8.0 or higher
- PyTorch for YOLOv7 object detection

## Project Setup

### Database Setup (MySQL)

1. Install MySQL Server if not already installed:

   ```bash
   sudo apt-get update
   sudo apt-get install mysql-server
   ```

2. Start MySQL service:

   ```bash
   sudo service mysql start
   ```

3. Create the database and user:

   ```bash
   mysql -u root
   CREATE DATABASE research;
   CREATE USER 'group5'@'%' IDENTIFIED BY '@Group555';
   GRANT ALL PRIVILEGES ON research.* TO 'group5'@'%';
   FLUSH PRIVILEGES;
   exit;

   #port 3306

   ```

4. Install MySQL development files:

   ```bash
   sudo apt-get install python3-dev default-libmysqlclient-dev build-essential
   ```

5. Navigate to the server directory:

   ```bash
   cd server
   ```

6. Create a Python virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

7. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

8. Run database migrations:

   ```bash
   python manage.py migrate
   ```

9. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

The server will start at `http://localhost:8000`

### Frontend Setup (React Client)

1. Navigate to the client directory:

   ```bash
   cd client
   ```

2. Install Node.js dependencies:

   ```bash
   npm install
   # or if using yarn:
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or with yarn:
   yarn dev
   ```

The client will start at `http://localhost:5173`

### Arduino Setup

1. Open the Arduino IDE
2. Navigate to the `arduino` directory and open the project file
3. Install any required Arduino libraries
4. Upload the code to your Arduino board
5. Connect the sensors according to the pin configuration in the code

## Project Structure

```
.
├── server/             # Django backend
│   ├── sensor_api/    # Main API application
│   ├── config/        # Django settings
│   └── requirements.txt
├── client/            # React frontend
│   ├── src/          # Source code
│   └── public/       # Static assets
└── arduino/          # Arduino sensor code
└── yolov7/          # YOLOv7 tiny model
│   ├── weights.bin  # Weights for the YOLOv7 model
```

## Features

- Real-time sensor data monitoring
- Interactive data visualization
- RESTful API for sensor data
- Material-UI based responsive interface
- Chart.js integration for data graphs
- MySQL database for robust data storage
- YOLOv7 object detection for person detection
- Automatic image capture and logging when people are detected
- Real-time notifications for security events

## Person Detection Setup

The project includes YOLOv7 person detection capabilities:

1. Navigate to the yolov7 directory:

   ```bash
   cd yolov7
   ```

2. Install the required dependencies:

   ```bash
   chmod +x install_yolo_deps.sh
   ./install_yolo_deps.sh
   ```

3. Configure detection settings in `server/.env`:

   ```
   # Enable background mode (direct camera capture)
   YOLO_BACKGROUND_MODE=1
   
   # Enable automatic image capturing
   AUTO_CAPTURE=1
   
   # Capture images when a person is detected
   CAPTURE_ON_DETECTION=1
   
   # Save detection images with bounding boxes
   SAVE_DETECTION_IMAGES=1
   ```

4. For more details about the YOLOv7 detection feature, see [YOLOv7 README](yolov7/README.md)

## Development

- Backend API: `http://localhost:8000/api/`
- Frontend development server: `http://localhost:5173`
- API documentation: `http://localhost:8000/api/docs/`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
