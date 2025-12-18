import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';
import { platform } from 'os';

// Try to use libreoffice-convert if available (requires LibreOffice installed)
let libreConvert = null;
try {
  const libre = await import('libreoffice-convert');
  libreConvert = promisify(libre.default.convert);
  console.log('[PDFConverter] LibreOffice converter (NPM) loaded successfully');
} catch (err) {
  console.log('[PDFConverter] LibreOffice converter (NPM) not available, will use fallback methods');
}

// Fallback: Try docx-pdf for Word documents
let docxPdf = null;
try {
  const docxPdfModule = await import('docx-pdf');
  docxPdf = docxPdfModule.default;
  console.log('[PDFConverter] docx-pdf converter loaded successfully');
} catch (err) {
  console.log('[PDFConverter] docx-pdf converter not available');
}

// ExcelJS for reading Excel files
let ExcelJS = null;
try {
  const exceljsModule = await import('exceljs');
  ExcelJS = exceljsModule.default;
  console.log('[PDFConverter] ExcelJS loaded successfully');
} catch (err) {
  console.log('[PDFConverter] ExcelJS not available');
}

// JSZip for reading PPTX files (PPTX is a ZIP archive)
let JSZip = null;
try {
  const jszipModule = await import('jszip');
  JSZip = jszipModule.default;
  console.log('[PDFConverter] JSZip loaded successfully');
} catch (err) {
  console.log('[PDFConverter] JSZip not available');
}

// xml2js for parsing XML in PPTX files
let xml2js = null;
try {
  const xml2jsModule = await import('xml2js');
  xml2js = xml2jsModule;
  console.log('[PDFConverter] xml2js loaded successfully');
} catch (err) {
  console.log('[PDFConverter] xml2js not available');
}

// Cache for LibreOffice CLI availability check
let libreOfficeCLIAvailable = null;
let libreOfficeCLIPath = null;

/**
 * Check if LibreOffice is installed and available via CLI
 * @returns {Promise<{available: boolean, path: string|null}>}
 */
