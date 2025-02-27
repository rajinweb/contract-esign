export interface Document {
    id: string;
    name: string;
    createdAt: Date;
    status: 'shared' | 'to_sign' | 'signed' | 'cancelled' | 'expired';
  }
export interface PageDetails {
    originalHeight: number;
    originalWidth: number;
  }
export interface Position {
    x: number;
    y: number;
    offsetX?: number;
    offsetY?: number;
  }
export interface ImageFieldProps {
    image: string;  
  }
export interface MultiLineTextFieldProps {
    initialText?: string;
    heightUpdates:(text:any)=> void;
  }
export interface TextFieldProps {
    initialText?: string;
    type?:string;
  }
  export interface DragFields {
    onSet: (e:React.MouseEvent) => void;
    onCancel: () => void;
    onEnd: (position: { x: number; y: number }) => void;
    defaultPosition?: { x: number; y: number };
    children: React.ReactNode;
    heights?:number
  }
 // Define field types
 export interface Field {
  id: string;
  type: string;
  position: { x: number; y: number };
  label: string;
  value?: string;
}
  
export interface FieldsProps {
  handleSave: () => void;
  handleClick: (label: string) => void;
}