'use client';
import { ReactNode } from "react";

export interface Doc {
  id: string;
  name: string;
  createdAt: Date;
  status:
    | 'unfinished'
    | 'waiting_for_me'
    | 'waiting_for_others'
    | 'signed'
    | 'pending'
    | 'draft'
    | 'declined'
    | 'expired'
    | 'delivery_failed';
  signers?: string[];
  file?: File | string;
  fileUrl?: string;
}
export const statuses = [
  { value: "all", label: "All Statuses", color: "text-blue-600", dot: "bg-white" },
  { value: "unfinished", label: "Unfinished", color: "text-yellow-500", dot: "bg-yellow-500" },
  { value: "waiting_me", label: "Waiting for Me", color: "text-blue-600", dot: "bg-blue-600" },
  { value: "waiting_others", label: "Waiting for Others", color: "text-teal-500", dot: "bg-teal-500" },
  { value: "signed", label: "Signed", color: "text-green-500", dot: "bg-green-500" },
  { value: "pending", label: "Pending", color: "text-orange-500", dot: "bg-orange-500" },
  { value: "draft", label: "Draft", color: "text-gray-400", dot: "bg-gray-400" },
  { value: "declined", label: "Declined", color: "text-red-500", dot: "bg-red-500" },
  { value: "expired", label: "Expired", color: "text-red-400", dot: "bg-red-400" },
  { value: "delivery_failed", label: "Delivery Failed", color: "text-red-600", dot: "bg-red-600" },
];
export interface ContextValue {
  selectedFile: File | string | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | string | null>>;
  documents: Doc[];
  setDocuments: React.Dispatch<React.SetStateAction<Doc[]>>;
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

export interface ContextProviderProps {
  children: ReactNode;
}

export interface ImageFieldProps {
    image: string;  
  }
export interface InputProps {
    textInput:(data:string)=>void;
    defaultDate?: string | null;
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
     id: number;
    component: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data?: string | null;
    pageNumber?: number;
    mimeType?: string;
}
export interface User {
  email: string;
  password?: string;
  name?: string;
  picture?: string;
  id?: string;
}

export interface Contact {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  address?: {
    country?: string;
    streetAddress?: string;
    apartment?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  description?: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}