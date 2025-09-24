import React, { useState, useCallback, useRef } from 'react';
import Webcam from 'react-webcam';

interface RealtimePhotoDialogProps {
  onClose: () => void;
  onConfirm: (image: string) => void;
}

export const RealtimePhotoDialog: React.FC<RealtimePhotoDialogProps> = ({ onClose, onConfirm }) => {
  const [image, setImage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
    }
  }, [webcamRef]);

  const handleConfirm = () => {
    if (image) {
      onConfirm(image);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Capture Photo</h2>
        <div className="w-full h-64 bg-gray-200 mb-4">
          {image ? (
            <img src={image} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200">Cancel</button>
          {image ? (
            <button onClick={() => setImage(null)} className="px-4 py-2 rounded bg-blue-500 text-white">Retake</button>
          ) : (
            <button onClick={capture} className="px-4 py-2 rounded bg-blue-500 text-white">Capture</button>
          )}
          <button onClick={handleConfirm} disabled={!image} className="px-4 py-2 rounded bg-green-500 text-white disabled:bg-gray-400">Confirm</button>
        </div>
      </div>
    </div>
  );
};
