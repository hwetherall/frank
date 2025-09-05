const fs = require('fs');

// UPDATE THIS PATH TO YOUR CSV FILE
const csvFilePath = 'Contacts Table _ Innovera - Daniel.csv';

function updateCSVIndustry() {
  try {
    console.log('📖 Reading CSV file...');
    
    // Read the CSV file
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    // Industry is always the 4th column (index 3)
    const industryIndex = 3;
    
    console.log(`✅ Industry column is at index ${industryIndex} (4th column)`);
    
    // Process each row - ONLY modify Industry column
    const updatedLines = [lines[0]]; // Keep header unchanged
    
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      
      if (columns.length > industryIndex && columns[industryIndex]) {
        const originalIndustry = columns[industryIndex].trim();
        
        // Split by "/" and clean up each part
        const industries = originalIndustry
          .split('/')
          .map(item => item.trim())
          .filter(item => item.length > 0);
        
        // ONLY replace the Industry column, leave everything else exactly the same
        columns[industryIndex] = JSON.stringify(industries);
        
        console.log(`📝 Row ${i}: "${originalIndustry}" → ${JSON.stringify(industries)}`);
      }
      
      updatedLines.push(columns.join(','));
    }
    
    // Write back to the same file
    fs.writeFileSync(csvFilePath, updatedLines.join('\n'));
    
    console.log(`✅ CSV file updated successfully!`);
    console.log(`📊 Processed ${lines.length - 1} rows`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
updateCSVIndustry();
