'use client';
import { ReactNode } from "react";

export interface Doc {
    id: string;
    name: string;
    createdAt: Date;
    status: 'shared' | 'to_sign' | 'signed' | 'cancelled' | 'expired';
  }

export interface ContextValue {
  selectedFile: File | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  documents: Doc[];
  setDocuments: React.Dispatch<React.SetStateAction<Doc[]>>;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

export interface ContextProviderProps {
  children: ReactNode;
}

export interface ImageFieldProps {
    image: string;  
  }
export interface InputProps {
    textInput:(data:string)=>void;
    defaultDate?:null;
  }

  
export interface FieldsProps {
  mouseDown: (lable: string, event: React.MouseEvent<HTMLDivElement>) => void;
  activeComponent: string | null;
  handleSave?:()=> void;
  handleSend?:()=>void;
  selectedFile: File | null;
  handleReset?:()=> void;
}

// Define types for the dropped components
export interface DroppingField {
  component: string;
  x: number;
  y: number;
}
export interface  DroppedComponent extends DroppingField {
  value?: any;
  id: number;
  width: number;
  height: number;
  data?: any;
}