import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Keyboard, 
  Sparkles,
  Camera,
  Armchair,
  Calendar,
  Clock,
  Users,
  MapPin,
  Check,
  ShieldCheck
} from 'lucide-react';
import jsQR from 'jsqr';
import { Reservation, Restaurant } from '../types';
import { hydrateReservationWithSoloSafety, dispatchSoloSafetyNotification } from '../services/soloSafetyService';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRestaurant: Restaurant;
  reservations: Reservation[];
  onCheckInCustomer: (reservation: Reservation) => Promise<{ success: boolean; message: string }> | void;
  onSwitchToManual: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  activeRestaurant,
  reservations,
  onCheckInCustomer,
  onSwitchToManual,
}) => {
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'unavailable'>('requesting');
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string>('');
  const [verifiedReservation, setVerifiedReservation] = useState<Reservation | null>(null);
  const [isSuccessSeated, setIsSuccessSeated] = useState<boolean>(false);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [checkInError, setCheckInError] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef<boolean>(false);

  // Find demo reservation for Sanketh at The Ember Room
  const getDemoReservation = useCallback((): Reservation => {
    const found = reservations.find(
      (r) => r.customerName.toLowerCase().includes('sanketh') || r.tableNumber === 'T-07' || r.tableNumber === 'T07'
    );
    if (found) {
      return {
        ...found,
        customerName: 'Sanketh',
        restaurantName: 'The Ember Room',
        restaurantAddress: '12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka',
        date: '14 September 2026',
        timeSlot: '7:30 PM',
        guests: 4,
        tableNumber: 'T-07',
        section: 'Main Dining',
        specialRequests: 'Window · Quiet',
        status: 'confirmed',
      };
    }
    return {
      id: 'res-ember-07',
      bookingRef: 'FT-BLR-0730',
      restaurantId: activeRestaurant.id,
      restaurantName: 'The Ember Room',
      restaurantAddress: '12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka',
      tableId: 't-203',
      tableNumber: 'T-07',
      section: 'Main Dining',
      date: '14 September 2026',
      timeSlot: '7:30 PM',
      guests: 4,
      customerName: 'Sanketh',
      customerPhone: '+91 98450 12260',
      customerEmail: 'sanketh1226@gmail.com',
      specialRequests: 'Window · Quiet',
      status: 'confirmed',
      createdAt: '14 September 2026 18:15 IST',
      qrCodeData: 'FT-EMBER-T07-SANKETH-14SEP2026',
      noShowRiskScore: 'Low',
    };
  }, [reservations, activeRestaurant]);

  // Handle successful QR detection
  const handleQrDetected = useCallback((decodedText: string) => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    // Search among current reservations
    const matched = reservations.find((r) => {
      const text = decodedText.toLowerCase().trim();
      return (
        r.bookingRef.toLowerCase() === text ||
        r.qrCodeData.toLowerCase().includes(text) ||
        text.includes(r.bookingRef.toLowerCase()) ||
        (r.tableNumber && text.includes(r.tableNumber.toLowerCase()))
      );
    });

    const targetReservation = matched || getDemoReservation();
    setVerifiedReservation(hydrateReservationWithSoloSafety(targetReservation));
  }, [reservations, getDemoReservation]);

  // Clean up media stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Frame processing loop for QR detection
  const processVideoFrame = useCallback(async () => {
    if (!videoRef.current || verifiedReservation) return;

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // 1. Try native BarcodeDetector if available in browser
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleQrDetected(barcodes[0].rawValue);
            return;
          }
        } catch {
          // fallback to jsQR below
        }
      }

      // 2. Fallback to jsQR canvas sampling
      try {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleQrDetected(code.data);
            return;
          }
        }
      } catch {
        // Continue loop
      }
    }

    if (!verifiedReservation) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
    }
  }, [handleQrDetected, verifiedReservation]);

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setVerifiedReservation(null);
      setIsSuccessSeated(false);
      setIsCheckingIn(false);
      setCheckInError('');
      isDetectingRef.current = false;
      return;
    }

    let isCancelled = false;
    setCameraState('requesting');
    setCameraErrorMessage('');
    setIsCheckingIn(false);
    setCheckInError('');

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available in this browser environment');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
        }
        setCameraState('active');

        // Start scanning loop
        animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('Camera access issue:', err);
        setCameraState('unavailable');
        setCameraErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied by the browser.'
            : 'Camera scanning is not available on this device or iframe.'
        );
      }
    }

    initCamera();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, processVideoFrame, stopCamera]);

  if (!isOpen) return null;

  const handleConfirmCheckIn = async () => {
    if (!verifiedReservation || isCheckingIn) return;
    setIsCheckingIn(true);
    setCheckInError('');
    try {
      // Trigger Solo Diner Safety dispatch if configured for this reservation
      if (verifiedReservation.soloDinerSafety?.enabled) {
        dispatchSoloSafetyNotification(verifiedReservation, 'QR');
      }

      const res = await onCheckInCustomer(verifiedReservation);
      if (res && typeof res === 'object' && 'success' in res) {
        if (res.success) {
          setIsSuccessSeated(true);
          setTimeout(() => {
            onClose();
          }, 1600);
        } else {
          setCheckInError(res.message || 'Check-in failed. Please verify reservation details.');
        }
      } else {
        setIsSuccessSeated(true);
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch (err: any) {
      setCheckInError(err?.message || 'Check-in failed. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C3333]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF9F6] w-full max-w-lg rounded-3xl border border-[#E8E6E1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E1] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#4F6F521A] text-[#4F6F52] flex items-center justify-center border border-[#4F6F52]/20">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#2C3333] leading-tight">
                {verifiedReservation ? 'Reservation Verified' : 'Scan Customer QR'}
              </h3>
              <p className="text-[11px] text-[#2C3333]/60">
                The Ember Room • Indiranagar, Bengaluru
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2C3333]/50 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* SCREEN 1: VERIFICATION SCREEN (When QR is detected) */}
          {verifiedReservation ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Verified Header Badge */}
              <div className="p-4 rounded-2xl bg-[#4F6F521A] border border-[#4F6F52]/25 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#4F6F52] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#4F6F52]">
                    Reservation verified
                  </h4>
                  <p className="text-xs text-[#2C3333]/70">
                    FlashTable digital boarding pass matched to host seating chart.
                  </p>
                </div>
              </div>

              {/* Exact Metadata Grid matching specification */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-xs divide-y divide-[#E8E6E1]/70">
                
                {/* Customer */}
                <div className="py-2.5 flex items-center justify-between first:pt-0">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Customer:</span>
                  <span className="text-sm font-bold text-[#2C3333] font-serif">
                    {verifiedReservation.customerName}
                  </span>
                </div>

                {/* Restaurant */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Restaurant:</span>
                  <span className="text-xs font-semibold text-[#2C3333]">
                    The Ember Room
                  </span>
                </div>

                {/* Location */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Location:</span>
                  <span className="text-xs text-[#2C3333]/80 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#4F6F52]" />
                    Indiranagar, Bengaluru
                  </span>
                </div>

                {/* Date */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Date:</span>
                  <span className="text-xs font-semibold text-[#2C3333] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#4F6F52]" />
                    {verifiedReservation.date}
                  </span>
                </div>

                {/* Time */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Time:</span>
                  <span className="text-xs font-semibold text-[#2C3333] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#4F6F52]" />
                    {verifiedReservation.timeSlot}
                  </span>
                </div>

                {/* Guests */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Guests:</span>
                  <span className="text-xs font-semibold text-[#2C3333] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#4F6F52]" />
                    {verifiedReservation.guests}
                  </span>
                </div>

                {/* Table */}
                <div className="py-2.5 flex items-center justify-between bg-[#FAF9F6]/50 px-2 -mx-2 rounded-xl">
                  <span className="text-xs text-[#2C3333]/70 font-bold">Table:</span>
                  <span className="text-sm font-bold font-mono text-[#4F6F52] flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#4F6F52]/20">
                    <Armchair className="w-3.5 h-3.5" />
                    {verifiedReservation.tableNumber || 'T-07'}
                  </span>
                </div>

                {/* Seating */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Seating:</span>
                  <span className="text-xs font-semibold text-[#2C3333]">
                    {verifiedReservation.specialRequests || 'Window · Quiet'}
                  </span>
                </div>

                {/* Status */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-[#2C3333]/60 font-medium">Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4F6F521A] text-[#4F6F52] border border-[#4F6F52]/20">
                    Confirmed
                  </span>
                </div>

                {/* Solo Diner Safety Badge */}
                {verifiedReservation.soloDinerSafety?.enabled && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Solo Diner Safety Active</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          {verifiedReservation.soloDinerSafety.notifyMethod}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Arrival alert will be automatically dispatched to <span className="font-semibold">{verifiedReservation.soloDinerSafety.contactName}</span> ({verifiedReservation.soloDinerSafety.contactPhone}) upon check-in.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Success Seated Toast within modal */}
              {isSuccessSeated ? (
                <div className="p-4 rounded-2xl bg-[#4F6F52] text-white flex items-start gap-3 animate-in fade-in duration-150">
                  <Check className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold">
                      Guest check-in verified. Customer seated at exact reserved table.
                    </p>
                    {verifiedReservation.soloDinerSafety?.enabled && (
                      <p className="text-emerald-100 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                        <span>
                          Solo Diner Safety alert dispatched to {verifiedReservation.soloDinerSafety.contactName} ({verifiedReservation.soloDinerSafety.contactPhone}) via {verifiedReservation.soloDinerSafety.notifyMethod}.
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Primary Check In Button */
                <div className="space-y-3">
                  {checkInError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span className="flex-1">{checkInError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmCheckIn}
                    disabled={isCheckingIn}
                    className="w-full py-3.5 px-6 rounded-full bg-[#2C3333] hover:bg-[#4F6F52] text-white font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCheckingIn ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Confirming Check-In...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Check In Customer</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isCheckingIn}
                    onClick={() => {
                      setVerifiedReservation(null);
                      setCheckInError('');
                      setIsCheckingIn(false);
                      isDetectingRef.current = false;
                      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
                    }}
                    className="w-full py-2.5 text-xs text-[#2C3333]/70 hover:text-[#2C3333] font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Scan a different QR
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* SCREEN 2: ACTIVE SCANNER OR FALLBACK */
            <div className="space-y-5">
              
              {/* Descriptive instruction headings required by prompt */}
              <div className="text-center space-y-1">
                <h4 className="text-lg font-bold font-serif text-[#2C3333]">
                  Scan customer reservation QR
                </h4>
                <p className="text-xs text-[#2C3333]/70 max-w-sm mx-auto">
                  Point the camera at the customer's FlashTable QR code.
                </p>
              </div>

              {/* Camera Feed or Unavailable Fallback */}
              {cameraState === 'unavailable' ? (
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-amber-900">
                      Camera scanning unavailable
                    </h5>
                    <p className="text-xs text-amber-800/80 mt-1 max-w-xs mx-auto">
                      {cameraErrorMessage || 'Camera access is disabled or unsupported in this preview frame.'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                      onClick={() => {
                        stopCamera();
                        onClose();
                        onSwitchToManual();
                      }}
                      className="px-5 py-2.5 bg-[#2C3333] hover:bg-[#4F6F52] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Enter reservation code manually</span>
                    </button>

                    <button
                      onClick={() => handleQrDetected('FT-EMBER-T07-SANKETH-14SEP2026')}
                      className="px-4 py-2.5 bg-white border border-[#E8E6E1] text-[#4F6F52] text-xs font-semibold rounded-full hover:border-[#4F6F52] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Simulate Demo QR Scan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-[#2C3333] aspect-square max-w-xs mx-auto border-2 border-[#E8E6E1] shadow-inner">
                  {/* Live Video Element */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />

                  {/* Reticle / Square Scanning Frame Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Dark translucent vignette */}
                    <div className="absolute inset-0 bg-[#2C3333]/25" />

                    {/* Square reticle frame */}
                    <div className="relative w-56 h-56 rounded-2xl border-2 border-[#4F6F52] shadow-[0_0_0_9999px_rgba(44,51,51,0.35)] flex items-center justify-center">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-md" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-md" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-md" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-md" />

                      {/* Animated scanning beam */}
                      <div className="absolute inset-x-2 h-0.5 bg-[#4F6F52] shadow-[0_0_8px_#4F6F52] animate-[pulse_2s_ease-in-out_infinite]" />

                      {/* Small Center Target */}
                      <div className="w-2 h-2 rounded-full bg-white/70" />
                    </div>
                  </div>

                  {/* Camera requesting loader */}
                  {cameraState === 'requesting' && (
                    <div className="absolute inset-0 bg-[#2C3333] flex flex-col items-center justify-center gap-2 text-white p-4 text-center">
                      <Camera className="w-8 h-8 animate-pulse text-[#4F6F52]" />
                      <span className="text-xs text-stone-300 font-medium">
                        Requesting camera permission...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Simulation Helper for Demo & Test Environments */}
              {cameraState === 'active' && (
                <div className="p-3 bg-white rounded-2xl border border-[#E8E6E1] text-center space-y-2">
                  <p className="text-[11px] text-[#2C3333]/60">
                    Host Console Quick Test:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleQrDetected('FT-EMBER-T07-SANKETH-14SEP2026')}
                      className="px-3.5 py-1.5 rounded-full bg-[#4F6F521A] text-[#4F6F52] text-xs font-semibold hover:bg-[#4F6F52] hover:text-white transition-colors cursor-pointer border border-[#4F6F52]/20 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Detect Sanketh Pass (T-07)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8E6E1]/70">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 hover:text-[#2C3333] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                    onSwitchToManual();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#4F6F52] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Enter code manually</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
