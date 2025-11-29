// gif.worker.js from https://github.com/jnordberg/gif.js
// Simplified version for static hosting

self.onmessage = function(event) {
  var data = event.data;
  var response = doWork(data);
  self.postMessage(response);
};

function doWork(data) {
  // Placeholder for GIF encoding work
  // In real implementation, this would handle frame encoding
  return { type: 'frame', index: data.index };
}