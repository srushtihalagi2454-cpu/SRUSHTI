import React, { useMemo, useState } from 'react';
import { Clock, AlertCircle, Sparkles, Edit3, Sliders, Check } from 'lucide-react';
import {
  parseTimeToMinutes,
  minutesTo12Hour,
  calculateReservationDuration,
  validateReservationTimeRange,
} from '../utils/timeRangeUtils';

interface TimeRangePickerProps {
  timeIn: string;
  timeOut: string;
  onChangeTimeIn: (newTimeIn: string) => void;
  onChangeTimeOut: (newTimeOut: string) => void;
  openingHours?: string;
  restaurantOpeningHours?: string;
  className?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

interface Parsed12Time {
  hour: number | '';
  minute: string;
  period: 'AM' | 'PM' | '';
}

function parse12Time(timeStr: string): Parsed12Time {
  const clean = (timeStr || '').replace(/IST/i, '').trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    return {
      hour: parseInt(match[1], 10),
      minute: match[2],
      period: match[3].toUpperCase() as 'AM' | 'PM',
    };
  }

  // Also support 24-hour "HH:MM" e.g. "19:30"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const period = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return {
      hour: h,
      minute: m,
      period,
    };
  }

  // Return empty structure when no time is entered yet
  return {
    hour: '',
    minute: '',
    period: '',
  };
}

