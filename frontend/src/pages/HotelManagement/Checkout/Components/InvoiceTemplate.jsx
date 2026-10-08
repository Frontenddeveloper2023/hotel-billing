import React from "react";
import { Printer, CheckCircle, BedDouble, Calendar, User, Phone, Mail, MapPin, Building } from "lucide-react";

export default function InvoiceTemplate({
  stay = {},
  foodOrders = [],
  customServices = [],
  roomSubtotal = 0,
  extraNightAmount = 0,
  gstPercentage = 12,
  gstAmount = 0,
  finalTotal = 0,
  advancePaid = 1000,
  remainingAmount = 0,
  onBack,
  onPrint
}) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const rooms = Array.isArray(stay.selectedRooms) && stay.selectedRooms.length > 0
    ? stay.selectedRooms
    : Array.isArray(stay.rooms) && stay.rooms.length > 0
      ? stay.rooms
      : [
          {
            roomNumber: stay.roomNo || stay.roomNumber || "101",
            roomType: stay.roomType || "Deluxe Suite",
            checkIn: stay.checkIn || "01 Sep 2026, 12:00 PM",
            nights: stay.nights || 1,
            rate: stay.roomRate || stay.rate || stay.pricePerNight || 2500,
            roomSubtotal: roomSubtotal || (Number(stay.nights || 1) * Number(stay.roomRate || stay.rate || stay.pricePerNight || 2500)),
          }
        ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col my-auto border border-slate-200 print:m-0 print:shadow-none print:rounded-none">
        
        {/* Action Header bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            ← Back to Checkout
          </button>
          <div className="text-xs text-slate-400 font-medium">Previewing 5-Star Tax Invoice</div>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 sm:p-12 space-y-8 bg-white text-slate-800 font-sans print:p-6">
          
          {/* Header Row: Hotel Branding & Invoice Meta */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-teal-700">
                <Building className="w-7 h-7" />
                <h1 className="text-2xl font-extrabold tracking-tight uppercase">Grand Stay Hotel & Suites</h1>
              </div>
              <p className="text-xs text-slate-500"> West Tambaram, Chennai - 600045</p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-teal-100 text-teal-900 rounded-lg text-xs font-extrabold tracking-wider uppercase">
                Official Tax Invoice
              </span>
              <p className="text-xs text-slate-500">Date Issued: {new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Guest & Room Details Grid Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Billed To</div>
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <User className="w-4 h-4 text-teal-600" />
                {stay.customerName || "Arun Kumar"}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{stay.address || "123, Anna Nagar, Chennai"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{stay.phone || "9876543210"}</span>
              </div>
            </div>

            <div className="space-y-3 sm:border-l sm:border-slate-200 sm:pl-6">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Stay Summary ({rooms.length} Room{rooms.length !== 1 ? "s" : ""})
              </div>
              <div className="space-y-2">
                {rooms.map((r, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-900 font-bold">
                      <span className="flex items-center gap-1.5 text-xs">
                        <BedDouble className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        Room {r.roomNumber || r.roomNo || idx + 1}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({r.roomType || "Deluxe Suite"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        {r.checkIn || stay.checkIn || "01 Sep 2026, 12:00 PM"}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {r.bookedNights || r.nights || stay.nights || 1} Night{Number(r.bookedNights || r.nights || stay.nights || 1) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Statement of Accounts</h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-bold">Description</th>
                    <th className="py-3 px-4 font-bold text-center">Quantity / Nights</th>
                    <th className="py-3 px-4 font-bold text-right">Unit Price (₹)</th>
                    <th className="py-3 px-4 font-bold text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Room Accommodation */}
                  {rooms.map((r, idx) => {
                    const rNo = r.roomNumber || r.roomNo || `${idx + 1}`;
                    const rType = r.roomType || "Standard AC";
                    const rNights = Number(r.bookedNights || r.nights || stay.nights || 1);
                    const rRate = Number(r.rate || r.pricePerNight || r.roomRate || stay.roomRate || 2500);
                    const rTotal = Number(r.roomSubtotal || r.roomRent || (rNights * rRate));

                    return (
                      <tr key={`room-${idx}`}>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">Room Accommodation (Room #{rNo})</div>
                          <div className="text-[11px] text-slate-400">{rType}{r.bedType ? ` · ${r.bedType}` : ""}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">{rNights} Night{rNights !== 1 ? "s" : ""}</td>
                        <td className="py-3.5 px-4 text-right">₹{rRate}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{rTotal}</td>
                      </tr>
                    );
                  })}

                  {/* Extra Night / Extension Fee if applied */}
                  {extraNightAmount > 0 && (
                    <tr>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">Extra Night / Late Extension Charge</div>
                        <div className="text-[11px] text-slate-400">Custom admin override adjustment</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">1</td>
                      <td className="py-3.5 px-4 text-right">₹{extraNightAmount}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{extraNightAmount}</td>
                    </tr>
                  )}

                  {/* Food Orders */}
                  {foodOrders.map((f, i) => (
                    <tr key={`food-${i}`}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{f.name}</div>
                        <div className="text-[11px] text-slate-400">Dining / Room Service</div>
                      </td>
                      <td className="py-3 px-4 text-center">{f.qty}</td>
                      <td className="py-3 px-4 text-right">₹{f.price}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">₹{f.price * f.qty}</td>
                    </tr>
                  ))}

                  {/* Additional Services */}
                  {customServices.map((s, i) => (
                    <tr key={`service-${i}`}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{s.name}</div>
                        <div className="text-[11px] text-slate-400">Concierge / Add-on Service</div>
                      </td>
                      <td className="py-3 px-4 text-center">1</td>
                      <td className="py-3 px-4 text-right">₹{s.fee}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">₹{s.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations / Financial Summary Box */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-80 space-y-2 text-xs border border-slate-200 bg-slate-50 p-4 rounded-2xl">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Charges:</span>
                <span className="font-semibold text-slate-900">₹{roomSubtotal + extraNightAmount + foodOrders.reduce((a,b)=>a+(b.price*b.qty),0) + customServices.reduce((a,b)=>a+b.fee,0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST ({gstPercentage}%):</span>
                <span className="font-semibold text-slate-900">₹{Number(gstAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total:</span>
                <span className="text-teal-700">₹{Number(finalTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Advance Paid:</span>
                <span>- ₹{advancePaid}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-rose-600 border-t border-dashed border-slate-300 pt-2">
                <span>Balance Due:</span>
                <span>₹{Number(remainingAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature Note */}
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <CheckCircle className="w-4 h-4" />
              Paid via Verified Gateway • Thank you for choosing Grand Stay!
            </div>
            <div className="text-center sm:text-right space-y-4">
              <p className="font-bold text-slate-700">For Grand Stay Hotel & Suites</p>
              <div className="h-8 border-b border-dashed border-slate-300 w-40 mx-auto sm:ml-auto"></div>
              <p className="text-[10px] text-slate-400">Authorized Signatory</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}