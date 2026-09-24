import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown 
} from "lucide-react";

export default function DateTimePicker({
  value,
  onChange,
  className = "",
  placeholder = "Select date & time",
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse value or default to now
  const getParsedDate = (val) => {
    if (!val) return new Date();
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Temp local state committed only on "Save"
  const [tempDate, setTempDate] = useState(() => getParsedDate(value));
  const [navDate, setNavDate] = useState(() => getParsedDate(value));

  // Initialize state when popover opens
  useEffect(() => {
    if (isOpen) {
      const current = getParsedDate(value);
      setTempDate(current);
      setNavDate(current);
    }
  }, [isOpen, value]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const navYear = navDate.getFullYear();
  const navMonth = navDate.getMonth(); // 0-11

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);

  // Navigate month
  const handlePrevMonth = () => {
    setNavDate(new Date(navYear, navMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setNavDate(new Date(navYear, navMonth + 1, 1));
  };

  // Generate calendar days
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => {
    return new Date(y, m, 1).getDay();
  };

  const daysInCurrentMonth = getDaysInMonth(navYear, navMonth);
  const daysInPrevMonth = getDaysInMonth(navYear, navMonth - 1);
  const firstDayIndex = getFirstDayOfMonth(navYear, navMonth); // 0 (Sun) to 6 (Sat)

  const calendarDays = [];

  // Previous month padding days (Sunday-based padding)
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: navMonth - 1,
      year: navMonth === 0 ? navYear - 1 : navYear,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarDays.push({
      day: i,
      month: navMonth,
      year: navYear,
      isCurrentMonth: true
    });
  }

  // Next month padding days to make full 6 weeks grid (42 cells)
  const totalDaysAdded = calendarDays.length;
  const remainingDays = 42 - totalDaysAdded;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      day: i,
      month: navMonth + 1,
      year: navMonth === 11 ? navYear + 1 : navYear,
      isCurrentMonth: false
    });
  }

  // Get selected details from tempDate
  const tempYear = tempDate.getFullYear();
  const tempMonth = tempDate.getMonth();
  const tempDay = tempDate.getDate();
  const tempHours24 = tempDate.getHours();
  const tempHours12 = tempHours24 % 12 || 12;
  const tempMinutes = tempDate.getMinutes();
  const tempPeriod = tempHours24 >= 12 ? "PM" : "AM";

  const isToday = (d, m, y) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;
  };

  const isTempSelected = (d, m, y) => {
    return tempDay === d && tempMonth === m && tempYear === y;
  };

  // Update date portion of tempDate
  const handleDaySelect = (d, m, y) => {
    const next = new Date(tempDate);
    next.setFullYear(y);
    next.setMonth(m);
    next.setDate(d);
    setTempDate(next);
  };

  // Update time portion of tempDate
  const handleTimeChange = (h12, min, period) => {
    const next = new Date(tempDate);
    let hr = h12 !== null ? h12 : tempHours12;
    const p = period !== null ? period : tempPeriod;
    const m = min !== null ? min : tempMinutes;

    if (p === "PM" && hr < 12) hr += 12;
    if (p === "AM" && hr === 12) hr = 0;

    next.setHours(hr, m, 0, 0);
    setTempDate(next);
  };

  // Commit on Save
  const handleSave = () => {
    const y = tempDate.getFullYear();
    const m = String(tempDate.getMonth() + 1).padStart(2, "0");
    const d = String(tempDate.getDate()).padStart(2, "0");
    const hr = String(tempDate.getHours()).padStart(2, "0");
    const min = String(tempDate.getMinutes()).padStart(2, "0");
    
    const formatted = `${y}-${m}-${d}T${hr}:${min}`;
    onChange(formatted);
    setIsOpen(false);
  };

  // Format current committed value for display
  const getFormattedDisplayValue = () => {
    if (!value) return "";
    const current = getParsedDate(value);
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return current.toLocaleString('en-US', options);
  };

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      {/* Trigger Input Area */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 h-10 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer select-none transition-all hover:border-slate-300 ${isOpen ? "border-[var(--teal,#08838d)] ring-2 ring-[rgba(8,131,141,0.15)]" : ""} ${disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""} ${className}`}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {getFormattedDisplayValue() || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </div>

      {/* DatePicker Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-11 z-50 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-slate-800 w-[470px]">
          
          {/* Side-by-Side row containing Date (left) and Time (right) */}
          <div className="flex flex-row gap-4">
            
            {/* Left Panel: Date Picker */}
            <div className="flex-1">
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3 text-[var(--teal-dark,#065b62)] font-bold text-sm">
                <CalendarIcon className="w-4 h-4" />
                <span>Date</span>
              </div>

              {/* Month/Year selector dropdowns and navigation arrows */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Month Select */}
                  <div className="relative">
                    <select
                      value={months[navMonth]}
                      onChange={(e) => setNavDate(new Date(navYear, months.indexOf(e.target.value), 1))}
                      className="appearance-none pl-2.5 pr-7 h-8 border border-slate-200 rounded-lg text-xs bg-white font-semibold text-slate-700 focus:border-[var(--teal,#08838d)] focus:ring-0 outline-none cursor-pointer"
                    >
                      {months.map(mName => (
                        <option key={mName} value={mName}>{mName.substring(0, 3)}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Year Select */}
                  <div className="relative">
                    <select
                      value={navYear}
                      onChange={(e) => setNavDate(new Date(parseInt(e.target.value), navMonth, 1))}
                      className="appearance-none pl-2.5 pr-7 h-8 border border-slate-200 rounded-lg text-xs bg-white font-semibold text-slate-700 focus:border-[var(--teal,#08838d)] focus:ring-0 outline-none cursor-pointer"
                    >
                      {years.map(yNum => (
                        <option key={yNum} value={yNum}>{yNum}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={handlePrevMonth} 
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    type="button" 
                    onClick={handleNextMonth} 
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Day Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {calendarDays.map((item, idx) => {
                  const active = isTempSelected(item.day, item.month, item.year);
                  const current = isToday(item.day, item.month, item.year);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDaySelect(item.day, item.month, item.year)}
                      className={`h-7 w-7 flex items-center justify-center rounded-full font-medium transition-all cursor-pointer text-xs ${
                        active 
                          ? "bg-[var(--teal-dark,#065b62)] text-white font-bold" 
                          : current
                          ? "border border-[var(--teal,#08838d)] text-[var(--teal-dark,#065b62)] font-bold"
                          : item.isCurrentMonth
                          ? "text-slate-700 hover:bg-slate-100" 
                          : "text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="border-l border-slate-100 my-1"></div>

            {/* Right Panel: Time Picker */}
            <div className="w-[160px] shrink-0">
              {/* Time Header */}
              <div className="flex items-center gap-2 mb-3 text-[var(--teal-dark,#065b62)] font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>Time</span>
              </div>

              {/* Time Picker Selectors Stacked Vertically */}
              <div className="space-y-3">
                {/* Hours Select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Hours</label>
                  <div className="relative">
                    <select
                      value={tempHours12}
                      onChange={(e) => handleTimeChange(parseInt(e.target.value), null, null)}
                      className="w-full appearance-none pl-2.5 pr-7 h-9 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-700 focus:border-[var(--teal,#08838d)] outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Minutes Select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Minutes</label>
                  <div className="relative">
                    <select
                      value={tempMinutes}
                      onChange={(e) => handleTimeChange(null, parseInt(e.target.value), null)}
                      className="w-full appearance-none pl-2.5 pr-7 h-9 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-700 focus:border-[var(--teal,#08838d)] outline-none cursor-pointer"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map(m => (
                        <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Period Select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Period</label>
                  <div className="relative">
                    <select
                      value={tempPeriod}
                      onChange={(e) => handleTimeChange(null, null, e.target.value)}
                      className="w-full appearance-none pl-2.5 pr-7 h-9 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-700 focus:border-[var(--teal,#08838d)] outline-none cursor-pointer"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Divider between columns and actions */}
          <hr className="border-t border-slate-100 my-3" />

          {/* Cancel & Save Action Buttons */}
          <div className="flex justify-end gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--teal-dark,#065b62)] text-white rounded-lg hover:bg-[var(--teal,#08838d)] transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
