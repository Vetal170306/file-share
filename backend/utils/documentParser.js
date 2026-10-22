const fs = require('fs')
const path = require('path')
let pdfParse = null
try {
  const pdfModule = require('pdf-parse')
  pdfParse = pdfModule.PDFParse || pdfModule.default || pdfModule
} catch (e) {
  console.warn('pdf-parse import warning:', e.message)
}

/**
 * Extracts plain text from a stored file on disk
 * Supports PDFs, plain text, markdown, CSV, JSON, and source files.
 * Limits extraction size for performance and safety.
 * 
 * @param {string} filePath - Absolute or relative path to file on disk
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{ text: string, pageCount?: number, truncated: boolean, wordCount: number }>}
 */
const extractDocumentText = async (filePath, mimeType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found on disk')
  }

  const MAX_TEXT_LENGTH = 120000 // approx 25k words max
  let extractedText = ''
  let pageCount = 1

  const isPdf = (mimeType && mimeType.includes('pdf')) || filePath.toLowerCase().endsWith('.pdf')
  const isText = 
    (mimeType && (
      mimeType.includes('text') || 
      mimeType.includes('json') || 
      mimeType.includes('javascript') || 
      mimeType.includes('csv') || 
      mimeType.includes('xml')
    )) ||
    ['.txt', '.md', '.json', '.csv', '.log', '.js', '.py', '.html', '.css', '.env', '.sql'].some(ext => filePath.toLowerCase().endsWith(ext))

  if (isPdf) {
    const dataBuffer = fs.readFileSync(filePath)
    const uint8Array = new Uint8Array(dataBuffer)
    let rawText = ''

    try {
      if (typeof pdfParse === 'function' && pdfParse.prototype?.getText) {
        // Class instance style (pdf-parse v2.x)
        const parser = new pdfParse(uint8Array)
        const [textRes, infoRes] = await Promise.allSettled([
          parser.getText(),
          parser.getInfo()
        ])
        const textData = textRes.status === 'fulfilled' ? textRes.value : null
        const infoData = infoRes.status === 'fulfilled' ? infoRes.value : null

        pageCount = infoData?.total || textData?.total || 1
        rawText = textData?.text || ''
      } else if (typeof pdfParse === 'function') {
        // Function style (pdf-parse v1.x)
        const pdfData = await pdfParse(dataBuffer, { max: 50 })
        rawText = pdfData.text || ''
        pageCount = pdfData.numpages || 1
      } else if (pdfParse && typeof pdfParse.PDFParse === 'function') {
        const parser = new pdfParse.PDFParse(uint8Array)
        const textData = await parser.getText()
        rawText = textData?.text || ''
        pageCount = textData?.total || 1
      }
    } catch (parseErr) {
      console.warn('PDF parsing error:', parseErr)
      throw new Error(`Unable to read PDF content: ${parseErr.message}`)
    }

    // Strip delimiter markers like "-- 1 of 17 --" to check for actual textual content
    const textWithoutPageMarkers = rawText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim()
    extractedText = textWithoutPageMarkers.length > 0 ? rawText : ''

    if (!extractedText) {
      const err = new Error('This PDF appears to be a scanned image or photo document without an embedded text layer. Local NLP requires a text-based document or searchable PDF.')
      err.isScannedPdf = true
      err.pageCount = pageCount
      throw err
    }
  } else if (isText) {
    extractedText = fs.readFileSync(filePath, 'utf8')
  } else {
    throw new Error('Unsupported document format for AI analysis. Supported: PDF, TXT, MD, CSV, JSON, DOC text files.')
  }

  // Clean and sanitize text
  extractedText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

  if (!extractedText) {
    throw new Error('The document appears to be empty or contains scanned images without extractable text.')
  }

  const truncated = extractedText.length > MAX_TEXT_LENGTH
  const finalText = truncated ? extractedText.substring(0, MAX_TEXT_LENGTH) : extractedText
  const wordCount = finalText.split(/\s+/).filter(Boolean).length

  return {
    text: finalText,
    pageCount,
    truncated,
    wordCount
  }
}

module.exports = { extractDocumentText }
