const fs = require('fs');
const path = require('path');

/**
 * @param {string} folderPath - Path to folder containing JSON files
 * @param {string[]} words - Words to search for (all must be present in object)
 * @param {number} dateFrom - Start date as YYYYMMDD e.g. 20070101
 * @param {number} dateTo - End date as YYYYMMDD e.g. 20071231
 * @returns {object[]} Matching objects
 */
function searchJsonFiles(folderPath, words, dateFrom, dateTo) {
  const results = [];
  console.log('searching');

  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const timestamp = path.basename(file, '.json'); // e.g. "20070216071452"
    const fileDate = parseInt(timestamp.slice(0, 8), 10); // e.g. 20070216

    if (isNaN(fileDate) || fileDate < dateFrom || fileDate > dateTo) continue;

    const raw = fs.readFileSync(path.join(folderPath, file), 'utf-8');
    const data = JSON.parse(raw);

    const items = data?.items;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const itemStr = JSON.stringify(item).toLowerCase();
      const allWordsPresent = words.every((w) =>
        itemStr.includes(w.toLowerCase()),
      );
      if (allWordsPresent) {
        results.push(item);
      }
    }
  }

  return results;
}

const matches = searchJsonFiles(
  './bleepingcomputer',
  ['Windows', 'Failure'],
  20250401,
  20260811,
);
console.log(matches);
console.log('LENGTH', matches.length);
