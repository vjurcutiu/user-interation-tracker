// Track the current URL and initialize interaction logging
let currentUrl = window.location.href;

// Utility: Build interaction data
function buildInteractionData(event) {
  const interactionData = {
    type: event.type,
    target: event.target.tagName,
    id: event.target.id || null,
    classes: event.target.className || null,
    timestamp: new Date().toISOString(),
    url: currentUrl,
  };

  // Add mouse coordinates for click events
  if (event.type === 'click') {
    interactionData.mouseCoordinates = {
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
    };
  }

  return interactionData;
}

// Safely send a message to the background script
function safeSendMessage(message) {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    console.error('Extension context is unavailable. Cannot send message.');
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to send message:', chrome.runtime.lastError.message);
      } else if (response?.status !== 'success') {
        console.warn('Unexpected response:', response);
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Event handler for user interactions
function handleUserInteraction(event) {
  const interactionData = buildInteractionData(event);
  safeSendMessage({ interactionData });
}

// Monitor URL changes for SPAs
function monitorUrlChanges() {
  const observer = new MutationObserver(() => {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      console.log(`URL changed: ${currentUrl} -> ${newUrl}`);
      currentUrl = newUrl; // Update current URL
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Attach listeners for user interactions
function attachListeners() {
  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('input', debounce(handleUserInteraction, 300)); // Debounced for performance
  document.addEventListener('scroll', debounce(handleUserInteraction, 500)); // Debounced for performance
  document.addEventListener('keydown', handleUserInteraction);
}

// Detach listeners when cleaning up
function detachListeners() {
  document.removeEventListener('click', handleUserInteraction);
  document.removeEventListener('input', handleUserInteraction);
  document.removeEventListener('scroll', handleUserInteraction);
  document.removeEventListener('keydown', handleUserInteraction);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  console.log('Page is unloading. Cleaning up...');
  detachListeners();
});

// Initialize the content script
function initialize() {
  console.log('Initializing content script...');

  // Check if chrome.runtime is available
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('Extension context is unavailable. Aborting initialization.');
    return;
  }

  currentUrl = window.location.href;
  attachListeners();
  monitorUrlChanges();
}

// Debounce utility to limit function calls
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Start the script after DOM content is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Listen for messages from background script to start/stop recording
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "start") {
    console.log("Recording started.");
    attachListeners();
    // Optionally start additional recording functionality, e.g., monitor DOM changes
  } else if (message.action === "stop") {
    console.log("Recording stopped.");
    detachListeners();
    // Optionally stop any other recording functionality
  }
});

// Throttle function to limit the rate of execution
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function handleMouseMove(event) {
  const mouseData = {
    type: 'mousemove',
    timestamp: new Date().toISOString(),
    coordinates: {
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
    },
    url: window.location.href,
  };
  safeSendMessage({ interactionData: mouseData });
}

// Attaching mousemove listener with throttling (e.g., every 200ms)
document.addEventListener('mousemove', throttle(handleMouseMove, 200));

function handleContextMenu(event) {
  // Build a data object for the context menu interaction
  const interactionData = {
    type: 'contextmenu',
    target: event.target.tagName,
    id: event.target.id || null,
    classes: event.target.className || null,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    mouseCoordinates: {
      clientX: event.clientX,
      clientY: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
    }
  };

  // Send the interaction data via your existing messaging function
  safeSendMessage({ interactionData });
}

// Attach the context menu listener to the document
document.addEventListener('contextmenu', handleContextMenu);
