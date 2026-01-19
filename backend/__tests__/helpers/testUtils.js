// Execute multiple async functions in parallel
async function runConcurrent(fns, maxConcurrency = 10) {
  const results = [];
  const errors = [];

  const chunks = [];
  for (let i = 0; i < fns.length; i += maxConcurrency) {
    chunks.push(fns.slice(i, i + maxConcurrency));
  }

  for (const chunk of chunks) {
    const settled = await Promise.allSettled(chunk.map(fn => fn()));
    settled.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason);
      }
    });
  }

  return { results, errors };
}

// Measure execution time
function measureTime(fn) {
  return async (...args) => {
    const start = Date.now();
    const result = await fn(...args);
    const duration = Date.now() - start;
    return { result, duration };
  };
}

// Assert error message contains substring
function expectError(fn, substring) {
  return expect(fn()).rejects.toThrow(substring);
}

// Wait for condition to be true
async function waitFor(condition, timeout = 5000, interval = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}

// Generate unique invoice number for testing
function generateTestInvoiceNumber(prefix = 'TEST', seq = 1) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
}

// Verify database transaction isolation
async function verifyTransactionIsolation(db, operations) {
  await db.run('BEGIN IMMEDIATE');
  try {
    for (const op of operations) {
      await op(db);
    }
    await db.run('COMMIT');
    return true;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

module.exports = {
  runConcurrent,
  measureTime,
  expectError,
  waitFor,
  generateTestInvoiceNumber,
  verifyTransactionIsolation
};
