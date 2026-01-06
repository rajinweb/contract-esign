import React from 'react';

interface MapProps {
  latitude?: number;
  longitude?: number;
}

const Map: React.FC<MapProps> = ({ latitude, longitude }) => {
  if (latitude === undefined || longitude === undefined) {
    return <p className="text-sm text-gray-500 italic">Location data is unavailable.</p>;
  }
  
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=400x400&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <div className="w-full border rounded-lg overflow-hidden shadow-sm">
        <img src={mapUrl} alt="Map showing user location" className="w-full h-auto block" />
      </div>
      <div className="flex gap-4 text-xs font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border">
        <span><span className="font-bold text-gray-400">LAT:</span> {latitude.toFixed(6)}</span>
        <span><span className="font-bold text-gray-400">LONG:</span> {longitude.toFixed(6)}</span>
      </div>
    </div>
  );
};

export default Map;
