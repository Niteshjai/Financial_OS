import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  Building2, ChevronDown, CheckCircle2, AlertCircle, FileText,
  MapPin, Clock, Search, Layers, ShieldCheck, LineChart as LineChartIcon, Link2, Plus,
  Map as MapIcon, Globe, MapPinOff, AlertTriangle, FileCheck, Landmark, X, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const createColoredMarker = (color: string, index: number) => L.divIcon({
  className: '',
  html: `<div style="
    width: 22px; height: 22px; border-radius: 50%;
    background: ${color}; border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: white; font-weight: 500;
  ">${index + 1}</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
});

function FlyToMarker({ position, zoom, offsetPixels }: { position: [number, number]; zoom: number; offsetPixels?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      if (offsetPixels) {
        // Add offset to pixel coordinates (adding to Y moves camera down, marker up)
        const targetPoint = map.project(position, zoom).add(offsetPixels as [number, number]);
        const targetLatLng = map.unproject(targetPoint, zoom);
        map.flyTo(targetLatLng, zoom, { animate: true, duration: 1.2 });
      } else {
        map.flyTo(position, zoom, { animate: true, duration: 1.2 });
      }
    }
  }, [position, zoom, offsetPixels, map]);
  return null;
}

const ownershipColors = {
  self: { bg: '#E6F1FB', text: '#185FA5', dot: '#185FA5', label: 'Self-owned' },
  inherited: { bg: '#E1F5EE', text: '#0F6E56', dot: '#0F6E56', label: 'Inherited' },
  joint: { bg: '#FAEEDA', text: '#854F0B', dot: '#BA7517', label: 'Joint' },
  disputed: { bg: '#FCEBEB', text: '#A32D2D', dot: '#E24B4A', label: 'Disputed' },
};

const titleStatusColors = {
  clear: { color: '#0F6E56', label: 'Clear title' },
  dispute: { color: '#A32D2D', label: 'Dispute pending' },
  mutation_pending: { color: '#854F0B', label: 'Mutation pending' },
  encumbered: { color: '#854F0B', label: 'Encumbered' },
};

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString('en-IN')}`;
}

type LandUnit = 'acres' | 'hectares' | 'sqft' | 'sqm' | 'bigha' | 'guntha' | 'cent';

const UNIT_LABELS: Record<LandUnit, string> = {
  acres: 'Acres',
  hectares: 'Hectares',
  sqft: 'Sq. Ft',
  sqm: 'Sq. Meters',
  bigha: 'Bigha',
  guntha: 'Guntha',
  cent: 'Cent',
};

function formatArea(acres: number, targetUnit: LandUnit): string {
  switch (targetUnit) {
    case 'hectares': return `${(acres * 0.404686).toFixed(2)} ha`;
    case 'sqft': return `${Math.round(acres * 43560).toLocaleString()} sq.ft`;
    case 'sqm': return `${Math.round(acres * 4046.86).toLocaleString()} sq.m`;
    case 'bigha': return `${(acres * 1.6).toFixed(2)} Bigha`; // approx standard
    case 'guntha': return `${(acres * 40).toFixed(1)} Guntha`;
    case 'cent': return `${(acres * 100).toFixed(1)} Cent`;
    case 'acres':
    default: return `${acres.toFixed(2)} Acres`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export interface LandParcel {
  id: string;
  surveyNumber?: string;
  khasraNumber?: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  stateCode: string;
  areaAcres: number;
  areaUnit: string;
  landType: string;
  ownershipType: 'self' | 'inherited' | 'joint' | 'disputed';
  titleStatus: 'clear' | 'dispute' | 'mutation_pending' | 'encumbered';
  registrationDate: string;
  estimatedValue: number;
  latitude: number | null;
  longitude: number | null;
  digilockerDocAvailable: boolean;
  mutationStatus: string;
  source: string;
}

export const mockParcels: LandParcel[] = [
  {
    id: 'p1',
    surveyNumber: 'Survey No. 142/B',
    village: 'Hadapsar',
    taluka: 'Haveli',
    district: 'Pune',
    state: 'Maharashtra',
    stateCode: 'MH',
    areaAcres: 1.2,
    areaUnit: 'acres',
    landType: 'Agricultural',
    ownershipType: 'self',
    titleStatus: 'clear',
    registrationDate: '2018-03-12',
    estimatedValue: 3800000,
    latitude: 18.5204,
    longitude: 73.8567,
    digilockerDocAvailable: true,
    mutationStatus: 'completed',
    source: 'surepass',
  },
  {
    id: 'p2',
    surveyNumber: 'Plot No. 78',
    khasraNumber: 'Sy. 56',
    village: 'Dharwad',
    taluka: 'Dharwad',
    district: 'Dharwad',
    state: 'Karnataka',
    stateCode: 'KA',
    areaAcres: 0.8,
    areaUnit: 'acres',
    landType: 'Residential',
    ownershipType: 'inherited',
    titleStatus: 'clear',
    registrationDate: '2015-06-05',
    estimatedValue: 5200000,
    latitude: 15.4589,
    longitude: 75.0078,
    digilockerDocAvailable: true,
    mutationStatus: 'completed',
    source: 'surepass',
  },
  {
    id: 'p3',
    surveyNumber: 'Survey No. 33/1A',
    village: 'Mysuru',
    taluka: 'Mysuru',
    district: 'Mysuru',
    state: 'Karnataka',
    stateCode: 'KA',
    areaAcres: 1.1,
    areaUnit: 'acres',
    landType: 'Commercial',
    ownershipType: 'self',
    titleStatus: 'clear',
    registrationDate: '2021-11-20',
    estimatedValue: 8500000,
    latitude: 12.2958,
    longitude: 76.6394,
    digilockerDocAvailable: false,
    mutationStatus: 'pending',
    source: 'surepass',
  },
  {
    id: 'p4',
    khasraNumber: 'Khasra No. 441',
    surveyNumber: 'Khasra No. 441',
    village: 'Varanasi',
    taluka: 'Varanasi',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    stateCode: 'UP',
    areaAcres: 0.7,
    areaUnit: 'acres',
    landType: 'Agricultural',
    ownershipType: 'disputed',
    titleStatus: 'dispute',
    registrationDate: '2009-01-03',
    estimatedValue: 1200000,
    latitude: 25.3176,
    longitude: 82.9739,
    digilockerDocAvailable: false,
    mutationStatus: 'not_required',
    source: 'manual',
  },
];

interface Props {
  parcels?: LandParcel[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function LandPropertyMap({ parcels = mockParcels, isLoading = false, onRefresh }: Props) {
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [showFullRecord, setShowFullRecord] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [showDigilockerModal, setShowDigilockerModal] = useState(false);
  const [isFetchingDigilocker, setIsFetchingDigilocker] = useState(false);
  const [activeStateFilter, setActiveStateFilter] = useState<string>('all');
  const [displayUnit, setDisplayUnit] = useState<LandUnit>('acres');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const selectedParcel = useMemo(() => parcels.find(p => p.id === selectedParcelId) ?? null, [selectedParcelId, parcels]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    // Hide the button if within 20px of the bottom
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 20);
  };

  const filteredParcels = activeStateFilter === 'all'
    ? parcels
    : parcels.filter(p => p.stateCode === activeStateFilter);

  function handleSelectParcel(parcel: LandParcel) {
    setSelectedParcelId(parcel.id);
    if (parcel.latitude && parcel.longitude) {
      setMapCenter([parcel.latitude, parcel.longitude]);
      setMapZoom(13);
    }
  }

  const handleFetchDigilocker = () => {
    setIsFetchingDigilocker(true);
    setTimeout(() => {
      setIsFetchingDigilocker(false);
      setShowDigilockerModal(true);
    }, 1200);
  };

  // Derived states
  const uniqueStates = Array.from(new Set(parcels.map(p => p.stateCode)));

  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row gap-6 w-full">
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="h-10 w-full bg-zinc-100 rounded-lg animate-pulse" />
          <div className="h-32 w-full bg-zinc-100 rounded-2xl animate-pulse" />
          <div className="h-32 w-full bg-zinc-100 rounded-2xl animate-pulse" />
          <div className="h-32 w-full bg-zinc-100 rounded-2xl animate-pulse" />
        </div>
        <div className="w-full md:w-2/3">
          <div className="w-full h-[320px] md:h-[450px] bg-zinc-100 rounded-[24px] animate-pulse" />
        </div>
      </div>
    );
  }

  if (parcels.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-12 text-center shadow-sm border border-zinc-200">
        <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-4 border border-zinc-100">
          <MapPin className="size-8 text-zinc-300" />
        </div>
        <h3 className="text-xl font-display font-medium text-zinc-900 mb-2">No land records found</h3>
        <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
          We searched linked registries for your Aadhaar. You can add records manually.
        </p>
        <button onClick={onRefresh} className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-800 transition active:scale-95">
          <Plus className="size-4" /> Add manually
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* Left Side: Property List */}
        <div className="relative w-full md:w-1/3 h-[400px] md:h-[450px]">
          <div id="land-list-container" className="flex flex-col gap-2 h-full overflow-y-auto pr-2 pb-20 custom-scrollbar" onScroll={handleScroll}>
            {/* Filters & Units */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
                <button
                  onClick={() => setActiveStateFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${activeStateFilter === 'all' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                >
                  All States
                </button>
                {uniqueStates.map(stateCode => (
                  <button
                    key={stateCode}
                    onClick={() => setActiveStateFilter(stateCode)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${activeStateFilter === stateCode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                  >
                    {stateCode}
                  </button>
                ))}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="bg-white rounded-xl shadow-sm border border-zinc-200 px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-zinc-50 transition active:scale-95">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Unit:</span>
                    <span className="text-sm font-semibold text-zinc-900">{UNIT_LABELS[displayUnit]}</span>
                    <ChevronDown className="size-4 text-zinc-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[140px] rounded-xl border border-zinc-200 shadow-lg p-1 bg-white">
                  {Object.entries(UNIT_LABELS).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => setDisplayUnit(key as LandUnit)}
                      className="text-sm font-medium text-zinc-800 rounded-lg cursor-pointer focus:bg-zinc-100 hover:bg-zinc-100 px-3 py-2 outline-none transition"
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 mt-1">
              {filteredParcels.map((parcel, index) => {
                const isSelected = selectedParcelId === parcel.id;
                const ownStyle = ownershipColors[parcel.ownershipType];
                const titleStatus = titleStatusColors[parcel.titleStatus];

                return (
                  <div
                    key={parcel.id}
                    onClick={() => handleSelectParcel(parcel)}
                    className={`bg-white rounded-xl p-3 shadow-sm transition cursor-pointer border ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-200 hover:border-zinc-300'}`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 flex items-center justify-center size-4 rounded-full bg-zinc-900 text-white text-[9px] font-bold">
                          {index + 1}
                        </span>
                        <h4 className="text-[13px] font-semibold text-zinc-900 truncate">
                          {parcel.district}, {parcel.stateCode}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        {parcel.digilockerDocAvailable && (
                          <ShieldCheck className="size-3.5 text-emerald-500" strokeWidth={2} />
                        )}
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium" style={{ backgroundColor: ownStyle.bg, color: ownStyle.text }}>
                          {ownStyle.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 mb-2 flex-wrap">
                      <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: titleStatus.color }} />
                      <p className="text-[10px] font-medium text-zinc-600">{titleStatus.label}</p>
                      {parcel.source === 'manual' && (
                        <>
                          <span className="text-zinc-300 text-[9px] hidden sm:inline">|</span>
                          <span className="text-[9px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Manually verified</span>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-2">
                      <div>
                        <p className="text-[9px] uppercase text-zinc-400 font-medium tracking-wider">Area</p>
                        <p className="text-[11px] font-semibold text-zinc-800 mt-0.5">{formatArea(parcel.areaAcres, displayUnit)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase text-zinc-400 font-medium tracking-wider">Est. Value</p>
                        <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{formatINR(parcel.estimatedValue)}</p>
                      </div>
                    </div>

                    {(!parcel.latitude || !parcel.longitude) && (
                      <div className="mt-2 bg-amber-50 text-amber-700 text-[10px] font-medium py-1 px-2 rounded-md flex items-center gap-1.5">
                        <MapIcon className="size-3 shrink-0" /> No coordinates — location approximate
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Scroll Indicator Button */}
          {filteredParcels.length > 2 && !isAtBottom && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300">
              <button
                onClick={() => document.getElementById('land-list-container')?.scrollBy({ top: 250, behavior: 'smooth' })}
                className="flex items-center gap-1.5 bg-zinc-900 text-white shadow-xl px-4 py-2 rounded-full text-xs font-bold hover:bg-zinc-800 transition active:scale-95"
              >
                Scroll for more <ChevronDown className="size-4 animate-bounce" />
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Map */}
        <div className="w-full md:w-2/3 h-[320px] md:h-[450px] rounded-[24px] overflow-hidden border border-zinc-200 shadow-sm relative z-0">
          <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <FlyToMarker position={mapCenter} zoom={mapZoom} offsetPixels={selectedParcelId ? [0, 160] : undefined} />
            {filteredParcels.map((parcel, index) => {
              if (!parcel.latitude || !parcel.longitude) return null;
              return (
                <Marker
                  key={parcel.id}
                  position={[parcel.latitude, parcel.longitude]}
                  icon={createColoredMarker(ownershipColors[parcel.ownershipType].dot, index)}
                  eventHandlers={{ click: () => handleSelectParcel(parcel) }}
                >
                  <Popup className="rounded-xl border-0 shadow-lg">
                    <div className="p-1">
                      <p className="font-semibold text-zinc-900 m-0">{parcel.district}, {parcel.stateCode}</p>
                      <p className="text-xs text-zinc-500 m-0 mt-1">{formatArea(parcel.areaAcres, displayUnit)}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Slide-in Detail Panel */}
      <div
        className={`absolute -bottom-16 right-0 left-0 md:left-auto md:right-6 md:w-[72%] lg:w-[62%] max-w-5xl bg-white rounded-t-[24px] md:rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.16)] border border-zinc-200 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-10
          ${selectedParcel ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
      >
        {selectedParcel && (
          <div className="p-4 md:p-5 relative">
            <button
              onClick={() => setSelectedParcelId(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition"
            >
              <X className="size-4" />
            </button>

            <div className="flex flex-col md:flex-row gap-5 md:gap-6">
              {/* Left Column */}
              <div className="w-full md:w-3/5">
                <h3 className="text-lg md:text-xl font-semibold text-zinc-900 pr-10 mb-4 leading-tight">
                  {selectedParcel.surveyNumber || selectedParcel.khasraNumber || 'Property'} at {selectedParcel.village}, {selectedParcel.taluka}, {selectedParcel.district}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Survey/Khasra</p>
                    <p className="text-sm font-medium text-zinc-900 truncate" title={selectedParcel.surveyNumber || selectedParcel.khasraNumber || 'N/A'}>
                      {selectedParcel.surveyNumber || selectedParcel.khasraNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Area</p>
                    <p className="text-sm font-medium text-zinc-900">{formatArea(selectedParcel.areaAcres, displayUnit)}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Land Type</p>
                    <p className="text-sm font-medium text-zinc-900 truncate">{selectedParcel.landType}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Reg. Date</p>
                    <p className="text-sm font-medium text-zinc-900 truncate">{formatDate(selectedParcel.registrationDate)}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Ownership</p>
                    <p className="text-sm font-medium text-zinc-900 capitalize truncate">{selectedParcel.ownershipType.replace('_', ' ')}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Mutation Status</p>
                    <p className="text-sm font-medium text-zinc-900 capitalize truncate">{selectedParcel.mutationStatus.replace('_', ' ')}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Title Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="size-1.5 rounded-full" style={{ backgroundColor: titleStatusColors[selectedParcel.titleStatus].color }} />
                      <p className="text-sm font-medium text-zinc-900 truncate">{titleStatusColors[selectedParcel.titleStatus].label}</p>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-zinc-500 mb-0.5 uppercase tracking-wider font-medium">Source</p>
                    <p className="text-sm font-medium text-zinc-900 uppercase tracking-wide truncate">{selectedParcel.source}</p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="w-full md:w-2/5 flex flex-col pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-zinc-100 md:pl-6">
                <div className="mb-4">
                  <p className="text-[11px] text-zinc-500 mb-0.5 font-medium">Estimated Value</p>
                  <p className="text-2xl md:text-3xl font-sans font-semibold tracking-tight text-emerald-600 mb-1">
                    {formatINR(selectedParcel.estimatedValue)}
                  </p>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    * Based on state circle rates and recent transactions in {selectedParcel.taluka}.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 mt-auto">
                  <button
                    onClick={() => setShowFullRecord(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 active:scale-95 active:translate-y-0 group"
                  >
                    <FileText className="size-3.5 group-hover:-translate-y-0.5 transition-transform duration-300" /> View full record
                  </button>
                  <button
                    onClick={() => setShowValuationModal(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 active:scale-95 active:translate-y-0 group"
                  >
                    <LineChartIcon className="size-3.5 group-hover:scale-110 transition-transform duration-300 text-zinc-500 group-hover:text-zinc-700" /> Get valuation report
                  </button>
                  <button
                    disabled={!selectedParcel.digilockerDocAvailable || isFetchingDigilocker}
                    onClick={handleFetchDigilocker}
                    className={`flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-300 group ${selectedParcel.digilockerDocAvailable
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:shadow-sm hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                        : 'bg-zinc-50 text-zinc-400 cursor-not-allowed border border-zinc-100'
                      }`}
                  >
                    {isFetchingDigilocker ? (
                      <div className="size-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className={`size-3.5 ${selectedParcel.digilockerDocAvailable ? 'group-hover:rotate-12 transition-transform duration-300' : ''}`} />
                    )}
                    {isFetchingDigilocker ? 'Fetching...' : selectedParcel.digilockerDocAvailable ? 'Fetch DigiLocker document' : 'No DigiLocker document'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Record Modal */}
      {selectedParcel && (
        <Dialog open={showFullRecord} onOpenChange={setShowFullRecord}>
          <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-zinc-50 border-zinc-200 shadow-2xl rounded-2xl">
            <div className="bg-zinc-900 p-6 md:p-8 text-white relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MapIcon className="size-32" />
              </div>
              <DialogHeader className="relative z-10 text-left">
                <DialogTitle className="text-2xl md:text-3xl font-display font-semibold mb-2">
                  {selectedParcel.surveyNumber || selectedParcel.khasraNumber || 'Property Record'}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-4 text-zinc-300 text-sm font-medium">
                  <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {selectedParcel.village}, {selectedParcel.taluka}</span>
                  <span className="flex items-center gap-1.5"><Building2 className="size-4" /> {selectedParcel.district}, {selectedParcel.state}</span>
                  <span className="bg-white/10 px-2.5 py-1 rounded-md text-white border border-white/10">ID: {selectedParcel.id.toUpperCase()}</span>
                </div>
              </DialogHeader>
            </div>

            <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-6 bg-zinc-100/50 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                  <TabsTrigger value="ownership" className="rounded-lg">Ownership & Title</TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-lg">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Layers className="size-4" /> Property Details
                      </h4>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div>
                          <p className="text-[11px] text-zinc-500 mb-1">Land Type</p>
                          <p className="text-sm font-medium text-zinc-900">{selectedParcel.landType}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-500 mb-1">Total Area</p>
                          <p className="text-sm font-medium text-zinc-900">{formatArea(selectedParcel.areaAcres, displayUnit)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-500 mb-1">Coordinates</p>
                          <p className="text-sm font-medium text-zinc-900 font-mono">
                            {selectedParcel.latitude?.toFixed(4) || 'N/A'}, {selectedParcel.longitude?.toFixed(4) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-500 mb-1">Registration Date</p>
                          <p className="text-sm font-medium text-zinc-900">{formatDate(selectedParcel.registrationDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <LineChartIcon className="size-4" /> Valuation Analytics
                      </h4>
                      <p className="text-[11px] text-zinc-500 mb-1">Estimated Current Value</p>
                      <p className="text-4xl font-sans font-bold text-emerald-600 mb-2">
                        {formatINR(selectedParcel.estimatedValue)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 p-3 bg-emerald-50 rounded-lg text-emerald-700 text-xs font-medium">
                        <TrendingUp className="size-4" /> Value is estimated to be +12.5% above circle rate
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ownership" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
                      <div>
                        <p className="text-[11px] text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Title Status</p>
                        <div className="flex items-center gap-2">
                          <div className="size-3 rounded-full" style={{ backgroundColor: titleStatusColors[selectedParcel.titleStatus].color }} />
                          <p className="text-lg font-medium text-zinc-900">{titleStatusColors[selectedParcel.titleStatus].label}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Ownership Type</p>
                        <p className="text-lg font-medium text-zinc-900 capitalize">{selectedParcel.ownershipType.replace('_', ' ')}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                        <CheckCircle2 className="size-5 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 mb-1">Mutation Status: <span className="capitalize">{selectedParcel.mutationStatus.replace('_', ' ')}</span></p>
                          <p className="text-xs text-zinc-500">The property has been successfully mutated in the local land revenue records. Ownership transfers are fully recorded.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
                        <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900 mb-1">Encumbrance Warning</p>
                          <p className="text-xs text-amber-700">Please fetch the latest Encumbrance Certificate (EC) to verify if there are any active loans or liabilities against this parcel.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center gap-3 transition-all ${selectedParcel.digilockerDocAvailable ? 'bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-md cursor-pointer' : 'bg-zinc-50 border-zinc-200 opacity-60 grayscale'}`}>
                      <div className={`p-4 rounded-full ${selectedParcel.digilockerDocAvailable ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-200 text-zinc-400'}`}>
                        <ShieldCheck className="size-8" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">DigiLocker Records</p>
                        <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto">
                          {selectedParcel.digilockerDocAvailable ? 'Official digitized land records are available to fetch.' : 'Not available for this region yet.'}
                        </p>
                      </div>
                      {selectedParcel.digilockerDocAvailable && (
                        <button className="mt-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition">Fetch Now</button>
                      )}
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-zinc-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3">
                      <div className="p-4 rounded-full bg-emerald-50 text-emerald-600">
                        <FileCheck className="size-8" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">7/12 Extract / RTC</p>
                        <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto">Latest extract pulled from state registry portal.</p>
                      </div>
                      <button className="mt-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition">View Document</button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Valuation Report Modal */}
      {selectedParcel && (
        <Dialog open={showValuationModal} onOpenChange={setShowValuationModal}>
          <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-zinc-50 border-zinc-200 shadow-2xl rounded-2xl">
            <div className="bg-zinc-950 p-5 md:p-6 text-white relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <LineChartIcon className="size-32" />
              </div>
              <DialogHeader className="relative z-10 text-left">
                <div className="flex items-center gap-2 mb-2 text-emerald-200/80 uppercase tracking-widest text-xs font-bold">
                  <TrendingUp className="size-4" /> Official Valuation Report
                </div>
                <DialogTitle className="text-2xl md:text-3xl font-display font-semibold mb-2">
                  {selectedParcel.surveyNumber || selectedParcel.khasraNumber || 'Property'}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-4 text-emerald-100/80 text-sm font-medium">
                  <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {selectedParcel.village}, {selectedParcel.district}</span>
                  <span className="flex items-center gap-1.5"><Layers className="size-4" /> {formatArea(selectedParcel.areaAcres, displayUnit)}</span>
                </div>
              </DialogHeader>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm text-center">
                <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Estimated Current Market Value</p>
                <p className="text-5xl font-sans font-bold text-emerald-600 mb-2">
                  {formatINR(selectedParcel.estimatedValue)}
                </p>
                <p className="text-sm text-zinc-500">
                  Value per {displayUnit === 'acres' ? 'Acre' : displayUnit === 'hectares' ? 'Hectare' : 'Sq.Ft'}: <span className="font-semibold text-zinc-700">{formatINR(selectedParcel.estimatedValue / (displayUnit === 'acres' ? selectedParcel.areaAcres : displayUnit === 'hectares' ? selectedParcel.areaAcres * 0.404686 : selectedParcel.areaAcres * 43560))}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-2 rounded-full bg-blue-500" />
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Govt. Circle Rate</p>
                  </div>
                  <p className="text-xl font-bold text-zinc-900">{formatINR(selectedParcel.estimatedValue * 0.75)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Base rate set by {selectedParcel.state} government.</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Market Premium</p>
                  </div>
                  <p className="text-xl font-bold text-zinc-900">+{formatINR(selectedParcel.estimatedValue * 0.25)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Based on recent registered transactions nearby.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mt-3">
                <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">5-Year Valuation Trend</p>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { year: '2020', value: selectedParcel.estimatedValue * 0.72 },
                        { year: '2021', value: selectedParcel.estimatedValue * 0.81 },
                        { year: '2022', value: selectedParcel.estimatedValue * 0.89 },
                        { year: '2023', value: selectedParcel.estimatedValue * 0.95 },
                        { year: '2024', value: selectedParcel.estimatedValue },
                      ]}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                      <YAxis hide domain={['dataMin - 100000', 'dataMax + 100000']} />
                      <Tooltip
                        formatter={(value: number) => [formatINR(value), 'Estimated Value']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  onClick={() => setShowValuationModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    toast.success('Valuation report downloaded as PDF.');
                    setShowValuationModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 shadow-sm transition active:scale-95"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DigiLocker Document Modal */}
      {selectedParcel && (
        <Dialog open={showDigilockerModal} onOpenChange={setShowDigilockerModal}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-zinc-50 border-zinc-200 shadow-2xl rounded-2xl">
            <div className="bg-indigo-600 p-4 md:p-6 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1 text-indigo-200 uppercase tracking-widest text-xs font-bold">
                  <ShieldCheck className="size-4" /> DigiLocker Verified
                </div>
                <DialogTitle className="text-xl md:text-2xl font-semibold text-white">
                  Official Record of Rights (7/12 Extract)
                </DialogTitle>
              </div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/DigiLocker_logo.png/600px-DigiLocker_logo.png" alt="DigiLocker" className="h-8 md:h-10 opacity-90" />
            </div>
            
            <div className="p-6 md:p-8 space-y-6">
              <div className="bg-white border-2 border-zinc-200 shadow-sm p-8 rounded-lg relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                  <ShieldCheck className="w-96 h-96" />
                </div>
                
                <div className="flex justify-between items-start border-b border-zinc-200 pb-6 mb-6">
                  <div>
                    <h2 className="text-2xl font-serif text-zinc-900 font-bold mb-2">Government of {selectedParcel.state}</h2>
                    <p className="text-zinc-600 text-sm">Revenue Department</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      <CheckCircle2 className="size-3.5" /> Digitally Signed
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 font-mono">ID: DL-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-12 relative z-10">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Owner Name</p>
                    <p className="text-base font-bold text-zinc-900">{selectedParcel.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Survey / Khasra No.</p>
                    <p className="text-base font-bold text-zinc-900">{selectedParcel.surveyNumber || selectedParcel.khasraNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Area</p>
                    <p className="text-base font-bold text-zinc-900">{selectedParcel.areaAcres} Acres</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold mb-1">Village & District</p>
                    <p className="text-base font-bold text-zinc-900">{selectedParcel.village}, {selectedParcel.district}</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center gap-3 relative z-10">
                  <div className="size-16 border-2 border-indigo-100 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400">
                    <span className="text-[10px] uppercase font-bold transform -rotate-45 tracking-widest">Valid</span>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">This document is digitally signed by the authorized revenue officer.</p>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">Timestamp: {new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowDigilockerModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    toast.success('Document downloaded successfully.');
                    setShowDigilockerModal(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition active:scale-95 flex items-center gap-2"
                >
                  <FileText className="size-4" /> Download PDF
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
