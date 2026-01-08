ERP-CRM-Zentro Project Analysis and Improvement Plan for Cursor AI
Project Overview
ERP-CRM-Zentro is a comprehensive, modular ERP (Enterprise Resource Planning) and CRM (Customer Relationship Management) ecosystem designed to streamline enterprise operations, optimize customer lifecycles, and enable data-driven decision-making. It features a decoupled architecture built on the MERN stack (MongoDB, Express.js, React, Node.js) with TypeScript for enhanced type safety.
Key Statistics

Stars: 1
Forks: 0
Contributors: Primarily a single developer (inferred from commit history)
Commits: 43 on the master branch
Last Update: Active development, though specific last commit date not detailed

Tech Stack

Frontend: React + Vite + TypeScript (67.8% of codebase)
Backend: Node.js + Express (27.8% JavaScript)
Database: MongoDB (local or Atlas)
Other: CSS (3.9%), HTML (0.5%)
Dependencies: Includes Redux for state management, Recharts for analytics visualization, Socket.io for real-time chat, Mongoose for MongoDB schemas, JWT for authentication, Elastic Search for fuzzy searching, and Google OAuth/Calendar integration.
Real-time Features: Socket.io for chat and collaboration.
Security: JWT-based authentication with RBAC (Role-Based Access Control), secure password hashing, CORS, and environment-based secrets.

Folder Structure

ERP-CRM-Zentro/
├── src/                     # Frontend source (React + Vite + TS)
│   ├── features/            # Redux slices (e.g., Auth, Leads)
│   ├── components/          # Reusable UI elements (e.g., Charts, Tables)
│   └── pages/               # Dashboard and view pages
├── public/                  # Static assets
├── server/                  # Backend (Node + Express)
│   ├── src/
│   │   ├── controllers/     # API request handlers (e.g., documentController.js for document management)
│   │   ├── models/          # Mongoose schemas
│   │   ├── services/        # Business logic layers
│   │   └── utils/           # Utilities (e.g., pdfConverter.js for PDF conversions, though may be in development)
│   ├── .env                 # Backend environment variables
│   └── package.json         # Backend dependencies
├── .env                     # Frontend environment variables
├── index.html               # React entry point
├── vite.config.ts           # Vite build configuration
├── package.json             # Frontend dependencies
└── Other docs:              # e.g., GOOGLE_OAUTH_SETUP.md, env.example

Core Features (MVP)

Authentication: JWT with access/refresh tokens, Google OAuth, email login/reset.
RBAC: Admin, Employee, Customer roles; admins manage users.
Company Management: CRUD for organizations and hierarchies.
Contact Management: Linked to companies with advanced tracking.
Lead Pipeline: Kanban-style drag-and-drop (New → Qualified → Won).
Deals & Opportunities: Value, probability, and closing date tracking.
Task Manager: Assignment, due dates, completion tracking.
Product Catalog: Inventory for goods and services.

Advanced Modules

Workflow Automation: Rule-based engine (e.g., auto-assign leads).
Real-time Chat: Team and deal-specific threads via Socket.io.
Analytics Dashboard: Sales KPIs and visualizations with Recharts.
Elastic Search: Fuzzy search across entities like leads and contacts.
Calendar Sync: Two-way integration with Google Calendar.
Document Management: Planned future enhancement for file uploads, conversions (e.g., to PDF), storage, and management. Currently in development, with utilities like pdfConverter.js handling conversions for Word, PowerPoint, and Excel files.

Document Management Analysis
Document management is marked as a future enhancement in the repository. It involves uploading files (e.g., Word, PPT, Excel), converting them to PDF in the backend for standardized storage and viewing, and managing them via APIs. Key components:

Controllers: server/src/controllers/documentController.js – Handles upload/retrieval APIs, error handling (lines 231-266 involve try-catch for conversions).
Utilities: server/src/utils/pdfConverter.js – Core conversion logic using LibreOffice CLI/NPM, with fallbacks like ExcelJS and docx-pdf. Issues identified:
Line 132: LibreOffice CLI command lacks quality settings.
Line 210: libreoffice-convert NPM call passes undefined (no filter options for quality).
Fallback converters do not preserve images, colors, or formatting.
No DPI/resolution settings for images, leading to lossy conversions.

Current Issues: When uploading PPT or Word files, formatting, colors, and images are lost during PDF conversion. Only plain text is preserved without styles. Excel conversions may fare better but still lack quality controls.
Storage: Likely uses file system or cloud storage (e.g., integrated with MongoDB for metadata).
Dependencies for Conversion: libreoffice-convert (NPM), ExcelJS, docx-pdf, pptxgenjs (or similar for fallbacks).

The system supports concurrent dev (frontend/backend) and includes seeding scripts for admin/dummy data. It's extensible for adding quality improvements to PDF conversions.

