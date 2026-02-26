export default {
  output: {
    filePath: 'repomix-output.xml',
    style: 'xml',
    headerText: 'Frank Expert Discovery - Code Only (No Data Files)',
    removeComments: false,
    removeEmptyLines: false,
    topFilesLength: 2,
    showLineNumbers: true,
  },
  include: [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.py',
    '**/*.sql',
    '**/*.css',
    '**/*.html',
    '**/*.md',
    '**/package.json',
    '**/package-lock.json',
    '**/*.config.js',
    '**/*.config.ts',
    '**/tailwind.config.js',
    '**/vite.config.js',
    '**/postcss.config.js',
  ],
  ignore: {
    useGitignore: true,
    useDefaultPatterns: true,
    customPatterns: [
      // Data files - the main exclusion you requested
      '**/*.xlsx',
      '**/*.csv',
      '**/*.xls',
      
      // Other data formats
      '**/*.json',
      '**/*.xml',
      '**/*.txt',
      '**/*.log',
      
      // Build outputs
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      
      // Dependencies
      '**/node_modules/**',
      
      // Environment files
      '**/.env*',
      '**/*.config.local.*',
      
      // OS files
      '**/.DS_Store',
      '**/Thumbs.db',
      
      // IDE files
      '**/.vscode/**',
      '**/.idea/**',
      '**/*.swp',
      '**/*.swo',
      
      // Binary and media files
      '**/*.pdf',
      '**/*.doc',
      '**/*.docx',
      '**/*.ppt',
      '**/*.pptx',
      '**/*.zip',
      '**/*.tar.gz',
      '**/*.rar',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.png',
      '**/*.gif',
      '**/*.mp4',
      '**/*.avi',
      '**/*.mov',
      '**/*.webm',
      '**/*.svg',
      
      // Database files
      '**/*.db',
      '**/*.sqlite',
      '**/*.sqlite3',
      
      // Previous repomix outputs
      '**/repomix-output.*',
    ],
  },
  security: {
    enableSecurityCheck: true,
  },
};