function assembleTime(hour: number | string, minute: string, period: 'AM' | 'PM' | string): string {
  if (!hour || !period) return '';
  const padMinute = (minute || '00').padStart(2, '0');
  return `${hour}:${padMinute} ${period}`;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  timeIn,
  timeOut,
  onChangeTimeIn,
  onChangeTimeOut,
  openingHours,
  restaurantOpeningHours,
  className = '',
}) => {
  const effectiveOpeningHours = restaurantOpeningHours || openingHours;
  const [manualTimeInText, setManualTimeInText] = useState(timeIn || '');
  const [manualTimeOutText, setManualTimeOutText] = useState(timeOut || '');
  const [showHelperPicker, setShowHelperPicker] = useState(false);

  // Sync internal state with props if props change from outside
  React.useEffect(() => {
    setManualTimeInText(timeIn || '');
  }, [timeIn]);

  React.useEffect(() => {
    setManualTimeOutText(timeOut || '');
  }, [timeOut]);

  const parsedIn = useMemo(() => parse12Time(timeIn), [timeIn]);
  const parsedOut = useMemo(() => parse12Time(timeOut), [timeOut]);

  // Duration calculation
  const durationResult = useMemo(() => {
    return calculateReservationDuration(timeIn, timeOut);
  }, [timeIn, timeOut]);

  // Operational hours validation
  const validationResult = useMemo(() => {
    if (!effectiveOpeningHours || !timeIn || !timeOut) return { isValid: true };
    return validateReservationTimeRange(timeIn, timeOut, effectiveOpeningHours);
  }, [timeIn, timeOut, effectiveOpeningHours]);

  const handleUpdateIn = (field: 'hour' | 'minute' | 'period', val: string | number) => {
    const current = parse12Time(timeIn || '07:00 PM');
    const updated = {
      hour: field === 'hour' ? val : (current.hour || 7),
      minute: field === 'minute' ? String(val) : (current.minute || '00'),
      period: field === 'period' ? (val as 'AM' | 'PM') : (current.period || 'PM'),
    };
    const newTime = assembleTime(Number(updated.hour), String(updated.minute), updated.period);
    onChangeTimeIn(newTime);
    setManualTimeInText(newTime);
  };

  const handleUpdateOut = (field: 'hour' | 'minute' | 'period', val: string | number) => {
    const current = parse12Time(timeOut || '08:30 PM');
    const updated = {
      hour: field === 'hour' ? val : (current.hour || 8),
      minute: field === 'minute' ? String(val) : (current.minute || '30'),
      period: field === 'period' ? (val as 'AM' | 'PM') : (current.period || 'PM'),
    };
    const newTime = assembleTime(Number(updated.hour), String(updated.minute), updated.period);
    onChangeTimeOut(newTime);
    setManualTimeOutText(newTime);
  };

  const handleManualInChange = (val: string) => {
    setManualTimeInText(val);
    onChangeTimeIn(val.trim());
  };

  const handleManualOutChange = (val: string) => {
    setManualTimeOutText(val);
    onChangeTimeOut(val.trim());
  };

  const handleManualInBlur = () => {
    if (manualTimeInText.trim()) {
      const parsed = parse12Time(manualTimeInText);
      if (parsed.hour && parsed.period) {
        const normalized = assembleTime(parsed.hour, parsed.minute, parsed.period);
        onChangeTimeIn(normalized);
        setManualTimeInText(normalized);
      }
    }
  };

  const handleManualOutBlur = () => {
    if (manualTimeOutText.trim()) {
      const parsed = parse12Time(manualTimeOutText);
      if (parsed.hour && parsed.period) {
        const normalized = assembleTime(parsed.hour, parsed.minute, parsed.period);
        onChangeTimeOut(normalized);
        setManualTimeOutText(normalized);
      }
    }
  };
  return (
    <div className={`space-y-4 ${className}`} id="time-in-out-picker-container">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#4F6F52]" />
          <div>
            <span className="text-xs font-bold text-[#2C3333] uppercase tracking-wider block">
              Customer Time In & Time Out
            </span>
            <span className="text-[10px] text-[#2C3333]/60">
              Please manually enter your preferred arrival and departure times (mandatory)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelperPicker(!showHelperPicker)}
            className="px-2.5 py-1 text-[11px] font-semibold text-[#4F6F52] hover:text-[#3D5A40] bg-[#4F6F5214] hover:bg-[#4F6F52]/20 border border-[#4F6F52]/30 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            <span>{showHelperPicker ? 'Hide Time Wheel' : 'Time Wheel Helper'}</span>
          </button>

          {/* Duration Badge */}
          {timeIn && timeOut && durationResult.isValid ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F6F5214] text-[#4F6F52] border border-[#4F6F52]/30 text-xs font-bold shadow-xs animate-in fade-in"
              id="computed-reservation-duration"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Duration: {durationResult.durationFormatted}</span>
            </div>
          ) : timeIn && timeOut && !durationResult.isValid ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span>Time Out must be after Time In</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* TWO MANDATORY EMPTY INPUT FIELDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* FIELD 1: ENTER YOUR TIME IN */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] hover:border-[#4F6F52]/60 transition-all shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="enter-time-in" className="text-xs font-bold text-[#2C3333] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Enter Your Time In <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Arrival
            </span>
          </div>

          <div className="relative">
            <input
              id="enter-time-in"
              type="text"
              value={manualTimeInText}
              onChange={(e) => handleManualInChange(e.target.value)}
              onBlur={handleManualInBlur}
              placeholder="e.g. 07:30 PM or 19:30"
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold font-mono text-[#2C3333] bg-[#FAF9F6] border rounded-xl outline-none transition-colors ${
                !timeIn.trim()
                  ? 'border-amber-300 focus:border-[#4F6F52] placeholder:text-stone-400'
                  : 'border-[#E8E6E1] focus:border-[#4F6F52]'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#2C3333]/60 pt-0.5">
            <span>Format: "07:30 PM", "7:45 PM", or "19:30"</span>
            {!timeIn.trim() && (
              <span className="text-amber-700 font-medium">Required field</span>
            )}
          </div>
        </div>

        {/* FIELD 2: ENTER YOUR TIME OUT */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] hover:border-[#4F6F52]/60 transition-all shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="enter-time-out" className="text-xs font-bold text-[#2C3333] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Enter Your Time Out <span className="text-rose-500 font-bold">*</span>
            </label>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Departure
            </span>
          </div>

          <div className="relative">
            <input
              id="enter-time-out"
              type="text"
              value={manualTimeOutText}
              onChange={(e) => handleManualOutChange(e.target.value)}
              onBlur={handleManualOutBlur}
              placeholder="e.g. 09:15 PM or 21:15"
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold font-mono text-[#2C3333] bg-[#FAF9F6] border rounded-xl outline-none transition-colors ${
                !timeOut.trim()
                  ? 'border-amber-300 focus:border-[#4F6F52] placeholder:text-stone-400'
                  : 'border-[#E8E6E1] focus:border-[#4F6F52]'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#2C3333]/60 pt-0.5">
            <span>Must be later than Time In</span>
            {!timeOut.trim() && (
              <span className="text-amber-700 font-medium">Required field</span>
            )}
          </div>
        </div>
      </div>

      {/* OPTIONAL TIME WHEEL HELPER (Expandable for touch or dial picking) */}
      {showHelperPicker && (
        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2C3333] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#4F6F52]" />
              Interactive Time Selector Helper
            </span>
            <span className="text-[10px] text-stone-500">
              Click wheels to populate fields
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Helper In */}
            <div className="p-3 bg-white rounded-xl border border-[#E8E6E1] space-y-1.5">
              <span className="text-[11px] font-bold text-stone-600 block">Pick Time In:</span>
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Helper Time In Hour"
                  value={parsedIn.hour || 7}
                  onChange={(e) => handleUpdateIn('hour', Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-xs font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg"
                >
                  {HOURS.map((h) => (
                    <option key={`h-in-${h}`} value={h}>{h}</option>
                  ))}
                </select>
                <span className="font-bold text-stone-400">:</span>
                <select
                  aria-label="Helper Time In Minute"
                  value={parsedIn.minute || '00'}
                  onChange={(e) => handleUpdateIn('minute', e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg"
                >
                  {MINUTES.map((m) => (
                    <option key={`m-in-${m}`} value={m}>{m}</option>
                  ))}
                </select>
                <div className="flex items-center bg-[#FAF9F6] p-0.5 rounded-lg border border-[#E8E6E1]">
                  <button
                    type="button"
                    onClick={() => handleUpdateIn('period', 'AM')}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${parsedIn.period === 'AM' ? 'bg-[#4F6F52] text-white' : 'text-stone-600'}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateIn('period', 'PM')}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${parsedIn.period === 'PM' || !parsedIn.period ? 'bg-[#4F6F52] text-white' : 'text-stone-600'}`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Helper Out */}
            <div className="p-3 bg-white rounded-xl border border-[#E8E6E1] space-y-1.5">
              <span className="text-[11px] font-bold text-stone-600 block">Pick Time Out:</span>
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Helper Time Out Hour"
                  value={parsedOut.hour || 8}
                  onChange={(e) => handleUpdateOut('hour', Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-xs font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg"
                >
                  {HOURS.map((h) => (
                    <option key={`h-out-${h}`} value={h}>{h}</option>
                  ))}
                </select>
                <span className="font-bold text-stone-400">:</span>
                <select
                  aria-label="Helper Time Out Minute"
                  value={parsedOut.minute || '30'}
                  onChange={(e) => handleUpdateOut('minute', e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg"
                >
                  {MINUTES.map((m) => (
                    <option key={`m-out-${m}`} value={m}>{m}</option>
                  ))}
                </select>
                <div className="flex items-center bg-[#FAF9F6] p-0.5 rounded-lg border border-[#E8E6E1]">
                  <button
                    type="button"
                    onClick={() => handleUpdateOut('period', 'AM')}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${parsedOut.period === 'AM' ? 'bg-[#4F6F52] text-white' : 'text-stone-600'}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateOut('period', 'PM')}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${parsedOut.period === 'PM' || !parsedOut.period ? 'bg-[#4F6F52] text-white' : 'text-stone-600'}`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Instruction Warning when either is empty */}
      {(!timeIn.trim() || !timeOut.trim()) && (
        <div
          className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 animate-in fade-in"
          id="time-mandatory-hint"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Please manually enter both <strong>Time In</strong> and <strong>Time Out</strong>. Flash Table does not auto-assign times.
          </span>
        </div>
      )}

      {/* Validation warning banners */}
      {!durationResult.isValid && durationResult.error && (
        <div
          className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800 animate-in fade-in"
          id="time-validation-error-duration"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold">{durationResult.error}</span>
        </div>
      )}

      {durationResult.isValid && !validationResult.isValid && validationResult.error && (
        <div
          className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 animate-in fade-in"
          id="time-validation-error-hours"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="font-semibold">{validationResult.error}</span>
        </div>
      )}

      {/* Operating Hours Reference Note */}
      {effectiveOpeningHours && (
        <div className="flex items-center justify-between text-[11px] text-[#2C3333]/60 pt-1">
          <span className="flex items-center gap-1.5">
            <span>Operating hours:</span>
            <span className="font-semibold text-[#2C3333]">
              {effectiveOpeningHours.replace(/IST/g, '').trim()} IST
            </span>
          </span>
          <span className="text-[10px] text-[#4F6F52] font-semibold">
            ✓ Overlap checked in real time
          </span>
        </div>
      )}
    </div>
  );
};
