/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { FloodReport, Severity } from '../types';
import { 
  FileText, Upload, Check, Printer, AlertCircle, Phone, User, MapPin, 
  ArrowLeft, Compass, Eye, RefreshCw, FileWarning, Globe, X, FileImage, ShieldAlert
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ReportFormProps {
  onSubmitReport: (report: Omit<FloodReport, 'id' | 'date' | 'status'>, photoFile?: File | null) => Promise<string | undefined>;
  onNavigateToMyReports?: () => void;
}

// Bounding box coordinates for the local tactical grid map area
const MIN_LAT = 34.0122;
const MAX_LAT = 34.0922;
const MIN_LNG = -118.2937;
const MAX_LNG = -118.1937;

// Grid center default coordinates
const DEFAULT_LAT = 34.0522;
const DEFAULT_LNG = -118.2437;

export default function ReportForm({ onSubmitReport, onNavigateToMyReports }: ReportFormProps) {
  // Form step state: 'edit' | 'preview'
  const [formStep, setFormStep] = useState<'edit' | 'preview'>('edit');

  // Input states
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number>(DEFAULT_LAT);
  const [longitude, setLongitude] = useState<number>(DEFAULT_LNG);
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [phone, setPhone] = useState('');
  const [waterLevelDepth, setWaterLevelDepth] = useState('15cm');
  
  // Custom depth option trigger
  const [isCustomDepth, setIsCustomDepth] = useState(false);
  const [customDepthVal, setCustomDepthVal] = useState('');

  // Geolocation lookup status
  const [isLocating, setIsLocating] = useState(false);

  // Photo File states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ type: string; size: string } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Confirmation state
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [submittedTimestamp, setSubmittedTimestamp] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isDeclarationChecked, setIsDeclarationChecked] = useState(false);


const fileInputRef = useRef<HTMLInputElement>(null);

  // Map references for Leaflet Integration
  const editMapContainerRef = useRef<HTMLDivElement>(null);
  const editMapRef = useRef<L.Map | null>(null);
  const editMarkerRef = useRef<L.Marker | null>(null);

  const previewMapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapRef = useRef<L.Map | null>(null);

  // Auto clean up local object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (selectedPhoto && selectedPhoto.startsWith('blob:')) {
        URL.revokeObjectURL(selectedPhoto);
      }
    };
  }, [selectedPhoto]);

  // Leaflet Edit Map Lifecycle
  useEffect(() => {
    if (formStep !== 'edit' || !editMapContainerRef.current) return;

    if (!editMapRef.current) {
      const map = L.map(editMapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 13,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      editMapRef.current = map;

      const markerIcon = L.divIcon({
        className: 'custom-input-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="p-2 bg-white rounded-full border border-gray-300 shadow-md flex items-center justify-center" style="width: 32px; height: 32px; background-color: #B23B2E; color: white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <span class="absolute h-8 w-8 rounded-full bg-[#B23B2E]/25 animate-ping -z-10"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([latitude, longitude], {
        icon: markerIcon,
        draggable: true,
      }).addTo(map);

      editMarkerRef.current = marker;

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLatitude(parseFloat(position.lat.toFixed(6)));
        setLongitude(parseFloat(position.lng.toFixed(6)));
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setLatitude(parseFloat(lat.toFixed(6)));
        setLongitude(parseFloat(lng.toFixed(6)));
        marker.setLatLng([lat, lng]);
      });
    } else {
      setTimeout(() => {
        if (editMapRef.current) {
          editMapRef.current.invalidateSize();
        }
      }, 50);
    }
  }, [formStep]);

  // Synchronize coordinate fields with map marker positions
  useEffect(() => {
    const map = editMapRef.current;
    const marker = editMarkerRef.current;
    if (map && marker) {
      const currentMarkerLatLng = marker.getLatLng();
      if (currentMarkerLatLng.lat !== latitude || currentMarkerLatLng.lng !== longitude) {
        marker.setLatLng([latitude, longitude]);
        map.panTo([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // Leaflet Preview Map Lifecycle
  useEffect(() => {
    if (formStep !== 'preview' || !previewMapContainerRef.current) return;

    if (!previewMapRef.current) {
      const map = L.map(previewMapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 14,
        minZoom: 10,
        maxZoom: 18,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      previewMapRef.current = map;

      const markerIcon = L.divIcon({
        className: 'custom-preview-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="p-2 bg-white rounded-full border border-gray-300 shadow-md flex items-center justify-center" style="width: 28px; height: 28px; background-color: #1B4B66; color: white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <span class="absolute h-6 w-6 rounded-full bg-[#1B4B66]/30 animate-ping -z-10"></span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
    } else {
      previewMapRef.current.setView([latitude, longitude], 14);
    }
  }, [formStep, latitude, longitude]);

  // Cleanup map instances on step toggle or unmount
  useEffect(() => {
    if (formStep !== 'edit') {
      if (editMapRef.current) {
        editMapRef.current.remove();
        editMapRef.current = null;
        editMarkerRef.current = null;
      }
    }
    if (formStep !== 'preview') {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
    }
  }, [formStep]);

  useEffect(() => {
    return () => {
      if (editMapRef.current) {
        editMapRef.current.remove();
        editMapRef.current = null;
        editMarkerRef.current = null;
      }
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
    };
  }, []);

  // Retrieve browser GPS location
  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setErrors([]);
    
    if (!navigator.geolocation) {
      setErrors(["Geolocation is not supported by your web browser."]);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);

        if (editMapRef.current) {
          editMapRef.current.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
        }
      },
      (error) => {
        console.error(error);
        setErrors([
          "Unable to query current location. Please click the map to manually position the hazard pin or enter coordinates."
        ]);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  };

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File selection handles
  const handlePhotoSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(["The selected file is not a supported image. Please upload an image file (JPEG, PNG, WEBP, etc.)."]);
      handleRemovePhoto();
      return;
    }

    // Validate size (matches the backend 4 MiB upload limit)
    const MAX_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrors([`The selected image exceeds the maximum allowed size of 4MB (your file is ${formatFileSize(file.size)}).`]);
      handleRemovePhoto();
      return;
    }

    // Clear any previous error about photo upload if successful
    setErrors(prev => prev.filter(err => !err.includes("file") && !err.includes("image") && !err.includes("exceeds") && !err.includes("supported")));

    setPhotoFile(file);
    setPreviewName(file.name);
    setFileMeta({
      type: file.type || 'image/png',
      size: formatFileSize(file.size)
    });

    const objectUrl = URL.createObjectURL(file);
    setSelectedPhoto(objectUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoSelect(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPreviewName(null);
    setFileMeta(null);
    if (selectedPhoto && selectedPhoto.startsWith('blob:')) {
      URL.revokeObjectURL(selectedPhoto);
    }
    setSelectedPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // HTML5 Drag and Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handlePhotoSelect(file);
    }
  };

  // Validate form fields and proceed to step 2 (Preview)
  const handleProceedToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!location.trim()) newErrors.push("Incident location details / address statement is required.");
    if (!description.trim() || description.length < 15) {
      newErrors.push("Please provide a more detailed hazard description (minimum 15 characters).");
    }
    if (!reporterName.trim()) newErrors.push("Filer name is required for formal audit validation.");
    if (!phone.trim()) newErrors.push("Contact callback telephone number is required.");

    // Validate coordinates range
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      newErrors.push("Latitude coordinate must be a valid float between -90 and 90.");
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      newErrors.push("Longitude coordinate must be a valid float between -180 and 180.");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors([]);
    setFormStep('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final formal lodging submission
  const handleFinalSubmit = async () => {
    if (!isDeclarationChecked) {
      setErrors(["You must check the declaration box to authorize this official civic report submission."]);
      return false;
    }

    const now = new Date();
    const timestampStr = `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const resolvedDepth = isCustomDepth ? (customDepthVal || "N/A") : waterLevelDepth;

    // Trigger parent submission (photo file is uploaded to the backend there).
    // The resolution returns the authoritative report ID assigned by the backend.
    const createdId = await onSubmitReport({
      location,
      severity,
      description,
      reporterName,
      phone,
      photoUrl: undefined,
      waterLevelDepth: resolvedDepth || undefined,
      adminNotes: undefined,
      latitude: latitude,
      longitude: longitude
    }, photoFile);

    if (createdId) setSubmittedReportId(createdId);
    setSubmittedTimestamp(timestampStr);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  const handleResetForm = () => {
    setLocation('');
    setLatitude(DEFAULT_LAT);
    setLongitude(DEFAULT_LNG);
    setSeverity('medium');
    setDescription('');
    setReporterName('');
    setPhone('');
    setWaterLevelDepth('15cm');
    setIsCustomDepth(false);
    setCustomDepthVal('');
    handleRemovePhoto();
    setSubmittedReportId(null);
    setSubmittedTimestamp('');
    setFormStep('edit');
    setIsDeclarationChecked(false);
    setErrors([]);
  };

  // Removed local coordinate SVG conversions for Leaflet integration

  // ================= 1. SUBMISSION CONFIRMATION RECEIPTS SCREEN =================
  if (submittedReportId) {
    const activeDepthValue = isCustomDepth ? customDepthVal : waterLevelDepth;
    return (
      <div className="bg-white border border-[#E2E4E1] max-w-2xl mx-auto shadow-md" id="report-confirmation">
        <div className="bg-[#1B4B66] text-white p-6 text-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
            <Check className="text-white animate-bounce" size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight uppercase">Formal Report Lodged</h2>
          <p className="text-xs text-white/80 max-w-md mx-auto">
            Your environmental hazard statement has been signed, recorded, and successfully transmitted to our civil response queue.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="border border-[#E2E4E1] bg-[#F5F6F4] p-5 font-mono text-xs space-y-4">
            <div className="flex justify-between border-b border-[#E2E4E1] pb-2.5 font-bold text-[#1A2226]">
              <span>OFFICIAL RECEIPT / CIVIC TRANSMITTAL</span>
              <span>OFFICIAL RECORD</span>
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 text-[#5B6B72]">
              <div>Report Reference ID:</div>
              <div className="font-bold text-[#1A2226] text-right">{submittedReportId}</div>

              <div>Lodgement Date/Time:</div>
              <div className="text-[#1A2226] text-right font-mono">{submittedTimestamp} (Local)</div>

              <div>Hazard Severity:</div>
              <div className="text-right">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider ${
                  severity === 'critical'
                    ? 'bg-[#7F1D1D]/20 border-[#7F1D1D]/40 text-[#7F1D1D] animate-pulse'
                    : severity === 'high'
                      ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]'
                      : severity === 'medium'
                        ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]'
                        : 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                }`}>
                  {severity} Risk
                </span>
              </div>

              <div>Estimated Water Depth:</div>
              <div className="text-[#1A2226] text-right font-bold">{activeDepthValue || "Not gauged"}</div>

              <div>Reported Location / Address:</div>
              <div className="text-[#1A2226] text-right truncate font-sans">{location}</div>

              <div>Latitude:</div>
              <div className="text-[#1A2226] text-right font-mono">{latitude.toFixed(6)}</div>

              <div>Longitude:</div>
              <div className="text-[#1A2226] text-right font-mono">{longitude.toFixed(6)}</div>
            </div>

            <div className="border-t border-[#E2E4E1] pt-2.5 mt-2">
              <div className="font-bold text-[#1A2226] mb-1">FILED HAZARD OBSERVATION STATEMENT:</div>
              <p className="text-[#5B6B72] italic leading-relaxed bg-white border border-[#E2E4E1] p-2.5 rounded-none font-sans">
                "{description}"
              </p>
            </div>

            {selectedPhoto && (
              <div className="border-t border-[#E2E4E1] pt-2.5 mt-2">
                <div className="font-bold text-[#1A2226] mb-1.5 uppercase">Audit Photographic Attachment:</div>
                <div className="flex items-start gap-4">
                  <div className="border border-[#E2E4E1] p-1 bg-white inline-block max-w-[120px]">
                    <img 
                      src={selectedPhoto} 
                      alt="Submitted evidence" 
                      className="w-full h-16 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-[10px] space-y-0.5 text-[#5B6B72]">
                    <div><span className="font-bold">File:</span> {previewName}</div>
                    {fileMeta && (
                      <>
                        <div><span className="font-bold">Format:</span> {fileMeta.type}</div>
                        <div><span className="font-bold">Size:</span> {fileMeta.size}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-[#5B6B72] leading-relaxed bg-[#C97A2B]/5 border border-[#C97A2B]/20 p-4">
            <span className="font-bold text-[#1A2226] block mb-1">EOC Verification Protocol</span>
            Municipal hydrological technicians will verify these GPS coordinates against telemetry nodes. Once assessed, response efforts will update on your terminal active log history. Municipal staff may contact you at <span className="font-mono text-[#1A2226] font-bold">{phone}</span> if further landmark guidance is required.
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-[#E2E4E1]">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-[#E2E4E1] hover:bg-[#F5F6F4] text-xs font-bold text-[#1A2226] inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
            >
              <Printer size={14} />
              Print Official Receipt
            </button>
            <button
              onClick={handleResetForm}
              className="px-4 py-2 bg-[#1B4B66] hover:bg-[#153a4f] text-white text-xs font-bold transition-colors duration-150 cursor-pointer"
            >
              File Another Report
            </button>
            {onNavigateToMyReports && (
              <button
                onClick={onNavigateToMyReports}
                className="px-4 py-2 bg-[#2E7D5B] hover:bg-[#235f45] text-white text-xs font-bold transition-colors duration-150 cursor-pointer"
              >
                View My Lodged Reports
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. REPORT PREVIEW STEP BEFORE SUBMISSION =================
  if (formStep === 'preview') {
    const activeDepthValue = isCustomDepth ? customDepthVal : waterLevelDepth;
    return (
      <div className="bg-white border border-[#E2E4E1] max-w-2xl mx-auto shadow-md animate-fade-in" id="report-preview-container">
        <div className="border-b border-[#E2E4E1] p-6 bg-[#F5F6F4]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1B4B66] uppercase tracking-wider mb-1">
            <Eye size={14} />
            <span>Official Incident Filing Preview</span>
          </div>
          <h2 className="text-lg font-bold text-[#1A2226] uppercase">
            Official Incident Filing Preview
          </h2>
          <p className="text-xs text-[#5B6B72] leading-relaxed mt-1">
            Please audit all spatial coordinates, severity parameters, and descriptions before signing and finalizing this municipal hazard lodgement.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="m-6 p-4 bg-[#B23B2E]/10 border-l-4 border-[#B23B2E] text-xs text-[#1A2226] space-y-1">
            <div className="font-bold text-[#B23B2E] flex items-center gap-1.5">
              <AlertCircle size={14} />
              Submission Blocked — Check Declaration
            </div>
            <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[#5B6B72]">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            
            {/* Location & Coordinates Preview */}
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block border-b border-[#E2E4E1]/80 pb-1">
                Section A: Geographic Positioning
              </span>
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <span className="block text-[10px] text-[#5B6B72] uppercase">Filing Address:</span>
                  <div className="font-bold text-[#1A2226]">{location}</div>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5B6B72] uppercase">Gauged Depth:</span>
                  <div className="font-mono font-bold text-[#1A2226]">{activeDepthValue || "N/A"}</div>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5B6B72] uppercase">Latitude Coordinate:</span>
                  <div className="font-mono font-bold text-[#1B4B66]">{latitude.toFixed(6)}</div>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5B6B72] uppercase">Longitude Coordinate:</span>
                  <div className="font-mono font-bold text-[#1B4B66]">{longitude.toFixed(6)}</div>
                </div>
              </div>

              {/* Mini visual verification map in preview */}
              <div 
                ref={previewMapContainerRef}
                className="border border-[#E2E4E1] h-36 relative bg-[#E5E7EB] overflow-hidden shadow-inner"
                id="report-preview-leaflet-map"
              >
                {/* Fallback load screen */}
                <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center space-y-2 z-0">
                  <RefreshCw className="animate-spin text-[#1B4B66]" size={16} />
                  <span className="text-[10px] font-mono text-[#5B6B72] uppercase tracking-wider">Mounting Preview Map...</span>
                </div>
              </div>
            </div>

            {/* Severity and Description Preview */}
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block border-b border-[#E2E4E1]/80 pb-1">
                Section B: Incident Details & Severity
              </span>
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#5B6B72] uppercase">Assessed Severity:</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 border uppercase tracking-wider ${
                    severity === 'critical'
                      ? 'bg-[#7F1D1D]/20 border-[#7F1D1D]/50 text-[#7F1D1D] font-black animate-pulse'
                      : severity === 'high' 
                        ? 'bg-[#B23B2E]/10 border-[#B23B2E]/30 text-[#B23B2E]' 
                        : severity === 'medium' 
                          ? 'bg-[#C97A2B]/10 border-[#C97A2B]/30 text-[#C97A2B]' 
                          : 'bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]'
                  }`}>
                    {severity.toUpperCase()} RISK
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-[10px] text-[#5B6B72] uppercase block mb-1">Citizen Observation Notes:</span>
                  <p className="text-xs text-[#1A2226] leading-relaxed bg-white border border-[#E2E4E1] p-3 italic">
                    "{description}"
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence Preview */}
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-4 space-y-3">
              <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block border-b border-[#E2E4E1]/80 pb-1">
                Section C: Visual Evidence
              </span>
              {selectedPhoto ? (
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="border border-[#E2E4E1] p-1 bg-white inline-block">
                    <img 
                      src={selectedPhoto} 
                      alt="Local Upload Preview" 
                      className="max-h-24 object-cover max-w-xs" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-xs space-y-1.5 text-[#5B6B72]">
                    <div className="font-bold text-[#1A2226]">File Details:</div>
                    <div><span className="font-semibold">Filename:</span> {previewName}</div>
                    {fileMeta && (
                      <>
                        <div><span className="font-semibold">Type:</span> {fileMeta.type}</div>
                        <div><span className="font-semibold">Size:</span> {fileMeta.size}</div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#5B6B72] italic py-2">
                  No photographic evidence is attached to this incident record.
                </div>
              )}
            </div>

            {/* Reporter Information */}
            <div className="bg-[#F5F6F4] border border-[#E2E4E1] p-4 space-y-2">
              <span className="text-[10px] font-bold text-[#5B6B72] uppercase tracking-wider block border-b border-[#E2E4E1]/80 pb-1">
                Section D: Reporter Details
              </span>
              <div className="grid sm:grid-cols-2 text-xs gap-2">
                <div>
                  <span className="text-[10px] text-[#5B6B72] uppercase block">Legal Name:</span>
                  <span className="font-bold text-[#1A2226]">{reporterName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5B6B72] uppercase block">Callback Phone:</span>
                  <span className="font-mono font-bold text-[#1A2226]">{phone}</span>
                </div>
              </div>
            </div>

            {/* Final Legal Declaration */}
            <div className="p-4 bg-[#B23B2E]/5 border border-[#B23B2E]/20 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isDeclarationChecked}
                  onChange={(e) => setIsDeclarationChecked(e.target.checked)}
                  className="mt-1 accent-[#1B4B66]"
                />
                <span className="text-[11px] text-[#1A2226] leading-relaxed">
                  <span className="font-bold text-[#B23B2E] uppercase block mb-0.5">Formal Civil Declaration</span>
                  I declare that the environmental hazard statement, geospatial pin coordinates, and photographic evidence provided in this form are accurate, true, and complete to the best of my knowledge. I understand this filing enters an active municipal dispatch queue.
                </span>
              </label>
            </div>

          </div>

          {/* Flow Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-[#E2E4E1]">
            <button
              onClick={() => {
                setFormStep('edit');
                setErrors([]);
              }}
              className="px-4 py-2 border border-[#E2E4E1] hover:bg-[#F5F6F4] text-xs font-bold text-[#1A2226] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              Back to Edit Form
            </button>

            <button
              onClick={handleFinalSubmit}
              className={`px-5 py-2.5 text-white text-xs font-bold transition-all duration-150 shadow-sm uppercase tracking-wider cursor-pointer ${
                isDeclarationChecked 
                  ? 'bg-[#1B4B66] hover:bg-[#153a4f]' 
                  : 'bg-gray-400 cursor-not-allowed opacity-70'
              }`}
            >
              Confirm & Lodge Formal Record
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 3. ACTIVE FILING FORM EDIT STEP =================
  return (
    <div className="bg-white border border-[#E2E4E1] max-w-2xl mx-auto shadow-md" id="report-form-container">
      {/* Title block */}
      <div className="border-b border-[#E2E4E1] p-6 bg-[#F5F6F4]">
        <h2 className="text-lg font-bold text-[#1A2226] flex items-center gap-2 uppercase tracking-wide">
          <FileText className="text-[#1B4B66]" size={20} />
          Official Flood Hazard Lodgement Form
        </h2>
        <p className="text-xs text-[#5B6B72] mt-1 leading-relaxed">
          Fields marked with an asterisk (<span className="text-[#B23B2E] font-bold">*</span>) are legally required for civil hazard registration. All information is managed in accordance with state data privacy directives.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="m-6 p-4 bg-[#B23B2E]/10 border-l-4 border-[#B23B2E] text-xs text-[#1A2226] space-y-1">
          <div className="font-bold text-[#B23B2E] flex items-center gap-1.5">
            <AlertCircle size={14} />
            Submission Rejected — Correction Required
          </div>
          <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[#5B6B72]">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleProceedToPreview} className="p-6 space-y-6">
        
        {/* SECTION 1: Geolocation Coordinates & Interactive Map */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-[#E2E4E1] pb-1.5">
            <h3 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider">
              Section A: Geospatial Coordinates & Map Grid
            </h3>
            
            {/* GPS locate button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="text-[10px] font-bold text-[#1B4B66] hover:text-[#153a4f] hover:underline flex items-center gap-1 transition-all uppercase tracking-wider cursor-pointer"
            >
              {isLocating ? (
                <>
                  <RefreshCw size={11} className="animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Globe size={11} />
                  <span>Use Current GPS Location</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Styled Local GIS Map pin selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1A2226]">
              Tactical Location Pin Selection <span className="text-[#B23B2E]">*</span>
            </label>
            <p className="text-[10px] text-[#5B6B72] leading-snug">
              Tap anywhere on the tactical GIS grid below to snap the coordinate pin. You can also drag the pin with your cursor.
            </p>

            <div 
              ref={editMapContainerRef}
              className="w-full bg-[#F5F6F4] border border-[#E2E4E1] h-56 relative overflow-hidden select-none shadow-inner"
              id="report-edit-leaflet-map"
            >
              {/* Fallback load screen */}
              <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center space-y-2 z-0">
                <RefreshCw className="animate-spin text-[#1B4B66]" size={20} />
                <span className="text-[10px] font-mono text-[#5B6B72] uppercase tracking-wider">Loading Interactive GIS Map...</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="input-lat" className="block text-xs font-bold text-[#1A2226]">
                Latitude Coordinate <span className="text-[#B23B2E]">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                id="input-lat"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                className="w-full text-xs border border-[#E2E4E1] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4B66] font-mono"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="input-lng" className="block text-xs font-bold text-[#1A2226]">
                Longitude Coordinate <span className="text-[#B23B2E]">*</span>
              </label>
              <input
                type="number"
                step="0.000001"
                id="input-lng"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                className="w-full text-xs border border-[#E2E4E1] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4B66] font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="input-location" className="block text-xs font-bold text-[#1A2226]">
                Flood Address / Landmark Context <span className="text-[#B23B2E]">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-[#5B6B72]" size={14} />
                <input
                  type="text"
                  id="input-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 512 North Boulevard, near Sector B Drainage Grate"
                  className="w-full text-xs border border-[#E2E4E1] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4B66]"
                />
              </div>
              <span className="text-[10px] text-[#5B6B72] block">
                Provide as exact an address or crossing description as possible for navigation of response vehicles.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Severity & Description */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-1">
            Section B: Severity & Damage Evaluation
          </h3>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#1A2226]">
              Observed Hazard Severity <span className="text-[#B23B2E]">*</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              
              <label className={`border p-3 flex flex-col justify-between cursor-pointer transition-colors ${
                severity === 'low' 
                  ? 'border-[#2E7D5B] bg-[#2E7D5B]/5' 
                  : 'border-[#E2E4E1] hover:bg-[#F5F6F4]'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="severity"
                    value="low"
                    checked={severity === 'low'}
                    onChange={() => setSeverity('low')}
                    className="accent-[#2E7D5B]"
                  />
                  <span className="text-xs font-bold text-[#2E7D5B]">Low Risk</span>
                </div>
                <span className="text-[9px] text-[#5B6B72] mt-1.5 leading-snug">
                  Minor gutter overflow. Roads remain entirely passable. Nuisance state.
                </span>
              </label>

              <label className={`border p-3 flex flex-col justify-between cursor-pointer transition-colors ${
                severity === 'medium' 
                  ? 'border-[#C97A2B] bg-[#C97A2B]/5' 
                  : 'border-[#E2E4E1] hover:bg-[#F5F6F4]'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="severity"
                    value="medium"
                    checked={severity === 'medium'}
                    onChange={() => setSeverity('medium')}
                    className="accent-[#C97A2B]"
                  />
                  <span className="text-xs font-bold text-[#C97A2B]">Moderate</span>
                </div>
                <span className="text-[9px] text-[#5B6B72] mt-1.5 leading-snug">
                  Sidewalk submerged, drains clogged. Traffic slow / partial lane closures.
                </span>
              </label>

              <label className={`border p-3 flex flex-col justify-between cursor-pointer transition-colors ${
                severity === 'high' 
                  ? 'border-[#B23B2E] bg-[#B23B2E]/5' 
                  : 'border-[#E2E4E1] hover:bg-[#F5F6F4]'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="severity"
                    value="high"
                    checked={severity === 'high'}
                    onChange={() => setSeverity('high')}
                    className="accent-[#B23B2E]"
                  />
                  <span className="text-xs font-bold text-[#B23B2E]">High Risk</span>
                </div>
                <span className="text-[9px] text-[#5B6B72] mt-1.5 leading-snug">
                  Severe structure flooding or major underpass blocked. Active threat.
                </span>
              </label>

              {/* UPGRADED: Critical Risk */}
              <label className={`border p-3 flex flex-col justify-between cursor-pointer transition-colors ${
                severity === 'critical' 
                  ? 'border-[#7F1D1D] bg-[#7F1D1D]/5' 
                  : 'border-[#E2E4E1] hover:bg-[#F5F6F4]'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="severity"
                    value="critical"
                    checked={severity === 'critical'}
                    onChange={() => setSeverity('critical')}
                    className="accent-[#7F1D1D]"
                  />
                  <span className="text-xs font-bold text-[#7F1D1D] animate-pulse">CRITICAL</span>
                </div>
                <span className="text-[9px] text-[#5B6B72] mt-1.5 leading-snug">
                  Imminent threat to life and safety. Structural failure or sweep-aways.
                </span>
              </label>

            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="input-depth" className="block text-xs font-bold text-[#1A2226]">
                Estimated Water Depth <span className="text-[#B23B2E]">*</span>
              </label>
              
              <div className="flex gap-2">
                {!isCustomDepth ? (
                  <select
                    id="input-depth"
                    value={waterLevelDepth}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomDepth(true);
                      } else {
                        setWaterLevelDepth(e.target.value);
                      }
                    }}
                    className="w-full text-xs border border-[#E2E4E1] px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#1B4B66]"
                  >
                    <option value="5cm">Minor / Ankle Deep (approx 5cm)</option>
                    <option value="15cm">Significant / Sidewalk Level (approx 15cm)</option>
                    <option value="30cm">Knee Deep / Moderate (approx 30cm)</option>
                    <option value="50cm">Severe / Waist Deep (approx 50cm)</option>
                    <option value="1.2m">Critical / Deep (above 1 meter)</option>
                    <option value="custom">-- Enter Custom Value --</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5 w-full items-center">
                    <input
                      type="text"
                      placeholder="e.g. 75cm or 2.1 meters"
                      value={customDepthVal}
                      onChange={(e) => setCustomDepthVal(e.target.value)}
                      className="flex-1 text-xs border border-[#E2E4E1] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4B66]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDepth(false);
                        setCustomDepthVal('');
                      }}
                      className="px-2.5 py-2 text-xs border border-[#E2E4E1] hover:bg-gray-50 uppercase tracking-wider font-bold"
                    >
                      Preset List
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="input-desc" className="block text-xs font-bold text-[#1A2226]">
              Detailed Observation Notes <span className="text-[#B23B2E]">*</span>
            </label>
            <textarea
              id="input-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. The storm drain near the bus stop is completely obstructed by fallen tree limbs and plastic trash bags. Water is rushing out of the grate instead of draining. It's spreading fast..."
              className="w-full text-xs border border-[#E2E4E1] p-3 focus:outline-none focus:ring-1 focus:ring-[#1B4B66] font-sans"
            ></textarea>
            <div className="flex justify-between text-[10px] text-[#5B6B72]">
              <span>Be specific about structural blocks or stranded assets.</span>
              <span className={description.length >= 15 ? "text-[#2E7D5B]" : "text-[#B23B2E]"}>
                {description.length} / 15 character minimum
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: Photographic Evidence (UPGRADED WITH DRAG & DROP + METADATA) */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-1">
            Section C: Photographic Evidence
          </h3>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#1A2226]">
              Upload Action Picture
            </label>

            {/* Drag and Drop Container Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-150 relative ${
                isDragActive 
                  ? 'border-[#1B4B66] bg-[#1B4B66]/5 scale-[0.99]' 
                  : 'border-[#E2E4E1] bg-[#F5F6F4] hover:border-[#1B4B66] hover:bg-[#1B4B66]/5'
              }`}
            >
              <Upload size={26} className="text-[#5B6B72] mx-auto mb-2" />
              <span className="text-xs font-bold text-[#1B4B66] block uppercase tracking-wide">
                Drag & Drop Photo Here
              </span>
              <span className="text-[10px] text-[#5B6B72] block mt-1">
                or click to browse local folders (JPEG, PNG, WEBP)
              </span>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Premium Attachment Preview Card */}
            {selectedPhoto && (
              <div className="border border-[#E2E4E1] p-3 bg-[#F5F6F4] flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between animate-fade-in shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="border border-[#E2E4E1] p-1 bg-white h-16 w-16 overflow-hidden shrink-0">
                    <img 
                      src={selectedPhoto} 
                      alt="Local Upload Preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-xs space-y-0.5 text-[#5B6B72] truncate max-w-xs md:max-w-md">
                    <div className="font-bold text-[#1A2226] truncate flex items-center gap-1.5">
                      <FileImage size={13} className="text-[#1B4B66]" />
                      <span className="truncate">{previewName}</span>
                    </div>
                    {fileMeta && (
                      <div className="font-mono text-[10px]">
                        <span>{fileMeta.type}</span>
                        <span className="mx-1.5">•</span>
                        <span>{fileMeta.size}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2.5 py-1.5 border border-[#B23B2E]/30 text-[#B23B2E] hover:bg-red-50 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors duration-150 cursor-pointer"
                >
                  <X size={11} />
                  <span>Remove Photo</span>
                </button>
              </div>
            )}

            
          </div>
        </div>

        {/* SECTION 4: Contact Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#1A2226] uppercase tracking-wider border-b border-[#E2E4E1] pb-1">
            Section D: Reporter Information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="input-name" className="block text-xs font-bold text-[#1A2226]">
                Full Legal Name <span className="text-[#B23B2E]">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-[#5B6B72]" size={14} />
                <input
                  type="text"
                  id="input-name"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="e.g. Johnathan Doe"
                  className="w-full text-xs border border-[#E2E4E1] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4B66]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="input-phone" className="block text-xs font-bold text-[#1A2226]">
                Contact Telephone Number <span className="text-[#B23B2E]">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-[#5B6B72]" size={14} />
                <input
                  type="text"
                  id="input-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 555-0100"
                  className="w-full text-xs border border-[#E2E4E1] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4B66]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-[#E2E4E1]">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2 border border-[#E2E4E1] hover:bg-[#F5F6F4] text-xs font-bold text-[#1A2226] cursor-pointer"
          >
            Clear Form
          </button>
          <button
            type="submit"
            id="btn-submit-report"
            className="px-5 py-2 bg-[#1B4B66] hover:bg-[#153a4f] text-white text-xs font-bold transition-colors duration-150 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Eye size={14} />
            <span>Proceed to Preview</span>
          </button>
        </div>
      </form>
    </div>
  );
}