Identified Bug

The document management functionality converts uploaded files (e.g., Word, PPT, Excel) to PDF in the backend.
Conversions succeed without syntax errors, but for PPT or Word files:
Formatting and color combinations are lost.
Images inside documents are ignored.

Resulting PDFs show only normal text without any formatting or visuals.

Root Causes:

Lack of quality settings in LibreOffice CLI (line 132 in pdfConverter.js).
Undefined filter options in NPM calls (line 210).
Fallback methods (e.g., ExcelJS, docx-pdf) inherently lose images/colors.
Absence of DPI/resolution controls for images.

Proposed Fix: Advanced High-Quality PDF Conversion
Implement the provided advanced solution to enhance PDF conversions using LibreOffice with maximum quality settings. This preserves colors, images, formatting, bookmarks, notes, and structure.
Updated Code for server/src/utils/pdfConverter.js
Replace or update the following functions:

// ... existing imports and code ...

/**
 * Convert file using LibreOffice CLI with HIGH QUALITY settings
 * @param {string} inputPath - Full path to input file
 * @param {string} outputPath - Full path for output PDF
 * @param {number} timeout - Timeout in milliseconds (default: 60000)
 * @returns {Promise<string>} - Path to converted PDF
 */
const convertWithLibreOfficeCLI = async (inputPath, outputPath, timeout = 60000) => {
  const { available, path: sofficePath } = await checkLibreOfficeInstalled();
 
  if (!available || !sofficePath) {
    throw new Error('LibreOffice CLI not available');
  }
  const outputDir = path.dirname(outputPath);
  const inputDir = path.dirname(inputPath);
  const inputFilename = path.basename(inputPath);
  return new Promise((resolve, reject) => {
    // ADVANCED: High-quality PDF export with filter options
    // Quality: 100 (maximum), CompressionMode: 0 (lossless), MaxImageResolution: 300 DPI
    // UseEscapePositioning: true (better text positioning)
    // SelectPdfVersion: 1 (PDF 1.4 for compatibility, or 2 for PDF 2.0)
    const filterOptions = JSON.stringify({
      Quality: 100, // Maximum quality (0-100)
      CompressionMode: 0, // 0=lossless, 1=JPEG compression
      MaxImageResolution: 300, // 300 DPI for high-quality images
      UseTaggedPDF: true, // Better accessibility and structure
      SelectPdfVersion: 1, // PDF version (1=1.4, 2=2.0)
      EmbedStandardFonts: true, // Embed fonts for consistency
      ExportFormFields: true, // Preserve form fields
      UseEscapePositioning: true, // Better text positioning
      ExportBookmarks: true, // Preserve bookmarks/outline
      ExportNotes: true, // Preserve notes/comments
      ExportHiddenSlides: true, // For PowerPoint
      ExportPlaceholders: true, // Preserve placeholders
      ReduceImageResolution: false, // Don't reduce image resolution
      MaxResolution: 300, // Maximum DPI for images
      ImageCompression: 0, // 0=lossless, 1-9=JPEG quality
      Watermark: '', // No watermark
      PDFUACompliance: false, // Disable for better compatibility
    });
    // Escape the filter options for command line (Windows needs special handling)
    const escapedOptions = process.platform === 'win32'
      ? filterOptions.replace(/"/g, '\\"')
      : filterOptions.replace(/'/g, "'\\''");
    // LibreOffice command with high-quality filter options
    const command = `"${sofficePath}" --headless --convert-to "pdf:writer_pdf_Export:${escapedOptions}" --outdir "${outputDir}" "${inputPath}"`;
   
    console.log(`[PDFConverter] Running LibreOffice CLI with HIGH QUALITY settings`);
    console.log(`[PDFConverter] Command: ${command.substring(0, 200)}...`);
   
    exec(command, {
      timeout,
      cwd: inputDir,
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large files
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error('[PDFConverter] LibreOffice CLI error:', error.message);
        console.error('[PDFConverter] LibreOffice CLI stderr:', stderr);
       
        // Try fallback with simpler command if filter options fail
        console.log('[PDFConverter] Retrying with simplified high-quality command...');
        const fallbackCommand = `"${sofficePath}" --headless --convert-to "pdf:writer_pdf_Export:{\\"Quality\\":100,\\"MaxImageResolution\\":300}" --outdir "${outputDir}" "${inputPath}"`;
       
        exec(fallbackCommand, {
          timeout,
          cwd: inputDir,
          maxBuffer: 50 * 1024 * 1024
        }, async (fallbackError, fallbackStdout, fallbackStderr) => {
          if (fallbackError) {
            reject(new Error(`LibreOffice CLI conversion failed: ${error.message}`));
            return;
          }
         
          // Handle fallback success (same as below)
          const expectedPdfPath = path.join(outputDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait longer for file write
            await fs.access(expectedPdfPath);
            if (expectedPdfPath !== outputPath) {
              await fs.rename(expectedPdfPath, outputPath);
            }
            console.log('[PDFConverter] LibreOffice CLI conversion successful (fallback)');
            resolve(outputPath);
          } catch (err) {
            reject(new Error('PDF file was not created by LibreOffice'));
          }
        });
        return;
      }
      // LibreOffice outputs the PDF with the same name but .pdf extension
      const expectedPdfPath = path.join(outputDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');
     
      try {
        // Wait longer for file to be written (high-quality conversion takes more time)
        await new Promise(resolve => setTimeout(resolve, 1000));
       
        // Check if PDF was created
        await fs.access(expectedPdfPath);
       
        // If output path is different, move/rename the file
        if (expectedPdfPath !== outputPath) {
          await fs.rename(expectedPdfPath, outputPath);
        }
       
        console.log('[PDFConverter] LibreOffice CLI HIGH QUALITY conversion successful');
        resolve(outputPath);
      } catch (err) {
        console.error('[PDFConverter] PDF file not found after conversion:', expectedPdfPath);
        reject(new Error('PDF file was not created by LibreOffice'));
      }
    });
  });
};

// ... existing code ...

export const convertToPDF = async (inputPath, outputPath, fileType, timeout = 120000) => { // Increased timeout for quality conversion
  console.log(`[PDFConverter] Converting ${fileType} file: ${inputPath}`);
  console.log(`[PDFConverter] Output path: ${outputPath}`);
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  // Check if input file exists
  try {
    await fs.access(inputPath);
  } catch (err) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  // Check LibreOffice availability first and warn if not available
  const libreOfficeStatus = await checkLibreOfficeInstalled();
  if (!libreOfficeStatus.available) {
    console.warn('[PDFConverter] ⚠️ WARNING: LibreOffice is not installed!');
    console.warn('[PDFConverter] Quality will be significantly reduced without LibreOffice.');
    console.warn('[PDFConverter] Please install LibreOffice for maximum quality conversion.');
  }
  // Tier 1: Try LibreOffice CLI first (most reliable for all Office formats)
  try {
    console.log('[PDFConverter] Attempting LibreOffice CLI conversion with HIGH QUALITY settings...');
    return await convertWithLibreOfficeCLI(inputPath, outputPath, timeout);
  } catch (err) {
    console.log('[PDFConverter] LibreOffice CLI conversion failed:', err.message);
    // Fall through to other methods
  }
  // Tier 2: Try LibreOffice NPM package with quality options
  if (libreConvert) {
    try {
      console.log('[PDFConverter] Attempting LibreOffice NPM conversion with quality settings...');
      const inputBuffer = await fs.readFile(inputPath);
     
      // ADVANCED: Pass filter options to libreoffice-convert
      // Note: libreoffice-convert may not support all filter options, but we try
      const filterOptions = {
        Quality: 100,
        CompressionMode: 0,
        MaxImageResolution: 300,
      };
     
      // Try with filter options (if supported by the package version)
      try {
        const pdfBuffer = await libreConvert(inputBuffer, '.pdf', filterOptions);
        await fs.writeFile(outputPath, pdfBuffer);
        console.log('[PDFConverter] LibreOffice NPM conversion successful with quality settings');
        return outputPath;
      } catch (filterError) {
        // Fallback: try without filter options (some versions don't support it)
        console.log('[PDFConverter] Filter options not supported, trying without...');
        const pdfBuffer = await libreConvert(inputBuffer, '.pdf', undefined);
        await fs.writeFile(outputPath, pdfBuffer);
        console.log('[PDFConverter] LibreOffice NPM conversion successful');
        return outputPath;
      }
    } catch (err) {
      console.error('[PDFConverter] LibreOffice NPM conversion failed:', err.message);
      // Fall through to other methods
    }
  }
  // Tier 3: Format-specific fallback methods (WARNING: These lose quality!)
  console.warn('[PDFConverter] ⚠️ Using fallback converters - QUALITY WILL BE REDUCED!');
  console.warn('[PDFConverter] Images, colors, and formatting may not be preserved.');
  switch (fileType) {
    case 'word':
      return await convertWordToPDF(inputPath, outputPath, timeout);
    case 'powerpoint':
      return await convertPowerPointToPDF(inputPath, outputPath, timeout);
    case 'excel':
      return await convertExcelToPDF(inputPath, outputPath, timeout);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

// ... rest of existing code ...

Enhanced Error Handling in server/src/controllers/documentController.js
Update lines 231-266 with:

} catch (conversionError) {
    console.error('[Upload] PDF conversion failed:', conversionError);
   
    // Check if LibreOffice is available for better error message
    const { checkLibreOfficeInstalled } = await import('../utils/pdfConverter.js');
    const libreOfficeStatus = await checkLibreOfficeInstalled();
   
    // Clean up original file on conversion failure
    try {
      await fs.unlink(originalPath);
    } catch (cleanupError) {
      console.error('[Upload] Error cleaning up original file:', cleanupError);
    }
    // Also try to clean up any partial PDF file
    try {
      await fs.unlink(pdfPath);
    } catch (cleanupError) {
      // PDF might not exist, ignore error
    }
    // Provide more helpful error messages
    let errorMessage = 'Failed to convert document to PDF.';
    let suggestion = '';
    if (!libreOfficeStatus.available) {
      errorMessage = 'PDF conversion failed - LibreOffice is not installed.';
      suggestion = '⚠️ CRITICAL: Install LibreOffice on the server for high-quality PDF conversion. Without LibreOffice, images, colors, and formatting will be lost. Download from: https://www.libreoffice.org/download/';
    } else if (fileType === 'powerpoint') {
      suggestion = 'PowerPoint conversion requires LibreOffice. Please ensure LibreOffice is properly installed and accessible.';
    } else if (fileType === 'excel') {
      suggestion = 'Excel conversion requires LibreOffice for best results. Please ensure LibreOffice is properly installed.';
    } else if (fileType === 'word') {
      suggestion = 'Word conversion should work with LibreOffice. Please check server logs for details.';
    }
    return res.status(500).json({
      error: errorMessage,
      details: conversionError.message,
      suggestion: suggestion,
      fileType: fileType,
      libreOfficeInstalled: libreOfficeStatus.available
    });
  }

Additional Recommendations

Install LibreOffice (Required for high-quality conversions):
Windows: Download from https://www.libreoffice.org/download/. Add to PATH or update checkLibreOfficeInstalled() paths.

Add Environment Variables for Quality Control (in server/env.example and .env):

# PDF Conversion Quality Settings
PDF_CONVERSION_QUALITY=100 # 0-100 (100 = maximum)
PDF_IMAGE_DPI=300 # DPI for images (300 = high quality)
PDF_COMPRESSION_MODE=0 # 0=lossless, 1=JPEG compression
PDF_CONVERSION_TIMEOUT=120000 # Timeout in ms (2 minutes for large files)

Update code to read these from process.env for dynamic configuration.
Testing:
Upload sample Word/PPT files with images, colors, and formatting.
Verify PDF output preserves elements.
Test fallbacks and error handling without LibreOffice.

Summary of Improvements:
Maximum quality: Quality=100, lossless compression.
High-res images: 300 DPI.
Preserved elements: Bookmarks, notes, form fields, hidden slides.
Fallbacks: Simplified commands if advanced filters fail.
Warnings: Log when LibreOffice is missing.
Timeout: Increased to 120 seconds for complex conversions.


Implementation Plan for Cursor AI Code Editor
Use Cursor's AI features (e.g., Composer) to implement this plan step-by-step. Open the project in Cursor, create this .md file, and use it as a guide for AI-assisted coding.
Step 1: Set Up Environment

Open ERP-CRM-Zentro in Cursor.
Ensure LibreOffice is installed on your development machine/server.
Add the new environment variables to server/.env and update code to use them (e.g., in convertToPDF, read process.env.PDF_CONVERSION_QUALITY).
Prompt for Cursor AI: "Add environment variable parsing for PDF quality settings in pdfConverter.js using process.env."

Step 2: Update pdfConverter.js

Navigate to server/src/utils/pdfConverter.js (create if not exists, as it's a future enhancement).
Replace convertWithLibreOfficeCLI with the provided advanced version.
Update convertToPDF export with the new logic, including quality checks and increased timeout.
Handle imports (e.g., fs, path, exec from 'child_process').
Prompt for Cursor AI: "Implement high-quality LibreOffice CLI conversion in pdfConverter.js as per the provided code snippet, ensuring compatibility with existing fallbacks."

Step 3: Enhance documentController.js

Navigate to server/src/controllers/documentController.js.
Update the try-catch block (lines 231-266) with enhanced error handling.
Ensure import for checkLibreOfficeInstalled from '../utils/pdfConverter.js'.
Prompt for Cursor AI: "Enhance error handling in documentController.js for PDF conversion failures, adding LibreOffice checks and user-friendly suggestions as in the code."

Step 4: Test and Debug

Run the backend: npm run dev in server folder.
Test uploads via API (e.g., Postman) with sample files.
Use Cursor's debugging tools to step through conversions.
Prompt for Cursor AI: "Generate unit tests for convertToPDF function to verify image and formatting preservation."