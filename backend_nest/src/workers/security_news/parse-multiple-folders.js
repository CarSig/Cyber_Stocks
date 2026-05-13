const { RSSParser, RSSAdapterFactory } = require('./rss-parser-node');

const fs = require('fs');
const path = require('path');
const root_folder =
  'C:\Users\Lovro\Documents\Projects\web_scrapping\cyber_stocks\archive';
// Folders containing your RSS XML files
const folders = ['./bleepingcomputer', './securityweek', './therecord'];

// Function to process a single file
function processFile(filePath, fileName, folderName) {
  // Create output directory structure: ./json/foldername/
  const jsonDir = path.join('./json', folderName);
  const jsonOutputPath = path.join(
    jsonDir,
    `${path.parse(fileName).name}.json`,
  );

  // Check if JSON already exists
  if (fs.existsSync(jsonOutputPath)) {
    console.log(`\n⏭️  Skipping: ${fileName} (JSON already exists)`);
    return { success: true, skipped: true, itemCount: 0 };
  }

  console.log(`\n📄 Processing: ${fileName} (from ${folderName})`);
  console.log('-'.repeat(80));

  try {
    // Read the file
    const xmlString = fs.readFileSync(filePath, 'utf-8');

    // Auto-detect and create appropriate adapter
    const adapter = RSSAdapterFactory.createAdapter(xmlString);
    const parser = new RSSParser(adapter);

    // Parse the file
    const data = parser.parse(xmlString);

    // Display feed info
    console.log('📰 Feed Title:', data.feed.title);
    console.log('🔗 Feed Link:', data.feed.link);
    console.log('📅 Published:', data.feed.pubDate);
    console.log('📊 Total Items:', data.items.length);
    console.log('🔧 Adapter Used:', adapter.constructor.name);

    // Display first 3 items
    console.log('\n📄 Articles:');
    data.items.slice(0, 3).forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${item.title}`);
      console.log(`     Author: ${item.author}`);
      console.log(`     Date: ${item.pubDate}`);
      console.log(`     Categories: ${item.categories.join(', ')}`);
      console.log(`     Link: ${item.link}`);
    });

    if (data.items.length > 3) {
      console.log(`\n  ... and ${data.items.length - 3} more articles`);
    }

    // Create json directory if it doesn't exist
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    // Save parsed data to JSON in ./json/foldername/
    fs.writeFileSync(jsonOutputPath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Saved JSON to: ${jsonOutputPath}`);

    return { success: true, skipped: false, itemCount: data.items.length };
  } catch (error) {
    console.error(`❌ Error parsing ${fileName}:`, error.message);
    return { success: false, skipped: false, error: error.message };
  }
}

// Main execution
console.log('🚀 Starting RSS Feed Parser');
console.log('='.repeat(80));

let totalFiles = 0;
let successCount = 0;
let skippedCount = 0;
let totalItems = 0;

// Process each folder
folders.forEach((folderPath) => {
  console.log(`\n\n📁 Processing folder: ${folderPath}`);
  console.log('='.repeat(80));

  // Check if folder exists
  if (!fs.existsSync(folderPath)) {
    console.log(`⚠️  Folder not found: ${folderPath} (skipping)`);
    return;
  }

  // Read all files from the folder
  const files = fs.readdirSync(folderPath);

  // Filter only XML files
  const xmlFiles = files.filter((file) => file.endsWith('.xml'));

  console.log(`Found ${xmlFiles.length} XML files`);

  // Process each file
  xmlFiles.forEach((file) => {
    totalFiles++;
    const filePath = path.join(folderPath, file);
    const result = processFile(filePath, file, path.basename(folderPath));

    if (result.success) {
      successCount++;
      if (result.skipped) {
        skippedCount++;
      } else {
        totalItems += result.itemCount;
      }
    }

    if (!result.skipped) {
      console.log('='.repeat(80));
    }
  });
});

// Summary
console.log('\n\n📊 SUMMARY');
console.log('='.repeat(80));
console.log(`Total files found: ${totalFiles}`);
console.log(`Skipped (already processed): ${skippedCount}`);
console.log(`Successfully parsed: ${successCount - skippedCount}`);
console.log(`Failed: ${totalFiles - successCount}`);
console.log(`Total articles extracted: ${totalItems}`);
console.log('\n✨ All files processed!');