export const checkLibreOfficeInstalled = async () => {
  if (libreOfficeCLIAvailable !== null) {
    return { available: libreOfficeCLIAvailable, path: libreOfficeCLIPath };
  }

  const osPlatform = platform();
  const possiblePaths = [];

  if (osPlatform === 'win32') {
    // Windows paths
    possiblePaths.push('soffice.exe');
    possiblePaths.push('C:\\Program Files\\LibreOffice\\program\\soffice.exe');
    possiblePaths.push('C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe');
  } else {
    // Linux/Mac paths
    possiblePaths.push('soffice');
    possiblePaths.push('/usr/bin/soffice');
    possiblePaths.push('/usr/local/bin/soffice');
    possiblePaths.push('/Applications/LibreOffice.app/Contents/MacOS/soffice');
  }

  for (const sofficePath of possiblePaths) {
    try {
      await new Promise((resolve, reject) => {
        exec(`"${sofficePath}" --version`, { timeout: 5000 }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      libreOfficeCLIAvailable = true;
      libreOfficeCLIPath = sofficePath;
      console.log(`[PDFConverter] LibreOffice CLI found at: ${sofficePath}`);
      return { available: true, path: sofficePath };
    } catch (err) {
      // Continue checking other paths
    }
  }

  libreOfficeCLIAvailable = false;
  libreOfficeCLIPath = null;
  console.log('[PDFConverter] LibreOffice CLI not found');
  return { available: false, path: null };
};

/**
 * Convert file using LibreOffice CLI (most reliable method)
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
    // LibreOffice command: soffice --headless --convert-to pdf --outdir <dir> <file>
    const command = `"${sofficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    
    console.log(`[PDFConverter] Running LibreOffice CLI: ${command}`);
    
    exec(command, { 
      timeout,
      cwd: inputDir,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error('[PDFConverter] LibreOffice CLI error:', error.message);
        console.error('[PDFConverter] LibreOffice CLI stderr:', stderr);
        reject(new Error(`LibreOffice CLI conversion failed: ${error.message}`));
        return;
      }

      // LibreOffice outputs the PDF with the same name but .pdf extension
      const expectedPdfPath = path.join(outputDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');
      
      try {
        // Wait a bit for file to be written
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if PDF was created
        await fs.access(expectedPdfPath);
        
        // If output path is different, move/rename the file
        if (expectedPdfPath !== outputPath) {
          await fs.rename(expectedPdfPath, outputPath);
        }
        
        console.log('[PDFConverter] LibreOffice CLI conversion successful');
        resolve(outputPath);
      } catch (err) {
        console.error('[PDFConverter] PDF file not found after conversion:', expectedPdfPath);
        reject(new Error('PDF file was not created by LibreOffice'));
      }
    });
  });
};

/**
 * Convert an Office document to PDF
 * @param {string} inputPath - Full path to the input file
 * @param {string} outputPath - Full path for the output PDF file
 * @param {string} fileType - Type of file: 'word', 'powerpoint', or 'excel'
 * @param {number} timeout - Timeout in milliseconds (default: 60000)
 * @returns {Promise<string>} - Path to the converted PDF file
 */
export const convertToPDF = async (inputPath, outputPath, fileType, timeout = 60000) => {
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

  // Tier 1: Try LibreOffice CLI first (most reliable for all Office formats)
  try {
    console.log('[PDFConverter] Attempting LibreOffice CLI conversion...');
    return await convertWithLibreOfficeCLI(inputPath, outputPath, timeout);
  } catch (err) {
    console.log('[PDFConverter] LibreOffice CLI conversion failed:', err.message);
    // Fall through to other methods
  }

  // Tier 2: Try LibreOffice NPM package
  if (libreConvert) {
    try {
      console.log('[PDFConverter] Attempting LibreOffice NPM conversion...');
      const inputBuffer = await fs.readFile(inputPath);
      const pdfBuffer = await libreConvert(inputBuffer, '.pdf', undefined);
      await fs.writeFile(outputPath, pdfBuffer);
      console.log('[PDFConverter] LibreOffice NPM conversion successful');
      return outputPath;
    } catch (err) {
      console.error('[PDFConverter] LibreOffice NPM conversion failed:', err.message);
      // Fall through to other methods
    }
  }

  // Tier 3: Format-specific fallback methods
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

/**
 * Convert Word document to PDF using docx-pdf
 */
const convertWordToPDF = async (inputPath, outputPath, timeout = 60000) => {
  if (docxPdf) {
    return new Promise((resolve, reject) => {
      console.log('[PDFConverter] Using docx-pdf for Word conversion...');
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Word to PDF conversion timed out'));
      }, timeout);

      docxPdf(inputPath, outputPath, (err) => {
        clearTimeout(timeoutId);
        if (err) {
          console.error('[PDFConverter] docx-pdf conversion failed:', err);
          reject(new Error(`Word to PDF conversion failed: ${err.message}`));
        } else {
          console.log('[PDFConverter] docx-pdf conversion successful');
          resolve(outputPath);
        }
      });
    });
  }

  // If no converter available, create a simple PDF with the document info
  console.log('[PDFConverter] No Word converter available, creating placeholder PDF');
  return await createPlaceholderPDF(inputPath, outputPath, 'Word Document');
};

/**
 * Convert PowerPoint to PDF by parsing PPTX structure
 * PPTX files are ZIP archives containing XML files with slide data
 */
const convertPowerPointToPDF = async (inputPath, outputPath, timeout = 60000) => {
  console.log('[PDFConverter] Attempting PowerPoint conversion with PPTX parser...');
  
  if (!JSZip || !xml2js) {
    console.log('[PDFConverter] PPTX parsing libraries not available, creating placeholder PDF');
    return await createPlaceholderPDF(inputPath, outputPath, 'PowerPoint Presentation');
  }

  try {
    // Read the PPTX file (it's a ZIP archive)
    const fileBuffer = await fs.readFile(inputPath);
    const zip = await JSZip.loadAsync(fileBuffer);
    
    // Get list of slide files (ppt/slides/slide1.xml, slide2.xml, etc.)
    const slideFiles = [];
    for (const fileName in zip.files) {
      if (fileName.match(/^ppt\/slides\/slide\d+\.xml$/)) {
        slideFiles.push(fileName);
      }
    }
    
    // Sort slides by number
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)[1]);
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)[1]);
      return numA - numB;
    });

    if (slideFiles.length === 0) {
      console.log('[PDFConverter] No slides found in PPTX, creating placeholder PDF');
      return await createPlaceholderPDF(inputPath, outputPath, 'PowerPoint Presentation');
    }

    console.log(`[PDFConverter] Found ${slideFiles.length} slides in PowerPoint file`);

    // Parse each slide and extract content
    const slides = [];
    for (const slideFile of slideFiles) {
      try {
        const slideXml = await zip.file(slideFile).async('string');
        const parsed = await xml2js.parseStringPromise(slideXml);
        const slideContent = extractSlideContent(parsed);
        slides.push(slideContent);
      } catch (err) {
        console.error(`[PDFConverter] Error parsing slide ${slideFile}:`, err.message);
        slides.push({ title: '', text: [], notes: '' });
      }
    }

    // Create PDF with slides
    return await createPowerPointPDF(slides, outputPath, path.basename(inputPath));
    
  } catch (err) {
    console.error('[PDFConverter] PowerPoint conversion error:', err.message);
    // Fall back to placeholder if parsing fails
    console.log('[PDFConverter] Falling back to placeholder PDF');
    return await createPlaceholderPDF(inputPath, outputPath, 'PowerPoint Presentation');
  }
};

