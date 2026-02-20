import React from "react";
import { ArrowUp, MapPin, MapPinOff } from "lucide-react";
import { Button } from "./Button";

interface PermissionHintPopoverProps {
  visible: boolean;
}

const PermissionHintPopover: React.FC<PermissionHintPopoverProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <>
    <div className="fixed top-4 left-32 z-[999999] pointer-events-none">
      {/* Arrow */}
      <div className="flex items-center gap-2 animate-bounce">
        <ArrowUp className="h-6 w-6 text-blue-600 " />
        <span className="text-xs font-semibold text-blue-600">
          Enable Location Here
        </span>
      </div>

      {/* Popover */}
      <div className="mt-2 max-w-[260px] bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-auto">
        <p className="text-xs text-gray-700 font-medium">
          Location access is blocked
        </p>

        <ol className="text-[11px] text-gray-600 mt-2 list-decimal ml-4 space-y-1">
          <li>Click the 🔒 lock icon</li>
           <li><span className="flex items-center gap-1">Set <MapPinOff size={16}/> <b>Location</b> to <b>Allow</b><MapPin size={16}/></span></li>
          <li>Refresh this page</li>
        </ol>
      </div>
    </div>

        <p className="mt-2 font-medium">How to enable location:</p>
        <ul className="list-disc ml-4 space-y-1 bg-white px-8 py-4 rounded shadow-md text-left text-sm">
            <li>Click the 🔒 lock icon in the address bar</li>
            <li><span className="flex items-center gap-1">Set <MapPinOff size={16}/> <b>Location</b> to <b>Allow</b><MapPin size={16}/></span></li>
            <li>Refresh the page</li>
        </ul>
        <small>I have enabled location. Please click the button below to refresh the page.</small>
        <Button
        onClick={() => window.location.reload()}
        label="Retry Location"
        />

   </>
  );    
};

export default PermissionHintPopover;
