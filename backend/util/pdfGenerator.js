import PDFDocument from 'pdfkit';

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

/**
 * Generates a clean, professional, multi-room aware PDF invoice in memory using pure Node.js (PDFKit).
 * Only used for customer email dispatch.
 */
export const generateInvoicePdfBuffer = (invoice) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                autoFirstPage: true,
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', (err) => {
                reject(err);
            });

            const stay = invoice.staySummary || {};
            const customer = invoice.customer || {};
            const financials = invoice.financials || {};
            const paymentInfo = invoice.paymentInfo || {};
            const hotelName = invoice.dynamicHotelName || 'StayLio';
            const rooms = Array.isArray(invoice.rooms) ? invoice.rooms : [];

            const isMultiRoom = rooms.length > 1;

            // ================= HEADER =================
            doc.fillColor('#0E2A4A')
               .fontSize(22)
               .font('Helvetica-Bold')
               .text(hotelName, 40, 40);

            doc.fillColor('#64748B')
               .fontSize(10)
               .font('Helvetica')
               .text('Hotel Management', 40, 68);

            // Right Header: INVOICE & Meta
            doc.fillColor('#0E2A4A')
               .fontSize(22)
               .font('Helvetica-Bold')
               .text('INVOICE', 350, 40, { align: 'right', width: 205 });

            doc.fillColor('#1E293B')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text(`# ${invoice.invoiceNo || 'N/A'}`, 350, 66, { align: 'right', width: 205 });

            doc.fillColor('#64748B')
               .fontSize(9)
               .font('Helvetica')
               .text(`Date: ${invoice.invoiceDate || new Date().toISOString().split('T')[0]}`, 350, 80, { align: 'right', width: 205 });

            // Divider
            doc.strokeColor('#0E2A4A')
               .lineWidth(1.5)
               .moveTo(40, 102)
               .lineTo(555, 102)
               .stroke();

            // ================= DETAILS BOXES =================
            const boxY = 116;
            const boxWidth = 248;
            const boxHeight = 108;

            // Box 1: Guest Details Background
            doc.rect(40, boxY, boxWidth, boxHeight)
               .fillAndStroke('#F8FAFC', '#E2E8F0');

            doc.fillColor('#0E2A4A')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('GUEST DETAILS', 52, boxY + 10);

            doc.strokeColor('#E2E8F0')
               .lineWidth(0.8)
               .moveTo(52, boxY + 24)
               .lineTo(52 + boxWidth - 24, boxY + 24)
               .stroke();

            const guestRows = [
                { label: 'Name:', val: customer.customerName || 'Guest' },
                { label: 'Phone:', val: customer.phoneNumber || 'N/A' },
                { label: 'Email:', val: customer.email || 'N/A' },
                { label: 'Address:', val: customer.address || 'N/A' }
            ];

            let gY = boxY + 30;
            guestRows.forEach(row => {
                doc.fontSize(8.5)
                   .font('Helvetica-Bold')
                   .fillColor('#64748B')
                   .text(row.label, 52, gY, { width: 52 });

                doc.font('Helvetica')
                   .fillColor('#0F172A')
                   .text(row.val, 106, gY, { width: 172, height: 16, ellipsis: true });

                gY += 18;
            });

            // Box 2: Stay Summary Background
            const box2X = 307;
            doc.rect(box2X, boxY, boxWidth, boxHeight)
               .fillAndStroke('#F8FAFC', '#E2E8F0');

            doc.fillColor('#0E2A4A')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('STAY SUMMARY', box2X + 12, boxY + 10);

            doc.strokeColor('#E2E8F0')
               .lineWidth(0.8)
               .moveTo(box2X + 12, boxY + 24)
               .lineTo(box2X + boxWidth - 24, boxY + 24)
               .stroke();

            const overallCheckIn = formatDateTime(stay.bookedCheckIn, stay.bookedCheckInTime);
            const overallCheckOut = formatDateTime(stay.actualCheckOutDate || stay.bookedCheckOut, stay.actualCheckOutTime || stay.bookedCheckOutTime);
            const roomNumbersStr = rooms.length ? rooms.map(r => r.roomNumber).join(', ') : 'N/A';

            const stayRows = [
                { label: 'Check-In:', val: overallCheckIn },
                { label: 'Check-Out:', val: overallCheckOut },
                { label: 'Total Nights:', val: `${stay.totalNightsStayed || 1} Night(s)` },
                { label: 'Total Rooms:', val: `${rooms.length || 1} Room(s) (${roomNumbersStr})` }
            ];

            let sY = boxY + 30;
            stayRows.forEach(row => {
                doc.fontSize(8.5)
                   .font('Helvetica-Bold')
                   .fillColor('#64748B')
                   .text(row.label, box2X + 12, sY, { width: 68 });

                doc.font('Helvetica')
                   .fillColor('#0F172A')
                   .text(row.val, box2X + 82, sY, { width: 158, height: 16, ellipsis: true });

                sY += 18;
            });

            let currentY = boxY + boxHeight + 16;

            // ================= MULTI-ROOM BREAKDOWN SECTION =================
            // If multiple rooms are booked, show an itemized room-by-room detail block
            if (isMultiRoom) {
                doc.fillColor('#0E2A4A')
                   .fontSize(10.5)
                   .font('Helvetica-Bold')
                   .text('ROOM DETAILS & SCHEDULE', 40, currentY);

                currentY += 18;

                // Sub-table header
                doc.rect(40, currentY, 515, 20)
                   .fill('#E2E8F0');

                doc.fillColor('#0E2A4A')
                   .fontSize(8)
                   .font('Helvetica-Bold')
                   .text('ROOM', 48, currentY + 6)
                   .text('TYPE / BED', 115, currentY + 6)
                   .text('CHECK-IN DATE & TIME', 230, currentY + 6)
                   .text('CHECK-OUT DATE & TIME', 365, currentY + 6)
                   .text('RENT (INR)', 470, currentY + 6, { width: 80, align: 'right' });

                currentY += 20;

                rooms.forEach((r, idx) => {
                    const rCheckIn = formatDateTime(r.checkIn || stay.bookedCheckIn, r.checkInTime || stay.bookedCheckInTime);
                    const rCheckOut = formatDateTime(r.actualCheckoutDate || r.checkOut || stay.actualCheckOutDate || stay.bookedCheckOut, r.actualCheckoutTime || r.checkOutTime || stay.actualCheckOutTime || stay.bookedCheckOutTime);
                    const typeBed = [r.roomType, r.bedType].filter(Boolean).join(' • ') || 'Standard';
                    const rent = Number(r.roomRent ?? r.perNightRoomPrice ?? 0);

                    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                    doc.rect(40, currentY, 515, 20).fill(bg);

                    doc.fillColor('#0E2A4A')
                       .fontSize(8)
                       .font('Helvetica-Bold')
                       .text(`Room ${r.roomNumber || '-'}`, 48, currentY + 6);

                    doc.fillColor('#475569')
                       .fontSize(8)
                       .font('Helvetica')
                       .text(typeBed, 115, currentY + 6, { width: 110, ellipsis: true })
                       .text(rCheckIn, 230, currentY + 6, { width: 130, ellipsis: true })
                       .text(rCheckOut, 365, currentY + 6, { width: 130, ellipsis: true });

                    doc.fillColor('#0F172A')
                       .font('Helvetica-Bold')
                       .text(rent.toFixed(2), 470, currentY + 6, { width: 80, align: 'right' });

                    doc.strokeColor('#E2E8F0')
                       .lineWidth(0.5)
                       .moveTo(40, currentY + 20)
                       .lineTo(555, currentY + 20)
                       .stroke();

                    currentY += 20;
                });

                currentY += 14;
            }

            // ================= INVOICE BILLING BREAKDOWN TABLE =================
            const tableTop = currentY;

            // Table Header Bar
            doc.rect(40, tableTop, 515, 23)
               .fill('#0E2A4A');

            doc.fillColor('#FFFFFF')
               .fontSize(9)
               .font('Helvetica-Bold')
               .text('DESCRIPTION', 52, tableTop + 7)
               .text('AMOUNT (INR)', 415, tableTop + 7, { width: 125, align: 'right' });

            // Table Rows
            const items = [];

            if (isMultiRoom) {
                // If multiple rooms, list each room's rent separately with its own details
                rooms.forEach(r => {
                    const rCheckIn = formatDateTime(r.checkIn || stay.bookedCheckIn, r.checkInTime || stay.bookedCheckInTime);
                    const rCheckOut = formatDateTime(r.actualCheckoutDate || r.checkOut || stay.actualCheckOutDate || stay.bookedCheckOut, r.actualCheckoutTime || r.checkOutTime || stay.actualCheckOutTime || stay.bookedCheckOutTime);
                    const rent = Number(r.roomRent ?? r.perNightRoomPrice ?? 0);
                    const type = r.roomType ? ` (${r.roomType})` : '';

                    items.push({
                        desc: `Room Rent - Room ${r.roomNumber}${type} [${rCheckIn} to ${rCheckOut}]`,
                        amount: rent,
                    });
                });
            } else {
                // Single room entry
                const singleRoom = rooms[0];
                const type = singleRoom?.roomType ? ` (${singleRoom.roomType})` : '';
                items.push({
                    desc: singleRoom ? `Room Rent - Room ${singleRoom.roomNumber}${type}` : 'Room Rent',
                    amount: Number(financials.roomRent || 0),
                });
            }

            if (Number(financials.totalExtraStayCharges || 0) > 0) {
                items.push({ desc: 'Extra Stay Charges', amount: Number(financials.totalExtraStayCharges) });
            }
            if (Number(financials.foodServices || 0) > 0) {
                items.push({ desc: 'Food Services', amount: Number(financials.foodServices) });
            }
            if (Number(financials.roomServices || 0) > 0) {
                items.push({ desc: 'Room Services', amount: Number(financials.roomServices) });
            }

            let rowY = tableTop + 23;
            items.forEach((item, idx) => {
                const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                doc.rect(40, rowY, 515, 22).fill(bg);

                doc.fillColor('#334155')
                   .fontSize(8.5)
                   .font('Helvetica')
                   .text(item.desc, 52, rowY + 6, { width: 350, ellipsis: true });

                doc.fillColor('#0F172A')
                   .fontSize(8.5)
                   .font('Helvetica-Bold')
                   .text(item.amount.toFixed(2), 415, rowY + 6, { width: 125, align: 'right' });

                doc.strokeColor('#E2E8F0')
                   .lineWidth(0.5)
                   .moveTo(40, rowY + 22)
                   .lineTo(555, rowY + 22)
                   .stroke();

                rowY += 22;
            });

            // ================= TOTALS SECTION =================
            let totalsY = rowY + 14;
            const totalsX = 315;
            const totalsWidth = 240;

            const addTotalLine = (label, value, isBold = false, isHighlight = false) => {
                doc.fontSize(isBold ? 10.5 : 9)
                   .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                   .fillColor(isHighlight ? '#0E2A4A' : '#475569')
                   .text(label, totalsX, totalsY);

                doc.fillColor(isHighlight ? '#0E2A4A' : '#0F172A')
                   .text(value, totalsX, totalsY, { width: totalsWidth, align: 'right' });

                totalsY += isBold ? 20 : 16;
            };

            addTotalLine('Subtotal:', Number(financials.subTotal || 0).toFixed(2));
            addTotalLine(`GST (${financials.gstPercentage || 0}%):`, Number(financials.gstAmount || 0).toFixed(2));

            // Grand Total Divider
            doc.strokeColor('#0E2A4A')
               .lineWidth(1.2)
               .moveTo(totalsX, totalsY)
               .lineTo(totalsX + totalsWidth, totalsY)
               .stroke();
            totalsY += 6;

            addTotalLine('Grand Total:', `INR ${Number(financials.grandTotal || 0).toFixed(2)}`, true, true);

            // Payments info
            doc.strokeColor('#CBD5E1')
               .lineWidth(0.5)
               .dash(3, { space: 3 })
               .moveTo(totalsX, totalsY)
               .lineTo(totalsX + totalsWidth, totalsY)
               .stroke();
            doc.undash();
            totalsY += 6;

            addTotalLine('Advance Paid:', Number(financials.advancePaid || 0).toFixed(2));
            addTotalLine('Current Payment:', Number(financials.currentPayment || 0).toFixed(2));
            addTotalLine('Total Paid:', Number(financials.totalPaid || (financials.advancePaid || 0) + (financials.currentPayment || 0)).toFixed(2), true);

            // ================= FOOTER =================
            const footerY = 730;
            doc.strokeColor('#E2E8F0')
               .lineWidth(0.8)
               .moveTo(40, footerY)
               .lineTo(555, footerY)
               .stroke();

            doc.fillColor('#64748B')
               .fontSize(8.5)
               .font('Helvetica')
               .text(`Thank you for choosing ${hotelName}. We hope you had a wonderful stay!`, 40, footerY + 10, { align: 'center', width: 515 });

            doc.fillColor('#94A3B8')
               .fontSize(7.5)
               .text('If you have any questions about this invoice, please contact hotel support.', 40, footerY + 22, { align: 'center', width: 515 });

            doc.fillColor('#0E2A4A')
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text(`Status: ${(paymentInfo.paymentStatus || 'PAID').toUpperCase()}`, 40, footerY + 36, { align: 'center', width: 515 });

            // End document
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
