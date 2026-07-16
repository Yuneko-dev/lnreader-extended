const { rm } = require('node:fs/promises');
const path = require('node:path');

module.exports = function () {
  if (process.platform !== 'win32') {
    return Promise.resolve();
  }

  const testDatabaseDirectory = path.resolve(__dirname, '..', 'test_db');

  return rm(testDatabaseDirectory, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
};
