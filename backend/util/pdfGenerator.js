import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return `${dateStr} ${timeStr || ''}`.trim();
        const formattedDate = new Intl.DateTimeFormat('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(d);
        
        let formattedTime = '';
        if (timeStr) {
            const timeParts = timeStr.split(':');
            if (timeParts.length >= 2) {
                let h = parseInt(timeParts[0], 10);
                let m = parseInt(timeParts[1], 10);
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12;
                h = h ? h : 12;
                const hh = h.toString().padStart(2, '0');
                const mm = m.toString().padStart(2, '0');
                formattedTime = `${hh}:${mm} ${ampm}`;
            } else {
                formattedTime = timeStr;
            }
        }
        return `${formattedDate}${formattedTime ? ', ' + formattedTime : ''}`;
    } catch (e) {
        return `${dateStr} ${timeStr || ''}`.trim();
    }
};

export const generateInvoicePdfBuffer = async (invoice) => {
    try {
        invoice.formattedCheckIn = formatDateTime(invoice.staySummary.bookedCheckIn, invoice.staySummary.bookedCheckInTime);
        invoice.formattedCheckOut = formatDateTime(invoice.staySummary.actualCheckOutDate || invoice.staySummary.bookedCheckOut, invoice.staySummary.actualCheckOutTime || invoice.staySummary.bookedCheckOutTime);

        // 1. Resolve template path
        const templatePath = path.join(__dirname, '..', 'templates', 'emailInvoiceTemplate.ejs');
        
        // 2. Render HTML using EJS
        const htmlContent = await ejs.renderFile(templatePath, { invoice });

        // 3. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // 4. Set HTML content
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // 5. Generate PDF buffer
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });

        await browser.close();

        // Ensure we return a Buffer (in newer Puppeteer it might be a Uint8Array, Buffer.from handles it)
        return Buffer.from(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Could not generate PDF');
    }
};
