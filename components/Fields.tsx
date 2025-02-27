import { PencilLine, Image as Pic, Type, Mail, Phone, Building2, Check, Calendar } from 'lucide-react';   
import {Field, FieldsProps} from '@/types/types';

const fieldTypes = [
    { id: 'signature', icon: PencilLine, label: 'Signature' },
    { id: 'image', icon: Pic, label: 'Image' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'Date', icon: Calendar, label: 'Date' },
 
    
  ];


export default function Fields({ handleClick }: FieldsProps) {

return(
    <div className="w-64 bg-gray-50 p-4 border-r border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Fields</h2>
              <div className="space-y-2">
                {fieldTypes.map(({ id, icon: Icon, label }) => (
                  <div
                    key={id}
                    className="flex items-center p-3 bg-white rounded-lg shadow-sm cursor-move hover:bg-gray-50"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      const data = {
                        label,
                        x: e.clientX,
                        y: e.clientY,
                      };
                      e.dataTransfer.setData('fieldType', JSON.stringify(data));
                    }}
                    onClick={()=>{
                      handleClick(label)
                    }}
                   
                  >
                    <Icon className="w-5 h-5 text-gray-500 mr-3" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>
)
};