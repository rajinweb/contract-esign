import { PencilLine, Image as Pic, Type, Calendar, Download } from 'lucide-react';
import {FieldsProps} from '@/types/types';
const fieldTypes = [
  { id: 'signature', icon: PencilLine, label: 'Signature' },
  { id: 'image', icon: Pic, label: 'Image' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'Date', icon: Calendar, label: 'Date' },
];
  // Utility function to trigger file download
  function downloadURI(uri: string | File, name: string) {
    const link = document.createElement("a");
    link.download = name;
    link.href = typeof uri === 'string' ? uri : URL.createObjectURL(uri);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

export default function Fields({ activeComponent, mouseDown, handleReset, handleSave, selectedFile }: FieldsProps) {
  const fileName = selectedFile?.name;  
  return (
    <div className="w-64 bg-gray-50 p-4 border-r border-gray-200 space-y-5">
       <div className="flex space-x-2    ">
          <button className=" items-center px-4 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
          onClick={handleReset}> Reset </button>
           <button onClick={handleSave} className=" items-center px-4 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
          > Send </button>
           <button className=" items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
          onClick={() => selectedFile && downloadURI(selectedFile, fileName || 'download.pdf')} >
            <Download size={20} />
            </button>
       </div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Fields</h2>
      <div className="space-y-3 text-sm">
        {fieldTypes.map(({ id, icon: Icon, label }) => (
          <div
            key={id}
            className={`flex items-center px-3 py-2 bg-white rounded-md shadow-md cursor-pointer hover:bg-gray-300 ${
              activeComponent == label && 'hover:bg-blue-200 bg-blue-300'
            }`}
            onMouseDown={(event) => mouseDown(label, event)}
          >
            <Icon className="mr-2" size={15} />
            <span className="">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
