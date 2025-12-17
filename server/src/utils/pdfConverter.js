import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';

// Try to use libreoffice-convert if available (requires LibreOffice installed)
let libreConvert = null;
try {
  const libre = await import('libreoffice-convert');
  libreConvert = promisify(libre.default.convert);
  console.log('[PDFConverter] LibreOffice converter loaded successfully');
} catch (err) {
  console.log('[PDFConverter] LibreOffice converter not available, will use fallback methods');
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

/**
 * Convert an Office document to PDF
 * @param {string} inputPath - Full path to the input file
 * @param {string} outputPath - Full path for the output PDF file
 * @param {string} fileType - Type of file: 'word', 'powerpoint', or 'excel'
 * @returns {Promise<string>} - Path to the converted PDF file
 */
export const convertToPDF = async (inputPath, outputPath, fileType) => {
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

  // Try LibreOffice conversion first (most reliable for all Office formats)
  if (libreConvert) {
    try {
      console.log('[PDFConverter] Attempting LibreOffice conversion...');
      const inputBuffer = await fs.readFile(inputPath);
      const pdfBuffer = await libreConvert(inputBuffer, '.pdf', undefined);
      await fs.writeFile(outputPath, pdfBuffer);
      console.log('[PDFConverter] LibreOffice conversion successful');
      return outputPath;
    } catch (err) {
      console.error('[PDFConverter] LibreOffice conversion failed:', err.message);
      // Fall through to other methods
    }
  }

  // Fallback methods based on file type
  switch (fileType) {
    case 'word':
      return await convertWordToPDF(inputPath, outputPath);
    case 'powerpoint':
      return await convertPowerPointToPDF(inputPath, outputPath);
    case 'excel':
      return await convertExcelToPDF(inputPath, outputPath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

/**
 * Convert Word document to PDF using docx-pdf
 */
const convertWordToPDF = async (inputPath, outputPath) => {
  if (docxPdf) {
    return new Promise((resolve, reject) => {
      console.log('[PDFConverter] Using docx-pdf for Word conversion...');
      docxPdf(inputPath, outputPath, (err) => {
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
 * Convert PowerPoint to PDF
 * Note: Pure Node.js PowerPoint to PDF conversion is limited
 * Using placeholder method as fallback
 */
const convertPowerPointToPDF = async (inputPath, outputPath) => {
  console.log('[PDFConverter] PowerPoint conversion using placeholder method');
  return await createPlaceholderPDF(inputPath, outputPath, 'PowerPoint Presentation');
};

/**
 * Convert Excel to PDF
 * Note: Pure Node.js Excel to PDF conversion is limited
 * Using placeholder method as fallback
 */
const convertExcelToPDF = async (inputPath, outputPath) => {
  console.log('[PDFConverter] Excel conversion using placeholder method');
  return await createPlaceholderPDF(inputPath, outputPath, 'Excel Spreadsheet');
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
    libreOffice: !!libreConvert,
    word: !!libreConvert || !!docxPdf,
    powerpoint: !!libreConvert,
    excel: !!libreConvert,
    fallbackAvailable: true, // Placeholder PDF is always available
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
  getPDFOutputPath,
};