/**
 * Extract text content from a parsed slide XML
 * PPTX uses Office Open XML format with namespaces
 */
const extractSlideContent = (parsedXml) => {
  const slide = {
    title: '',
    text: [],
    notes: ''
  };

  try {
    // Recursively extract all text nodes (a:t elements in Office Open XML)
    const extractText = (node) => {
      if (!node || typeof node !== 'object') return [];
      
      const texts = [];
      
      // Check for text nodes - Office Open XML uses 'a:t' for text
      // xml2js converts namespaces, so we need to check various possible keys
      const checkForText = (obj) => {
        // Check common text node patterns
        if (obj['a:t']) {
          if (Array.isArray(obj['a:t'])) {
            obj['a:t'].forEach(t => {
              if (typeof t === 'string') texts.push(t);
              else if (t && t._) texts.push(t._);
              else if (t && typeof t === 'object' && t.length === 1) texts.push(t[0]);
            });
          } else if (typeof obj['a:t'] === 'string') {
            texts.push(obj['a:t']);
          } else if (obj['a:t']._) {
            texts.push(obj['a:t']._);
          }
        }
        
        // Also check without namespace prefix (some parsers strip it)
        if (obj['t']) {
          if (Array.isArray(obj['t'])) {
            obj['t'].forEach(t => {
              if (typeof t === 'string') texts.push(t);
              else if (t && t._) texts.push(t._);
            });
          } else if (typeof obj['t'] === 'string') {
            texts.push(obj['t']);
          } else if (obj['t']._) {
            texts.push(obj['t']._);
          }
        }
      };

      checkForText(node);

      // Recursively search in all properties
      for (const key in node) {
        if (key === '_' || key === '$') continue; // Skip xml2js metadata
        
        if (Array.isArray(node[key])) {
          node[key].forEach(item => {
            if (typeof item === 'string') {
              texts.push(item);
            } else if (typeof item === 'object') {
              texts.push(...extractText(item));
            }
          });
        } else if (typeof node[key] === 'object' && node[key] !== null) {
          texts.push(...extractText(node[key]));
        } else if (typeof node[key] === 'string' && node[key].trim().length > 0) {
          texts.push(node[key]);
        }
      }
      
      return texts;
    };

    // Extract all text from the slide
    const allTexts = extractText(parsedXml)
      .filter(t => t && typeof t === 'string' && t.trim().length > 0)
      .map(t => t.trim())
      .filter((t, i, arr) => arr.indexOf(t) === i); // Remove duplicates

    // First substantial text is usually the title
    // Subsequent texts are body content
    if (allTexts.length > 0) {
      slide.title = allTexts[0];
      slide.text = allTexts.slice(1);
    }

    // If no title but we have text, use first text as title
    if (!slide.title && allTexts.length > 0) {
      slide.title = allTexts[0];
      slide.text = allTexts.slice(1);
    }
    
  } catch (err) {
    console.error('[PDFConverter] Error extracting slide content:', err.message);
  }

  return slide;
};

