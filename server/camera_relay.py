#!/usr/bin/env python3
"""
Camera Relay Server for macOS with Apple Silicon

This script creates a WebSocket server that relays camera frames from a local client
to any connected remote clients, allowing camera access through Nginx/HTTPS.
"""

import asyncio
import websockets
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('camera_relay.log')
    ]
)
logger = logging.getLogger('camera_relay')

# Store connected clients
connected_clients = set()
# Store the most recent frame for new clients
latest_frame = None
# Flag to indicate if a producer (local camera source) is connected
producer_connected = False
# Store detection results
latest_detection = None

async def handle_connection(websocket, path):
    """Handle a new WebSocket connection"""
    global latest_frame, producer_connected, latest_detection
    
    # Get client info
    client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    is_localhost = websocket.remote_address[0] in ['127.0.0.1', 'localhost', '::1']
    
    # Determine if this is a producer (localhost) or consumer connection
    try:
        message = await websocket.recv()
        data = json.loads(message)
        
        client_type = data.get('type', 'consumer')
        is_producer = client_type == 'producer' and is_localhost
        
        if is_producer:
            logger.info(f"Producer connected from {client_info}")
            if producer_connected:
                logger.warning("Another producer is already connected. Rejecting connection.")
                await websocket.send(json.dumps({"status": "error", "message": "Another producer is already connected"}))
                return
            producer_connected = True
            await websocket.send(json.dumps({"status": "connected", "message": "Producer connected successfully"}))
        else:
            logger.info(f"Consumer connected from {client_info}")
            await websocket.send(json.dumps({"status": "connected", "message": "Consumer connected successfully"}))
            # Send the latest frame to the new consumer if available
            if latest_frame:
                await websocket.send(latest_frame)
            # Send the latest detection data if available
            if latest_detection:
                await websocket.send(json.dumps({
                    "type": "detection",
                    "data": latest_detection
                }))
        
        # Add to connected clients
        connected_clients.add(websocket)
        
        try:
            # Main message handling loop
            async for message in websocket:
                if is_producer:
                    try:
                        # Check if this is a detection message or a frame
                        if message.startswith(b'{'):
                            # This is likely a JSON message
                            try:
                                data = json.loads(message)
                                if data.get('type') == 'detection':
                                    # Store the latest detection data
                                    latest_detection = data.get('data')
                                    # Broadcast detection data to all consumers
                                    broadcast_tasks = []
                                    for client in connected_clients:
                                        if client != websocket:  # Don't send back to producer
                                            broadcast_tasks.append(asyncio.create_task(
                                                client.send(message)
                                            ))
                                    if broadcast_tasks:
                                        await asyncio.gather(*broadcast_tasks, return_exceptions=True)
                                    continue
                            except json.JSONDecodeError:
                                # Not a JSON message, treat as binary frame
                                pass
                        
                        # If we get here, treat as a binary frame
                        latest_frame = message
                        broadcast_tasks = []
                        for client in connected_clients:
                            if client != websocket:  # Don't send back to producer
                                broadcast_tasks.append(asyncio.create_task(
                                    client.send(message)
                                ))
                        if broadcast_tasks:
                            await asyncio.gather(*broadcast_tasks, return_exceptions=True)
                    except Exception as e:
                        logger.error(f"Error processing producer message: {e}")
                else:
                    # If this is a consumer, handle any control messages
                    try:
                        data = json.loads(message)
                        logger.debug(f"Received control message from consumer: {data}")
                    except json.JSONDecodeError:
                        logger.warning(f"Received invalid JSON from consumer: {message[:100]}...")
        finally:
            # Clean up on disconnect
            connected_clients.remove(websocket)
            if is_producer:
                producer_connected = False
                logger.info(f"Producer disconnected from {client_info}")
            else:
                logger.info(f"Consumer disconnected from {client_info}")
    
    except Exception as e:
        logger.error(f"Error handling connection: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if websocket in connected_clients:
            connected_clients.remove(websocket)

async def health_check():
    """Periodic health check to log server status"""
    while True:
        logger.info(f"Health check: {len(connected_clients)} clients connected, producer: {producer_connected}")
        await asyncio.sleep(60)  # Check every minute

async def main():
    """Start the WebSocket server"""
    # Get port from environment or use default
    port = int(os.environ.get('CAMERA_RELAY_PORT', 8765))
    
    # Create the server
    logger.info(f"Starting camera relay server on port {port}")
    stop = asyncio.Future()
    
    # Handle graceful shutdown
    def handle_signal(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        stop.set_result(None)
    
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    # Start health check task
    health_check_task = asyncio.create_task(health_check())
    
    # Retry logic for server startup
    max_retries = 5
    retry_count = 0
    retry_delay = 2  # seconds
    
    while retry_count < max_retries:
        try:
            server = await websockets.serve(handle_connection, "0.0.0.0", port)
            logger.info(f"Camera relay server is running at ws://0.0.0.0:{port}")
            
            # Wait for stop signal
            await stop
            
            # Clean up
            logger.info("Server is shutting down")
            server.close()
            await server.wait_closed()
            health_check_task.cancel()
            try:
                await health_check_task
            except asyncio.CancelledError:
                pass
            break
            
        except OSError as e:
            retry_count += 1
            logger.error(f"Failed to start server (attempt {retry_count}/{max_retries}): {e}")
            if retry_count < max_retries:
                logger.info(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("Maximum retries reached. Could not start server.")
                raise

if __name__ == "__main__":
    try:
        # Set a higher priority for this process if possible
        try:
            import os
            os.nice(-10)  # Try to increase process priority
            logger.info("Process priority increased")
        except (OSError, AttributeError):
            logger.warning("Could not increase process priority")
            
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1) 