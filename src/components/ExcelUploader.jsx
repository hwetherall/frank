import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { parseExcelFile, generateTableSchema, convertToSupabaseFormat } from '../services/excelParser.js';
import { uploadToSupabase, createTable, tableExists, getTableInfo } from '../services/supabaseUploader.js';
import { testConnection } from '../services/supabaseClient.js';

const ExcelUploader = () => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [schema, setSchema] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('select'); // select, preview, upload, complete
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Test Supabase connection on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      const result = await testConnection();
      setConnectionStatus(result);
    };
    checkConnection();
  }, []);

  const handleFileSelect = useCallback(async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    
    try {
      const parsed = await parseExcelFile(selectedFile);
      const firstSheetName = Object.keys(parsed)[0];
      const firstSheet = parsed[firstSheetName];
      
      if (!firstSheet || firstSheet.headers.length === 0) {
        throw new Error('No data found in the Excel file');
      }

      const generatedSchema = generateTableSchema(firstSheet.headers, firstSheet.rows);
      
      setParsedData(parsed);
      setSchema(generatedSchema);
      setStep('preview');
    } catch (error) {
      alert(`Error parsing Excel file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleUpload = async () => {
    if (!parsedData || !schema) return;

    setIsProcessing(true);
    setStep('upload');
    
    try {
      // Check if table exists
      const exists = await tableExists(schema.tableName);
      
      if (!exists) {
        // Try to create table
        const createResult = await createTable(schema);
        if (!createResult.success) {
          setUploadResult({
            success: false,
            error: 'Failed to create table. Please create it manually using the SQL provided.',
            sql: createResult.sql
          });
          setStep('complete');
          setIsProcessing(false);
          return;
        }
      }

      // Convert data for upload
      const uploadData = convertToSupabaseFormat(parsedData, schema);
      
      // Upload to Supabase
      const result = await uploadToSupabase(
        schema.tableName, 
        uploadData,
        (progress) => setUploadProgress(progress)
      );
      
      setUploadResult(result);
      setStep('complete');
    } catch (error) {
      setUploadResult({
        success: false,
        error: error.message
      });
      setStep('complete');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setParsedData(null);
    setSchema(null);
    setUploadProgress(null);
    setUploadResult(null);
    setStep('select');
  };

  const renderConnectionStatus = () => {
    if (!connectionStatus) return null;
    
    return (
      <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
        connectionStatus.success 
          ? 'bg-green-50 border border-green-200 text-green-800' 
          : 'bg-red-50 border border-red-200 text-red-800'
      }`}>
        {connectionStatus.success ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600" />
        )}
        <span>{connectionStatus.message}</span>
      </div>
    );
  };

  const renderFileSelect = () => (
    <div className="text-center">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-400 transition-colors">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">Upload Excel File</h3>
          <p className="text-gray-500">Select your Contacts Table Excel file to upload to Supabase</p>
        </div>
        <div className="mt-6">
          <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Upload className="w-5 h-5" />
            Choose File
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!parsedData || !schema) return null;
    
    const firstSheetName = Object.keys(parsedData)[0];
    const firstSheet = parsedData[firstSheetName];
    const previewRows = firstSheet.data.slice(0, 5);
    
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">File Preview</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">File:</span> {file.name}
            </div>
            <div>
              <span className="font-medium">Total Rows:</span> {firstSheet.rows.length}
            </div>
            <div>
              <span className="font-medium">Columns:</span> {schema.columns.length}
            </div>
            <div>
              <span className="font-medium">Table Name:</span> {schema.tableName}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold mb-3">Column Schema</h4>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Original Name</th>
                  <th className="text-left py-2">Database Column</th>
                  <th className="text-left py-2">Data Type</th>
                </tr>
              </thead>
              <tbody>
                {schema.columns.map((col, idx) => {
                  const sampleValue = firstSheet.data[0] && firstSheet.data[0][col.originalName];
                  const isUrl = sampleValue && typeof sampleValue === 'string' && 
                    (sampleValue.match(/^https?:\/\/.+/i) || sampleValue.includes('linkedin.com'));
                  const isJsonArray = sampleValue && typeof sampleValue === 'string' && 
                    sampleValue.trim().startsWith('[') && sampleValue.trim().endsWith(']');
                  
                  return (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2">{col.originalName}</td>
                      <td className="py-2 font-mono text-blue-600">{col.name}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            col.type === 'JSONB' ? 'bg-purple-100 text-purple-800' :
                            col.type === 'TEXT' && isUrl ? 'bg-blue-100 text-blue-800' :
                            col.type === 'TIMESTAMP' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {col.type}
                          </span>
                          {isUrl && <span className="text-xs text-blue-600">🔗 URL</span>}
                          {isJsonArray && <span className="text-xs text-purple-600">📋 Array</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold mb-3">Data Preview (First 5 Rows)</h4>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {firstSheet.headers.map((header, idx) => (
                    <th key={idx} className="text-left py-2 px-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-gray-200">
                    {firstSheet.headers.map((header, colIdx) => (
                      <td key={colIdx} className="py-2 px-2">{row[header] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={resetUploader}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Choose Different File
          </button>
          <button
            onClick={handleUpload}
            disabled={!connectionStatus?.success}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Database className="w-5 h-5" />
            Upload to Supabase
          </button>
        </div>
      </div>
    );
  };

  const renderUpload = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <h3 className="text-lg font-semibold">Uploading to Supabase...</h3>
      
      {uploadProgress && (
        <div className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Progress: {uploadProgress.processed} / {uploadProgress.total} records</div>
            <div>Batch: {uploadProgress.currentBatch} / {uploadProgress.totalBatches}</div>
            <div>Success: {uploadProgress.successCount} | Errors: {uploadProgress.errorCount}</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        {uploadResult?.success ? (
          <CheckCircle className="w-12 h-12 text-green-600" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-600" />
        )}
      </div>
      
      <h3 className={`text-lg font-semibold ${uploadResult?.success ? 'text-green-800' : 'text-red-800'}`}>
        {uploadResult?.success ? 'Upload Completed!' : 'Upload Failed'}
      </h3>
      
      {uploadResult && (
        <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="text-sm space-y-2">
            <div>Total Records: {uploadResult.totalRecords}</div>
            <div>Successful: {uploadResult.successCount}</div>
            <div>Errors: {uploadResult.errorCount}</div>
            {uploadResult.error && (
              <div className="text-red-700 mt-2">
                <strong>Error:</strong> {uploadResult.error}
              </div>
            )}
            {uploadResult.sql && (
              <div className="mt-4">
                <strong>Please run this SQL in your Supabase SQL editor:</strong>
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2 overflow-x-auto">
                  {uploadResult.sql}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      
      <button
        onClick={resetUploader}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Upload Another File
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Excel to Supabase Uploader</h1>
          <p className="text-gray-600">Upload your Contacts Table Excel file directly to Supabase</p>
        </div>

        {renderConnectionStatus()}

        {isProcessing && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 text-blue-600 animate-spin mr-2" />
            <span>Processing...</span>
          </div>
        )}

        {!isProcessing && step === 'select' && renderFileSelect()}
        {!isProcessing && step === 'preview' && renderPreview()}
        {step === 'upload' && renderUpload()}
        {step === 'complete' && renderComplete()}
      </div>
    </div>
  );
};

export default ExcelUploader;
