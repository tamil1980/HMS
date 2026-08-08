const prisma = require('../db/prisma');

const pad = (n, len) => String(n).padStart(len, '0');

// Generates sequential business IDs (e.g. PAT00001) using a Counter table so the
// numbers survive deletes and are unique under concurrency.
async function nextId(prefix, len = 5) {
  return prisma.$transaction(async (tx) => {
    const counter = await tx.counter.upsert({
      where: { key: prefix },
      update: { value: { increment: 1 } },
      create: { key: prefix, value: 1 },
    });
    return `${prefix}${pad(counter.value, len)}`;
  });
}

module.exports = { nextId };
