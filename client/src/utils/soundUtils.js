/**
 * Utility functions for playing notification sounds
 */

// Default notification sound (using Web Audio API)
export const playNotificationSound = () => {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for a simple beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configure sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play sound with fade out
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    return true;
  } catch (error) {
    console.error('Error playing notification sound:', error);
    return false;
  }
};

// Alternative method using Audio element (if you have an audio file)
export const playAudioFile = (audioUrl) => {
  try {
    const audio = new Audio(audioUrl);
    audio.volume = 0.5; // 50% volume
    audio.play().catch(error => {
      console.error('Error playing audio file:', error);
    });
    return true;
  } catch (error) {
    console.error('Error setting up audio playback:', error);
    return false;
  }
};