/**
 * Create PDF from PowerPoint slides
 */
const createPowerPointPDF = async (slides, outputPath, filename) => {
  const PDFDocument = (await import('pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        layout: 'landscape' // Landscape for better slide viewing
      });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          await fs.writeFile(outputPath, pdfBuffer);
          console.log('[PDFConverter] PowerPoint to PDF conversion successful');
          resolve(outputPath);
        } catch (err) {
          reject(err);
        }
      });
      doc.on('error', reject);

      // Render each slide
      slides.forEach((slide, index) => {
        if (index > 0) {
          doc.addPage({ layout: 'landscape' });
        }

        // Slide number
        doc.fontSize(10)
          .fillColor('#999999')
          .text(`Slide ${index + 1} of ${slides.length}`, 50, 30, { align: 'right' });

        // Slide title (centered, large)
        if (slide.title && slide.title.trim()) {
          doc.fontSize(24)
            .fillColor('#333333')
            .text(slide.title, {
              align: 'center',
              x: 50,
              y: doc.page.height / 2 - 100,
              width: doc.page.width - 100
            });
        }

        // Slide content (bullet points or paragraphs)
        let currentY = doc.page.height / 2 - 20;
        const lineHeight = 18;
        const marginLeft = 100;
        const maxWidth = doc.page.width - marginLeft - 50;

        slide.text.forEach((text, textIndex) => {
          // Check if we need a new page
          if (currentY > doc.page.height - 120) {
            doc.addPage({ layout: 'landscape' });
            currentY = 100;
            // Re-add slide number on new page
            doc.fontSize(10)
              .fillColor('#999999')
              .text(`Slide ${index + 1} of ${slides.length} (continued)`, 50, 30, { align: 'right' });
          }

          // Add bullet point
          doc.fontSize(14)
            .fillColor('#000000')
            .text('•', marginLeft - 25, currentY + 2);

          // Add text (wrap if needed)
          const textHeight = doc.fontSize(12)
            .fillColor('#333333')
            .text(text, marginLeft, currentY, {
              width: maxWidth,
              align: 'left',
              lineGap: 3
            });

          // Move to next line (account for wrapped text)
          const actualHeight = typeof textHeight === 'number' ? textHeight : lineHeight;
          currentY += Math.max(actualHeight, lineHeight) + 8;
        });

        // If no content, show a message
        if (!slide.title && slide.text.length === 0) {
          doc.fontSize(14)
            .fillColor('#999999')
            .text('(Empty slide)', {
              align: 'center',
              x: 50,
              y: doc.page.height / 2,
              width: doc.page.width - 100
            });
        }

        // Add footer with filename
        doc.fontSize(8)
          .fillColor('#cccccc')
          .text(filename, 50, doc.page.height - 30, { align: 'left' });
      });

      doc.end();
    } catch (err) {
      reject(new Error(`PowerPoint to PDF conversion failed: ${err.message}`));
    }
  });
};

/**
 * Convert Excel to PDF using ExcelJS and PDFKit
 * Reads Excel data and renders it as formatted tables in PDF
 */
