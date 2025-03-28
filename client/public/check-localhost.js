// Script to check if the application is running on localhost
(function() {
  // Check if we're on localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // If not on localhost, show a banner with guidance
  if (!isLocalhost && !window.location.protocol.includes('https')) {
    // Create banner element
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.backgroundColor = '#f8d7da';
    banner.style.color = '#721c24';
    banner.style.padding = '10px';
    banner.style.textAlign = 'center';
    banner.style.zIndex = '9999';
    banner.style.fontSize = '14px';
    banner.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
    // Create banner content
    banner.innerHTML = `
      <strong>Camera access requires HTTPS or localhost!</strong> 
      <span style="margin-left: 10px;">
        <a href="http://localhost:5173${window.location.pathname}" style="color: #0056b3; text-decoration: underline;">
          Switch to localhost
        </a> 
        or 
        <a href="/https-setup-instructions.html" target="_blank" style="color: #0056b3; text-decoration: underline;">
          Set up HTTPS
        </a>
      </span>
      <button style="margin-left: 15px; background: none; border: none; cursor: pointer; font-size: 16px;" onclick="this.parentNode.remove()">×</button>
    `;
    
    // Add banner to the page
    document.body.appendChild(banner);
    
    // Adjust body padding to account for banner
    const originalBodyPadding = window.getComputedStyle(document.body).paddingTop;
    document.body.style.paddingTop = `calc(${originalBodyPadding} + ${banner.offsetHeight}px)`;
  }
})(); 