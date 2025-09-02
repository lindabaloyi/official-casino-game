import fs from 'fs';
import path from 'path';

const logFilePath = path.join(__dirname, 'game.log');

// Function to log messages to the console and store them
function log(...args) {
  const message = args.map(arg => JSON.stringify(arg)).join(' ');
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;

  // Log to console
  console.log(logMessage);

  // Append log message to file
  fs.appendFile(logFilePath, logMessage + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });

  // Append log message to file
  fs.appendFile(logFilePath, logMessage + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });

  // Append log message to file
  fs.appendFile(logFilePath, logMessage + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });

  // Store log message
  logs.push(logMessage);
}

// Function to download logs as a file
function downloadLogs() {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return;
    }

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
  a.download = 'game.log';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  });
}

// Export the log function
module.exports = { log, downloadLogs };