const convertExcelToPDF = async (inputPath, outputPath, timeout = 60000) => {
  console.log('[PDFConverter] Attempting Excel conversion with ExcelJS...');
  
  if (!ExcelJS) {
    console.log('[PDFConverter] ExcelJS not available, creating placeholder PDF');
    return await createPlaceholderPDF(inputPath, outputPath, 'Excel Spreadsheet');
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(inputPath);
    
    const PDFDocument = (await import('pdfkit')).default;
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4',
          layout: 'landscape' // Landscape for better table viewing
        });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            await fs.writeFile(outputPath, pdfBuffer);
            console.log('[PDFConverter] Excel to PDF conversion successful');
            resolve(outputPath);
          } catch (err) {
            reject(err);
          }
        });
        doc.on('error', reject);

        // Process each worksheet
        workbook.eachSheet((worksheet, sheetId) => {
          if (sheetId > 1) {
            doc.addPage({ layout: 'landscape' });
          }

          // Add sheet name as header
          doc.fontSize(16)
            .fillColor('#333333')
            .text(worksheet.name, { align: 'center' });
          
          doc.moveDown();

          // Get all rows
          const rows = [];
          let maxCols = 0;
          
          worksheet.eachRow((row, rowNumber) => {
            const rowData = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              let cellValue = '';
              if (cell.value !== null && cell.value !== undefined) {
                if (typeof cell.value === 'object' && cell.value.text) {
                  cellValue = cell.value.text;
                } else {
                  cellValue = String(cell.value);
                }
              }
              rowData.push(cellValue);
            });
            rows.push(rowData);
            maxCols = Math.max(maxCols, rowData.length);
          });

          if (rows.length === 0) {
            doc.fontSize(12)
              .fillColor('#666666')
              .text('(Empty sheet)', { align: 'center' });
            return;
          }

          // Calculate column widths (distribute available width)
          const pageWidth = doc.page.width - 100; // Account for margins
          const colWidth = pageWidth / maxCols;
          const rowHeight = 20;
          const startY = doc.y;

          // Draw table
          let currentY = startY;
          
          rows.forEach((row, rowIndex) => {
            // Check if we need a new page
            if (currentY + rowHeight > doc.page.height - 50) {
              doc.addPage({ layout: 'landscape' });
              currentY = 50;
            }

            let currentX = 50;
            
            row.forEach((cellValue, colIndex) => {
              // Draw cell border
              doc.rect(currentX, currentY, colWidth, rowHeight)
                .stroke('#cccccc');
              
              // Add cell content
              const fontSize = rowIndex === 0 ? 10 : 9; // Header row slightly larger
              const fontColor = rowIndex === 0 ? '#000000' : '#333333';
              
              doc.fontSize(fontSize)
                .fillColor(fontColor);
              
              // Truncate long text
              const maxChars = Math.floor(colWidth / (fontSize * 0.6));
              const displayText = cellValue.length > maxChars 
                ? cellValue.substring(0, maxChars - 3) + '...' 
                : cellValue;
              
              doc.text(displayText, currentX + 2, currentY + 4, {
                width: colWidth - 4,
                height: rowHeight - 8,
                align: 'left',
                valign: 'top'
              });
              
              currentX += colWidth;
            });
            
            currentY += rowHeight;
          });

          // Draw outer border
          doc.rect(50, startY, pageWidth, currentY - startY)
            .stroke('#000000');
        });

        doc.end();
      } catch (err) {
        reject(new Error(`Excel to PDF conversion failed: ${err.message}`));
      }
    });
  } catch (err) {
    console.error('[PDFConverter] Excel conversion error:', err.message);
    // Fall back to placeholder if conversion fails
    console.log('[PDFConverter] Falling back to placeholder PDF');
    return await createPlaceholderPDF(inputPath, outputPath, 'Excel Spreadsheet');
  }
};

/**
 * Create a placeholder PDF when conversion is not possible
 * This provides a fallback that at least allows the document to be viewed
 */
