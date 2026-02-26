import * as XLSX from 'xlsx';

/**
 * Parse Excel file and convert to JSON
 * @param {File} file - The Excel file to parse
 * @returns {Promise<Object>} - Parsed data with sheets and rows
 */
export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result = {};
        
        // Parse all sheets
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, // Use first row as header
            defval: null // Default value for empty cells
          });
          
          if (jsonData.length > 0) {
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            
            result[sheetName] = {
              headers,
              rows,
              data: rows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                  obj[header] = row[index] || null;
                });
                return obj;
              })
            };
          }
        });
        
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Generate SQL table schema from Excel headers
 * @param {Array} headers - Column headers from Excel
 * @param {Array} sampleData - Sample rows to infer data types
 * @returns {Object} - Table schema information
 */
export const generateTableSchema = (headers, sampleData) => {
  const schema = {
    tableName: 'contacts_table',
    columns: []
  };
  
  headers.forEach((header, index) => {
    if (!header) return; // Skip empty headers
    
    // Clean column name for SQL
    const columnName = header
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Infer data type from sample data
    let dataType = 'TEXT';
    const sampleValues = sampleData.slice(0, 10).map(row => row[index]).filter(val => val != null);
    
    if (sampleValues.length > 0) {
      const firstValue = sampleValues[0];
      
      if (typeof firstValue === 'number') {
        dataType = Number.isInteger(firstValue) ? 'INTEGER' : 'REAL';
      } else if (typeof firstValue === 'string') {
        // Check for JSON arrays (like ["AI", "Technology"])
        if (firstValue.trim().startsWith('[') && firstValue.trim().endsWith(']')) {
          try {
            JSON.parse(firstValue);
            dataType = 'JSONB'; // PostgreSQL JSONB for better performance
          } catch (e) {
            dataType = 'TEXT'; // Fallback if not valid JSON
          }
        }
        // Check for URLs
        else if (firstValue.match(/^https?:\/\/.+/i) || firstValue.includes('linkedin.com') || firstValue.includes('www.')) {
          dataType = 'TEXT'; // URLs are stored as TEXT but we'll note this
        }
        // Check if it's a date
        else if (!isNaN(Date.parse(firstValue)) && firstValue.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/)) {
          dataType = 'TIMESTAMP';
        } 
        // Check for email
        else if (firstValue.includes('@') && firstValue.includes('.')) {
          dataType = 'TEXT'; // Email
        } 
        else {
          dataType = 'TEXT';
        }
      }
    }
    
    schema.columns.push({
      name: columnName,
      originalName: header,
      type: dataType,
      nullable: true
    });
  });
  
  return schema;
};

/**
 * Convert Excel data to Supabase-compatible format
 * @param {Object} excelData - Parsed Excel data
 * @param {Object} schema - Table schema
 * @returns {Array} - Array of objects ready for Supabase insert
 */
export const convertToSupabaseFormat = (excelData, schema) => {
  const firstSheet = Object.keys(excelData)[0];
  const sheetData = excelData[firstSheet];
  
  return sheetData.data.map(row => {
    const convertedRow = {};
    schema.columns.forEach(column => {
      const originalValue = row[column.originalName];
      
      if (originalValue == null) {
        convertedRow[column.name] = null;
        return;
      }
      
      // Convert based on data type
      switch (column.type) {
        case 'INTEGER':
          convertedRow[column.name] = parseInt(originalValue) || null;
          break;
        case 'REAL':
          convertedRow[column.name] = parseFloat(originalValue) || null;
          break;
        case 'TIMESTAMP':
          convertedRow[column.name] = new Date(originalValue).toISOString();
          break;
        case 'JSONB':
          // Handle JSON arrays like ["AI", "Technology"]
          try {
            if (typeof originalValue === 'string') {
              // Try to parse as JSON
              convertedRow[column.name] = JSON.parse(originalValue);
            } else {
              // If it's already an object/array, use as-is
              convertedRow[column.name] = originalValue;
            }
          } catch (e) {
            // If parsing fails, store as string
            convertedRow[column.name] = String(originalValue);
          }
          break;
        default:
          convertedRow[column.name] = String(originalValue);
      }
    });
    
    return convertedRow;
  });
};