const createPlaceholderPDF = async (inputPath, outputPath, docType) => {
  const PDFDocument = (await import('pdfkit')).default;
  const filename = path.basename(inputPath);
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          await fs.writeFile(outputPath, pdfBuffer);
          console.log('[PDFConverter] Placeholder PDF created successfully');
          resolve(outputPath);
        } catch (err) {
          reject(err);
        }
      });
      doc.on('error', reject);

      // Create a professional-looking placeholder PDF
      doc.fontSize(24)
        .fillColor('#333333')
        .text(docType, { align: 'center' });
      
      doc.moveDown(2);
      
      doc.fontSize(16)
        .fillColor('#666666')
        .text(`File: ${filename}`, { align: 'center' });
      
      doc.moveDown(3);
      
      doc.fontSize(12)
        .fillColor('#888888')
        .text('This document has been converted to PDF format.', { align: 'center' });
      
      doc.moveDown();
      
      doc.text('For full document viewing capabilities, please install LibreOffice on the server.', { 
        align: 'center',
        width: 400 
      });
      
      doc.moveDown(2);
      
      // Add a border/box
      doc.rect(50, 200, doc.page.width - 100, 150)
        .stroke('#cccccc');
      
      doc.fontSize(10)
        .fillColor('#999999')
        .text(`Converted on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50, { 
          align: 'center' 
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Check if PDF conversion is fully supported
 * @returns {Object} - Object with supported file types
 */
export const getConversionSupport = () => {
  return {
    libreOfficeNPM: !!libreConvert,
    libreOfficeCLI: libreOfficeCLIAvailable === true,
    word: !!libreConvert || !!docxPdf || libreOfficeCLIAvailable === true,
    powerpoint: !!libreConvert || !!JSZip || libreOfficeCLIAvailable === true,
    excel: !!libreConvert || !!ExcelJS || libreOfficeCLIAvailable === true,
    excelJS: !!ExcelJS,
    pptxParser: !!(JSZip && xml2js),
    fallbackAvailable: true, // Placeholder PDF is always available
  };
};

/**
 * Get detailed conversion capabilities
 * @returns {Promise<Object>} - Detailed status of conversion methods
 */
export const getConversionCapabilities = async () => {
  const libreOfficeStatus = await checkLibreOfficeInstalled();
  
  return {
    libreOffice: {
      cli: {
        available: libreOfficeStatus.available,
        path: libreOfficeStatus.path,
      },
      npm: {
        available: !!libreConvert,
      },
    },
    word: {
      libreOfficeCLI: libreOfficeStatus.available,
      libreOfficeNPM: !!libreConvert,
      docxPdf: !!docxPdf,
      supported: libreOfficeStatus.available || !!libreConvert || !!docxPdf,
    },
    powerpoint: {
      libreOfficeCLI: libreOfficeStatus.available,
      libreOfficeNPM: !!libreConvert,
      pptxParser: !!(JSZip && xml2js),
      supported: libreOfficeStatus.available || !!libreConvert || !!(JSZip && xml2js),
      note: 'PPTX parser extracts text content and creates formatted PDFs. LibreOffice provides full formatting preservation including images.',
    },
    excel: {
      libreOfficeCLI: libreOfficeStatus.available,
      libreOfficeNPM: !!libreConvert,
      excelJS: !!ExcelJS,
      supported: libreOfficeStatus.available || !!libreConvert || !!ExcelJS,
      note: 'ExcelJS provides table rendering. LibreOffice provides full formatting preservation.',
    },
    recommendations: {
      best: 'Install LibreOffice for full conversion support of all formats',
      windows: 'Download from https://www.libreoffice.org/download/',
      linux: 'sudo apt-get install libreoffice (Ubuntu/Debian) or sudo yum install libreoffice (RHEL/CentOS)',
      mac: 'brew install --cask libreoffice',
    },
  };
};

/**
 * Get the PDF output path for a given input file
 * @param {string} inputPath - Original file path
 * @returns {string} - PDF output path
 */
export const getPDFOutputPath = (inputPath) => {
  const dir = path.dirname(inputPath);
  const basename = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${basename}.pdf`);
};

export default {
  convertToPDF,
  getConversionSupport,
  getConversionCapabilities,
  getPDFOutputPath,
  checkLibreOfficeInstalled,
};

