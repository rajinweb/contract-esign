'use client';
import { ReactNode } from "react";

export interface Doc {
  [x: string]: any;
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
  | 'delivery_failed'
  | 'saved';
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
  { value: "saved", label: "Saved", color: "text-purple-600", dot: "bg-purple-600" },
];
export interface ContextValue {
  selectedFile: Doc | File | string | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<Doc | File | string | null>>;
  documents: Doc[];
  setDocuments: React.Dispatch<React.SetStateAction<Doc[]>>;
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export interface ContextProviderProps {
  children: ReactNode;
}

export interface ImageFieldProps {
  image: string | null;
}
export interface InputProps {
  textInput: (data: string) => void;
  defaultDate?: string | null;
}


export interface FieldsProps {
  mouseDown: (lable: string, event: React.MouseEvent<HTMLDivElement>) => void;
  activeComponent: string | null;
  handleSave?: () => void;
  handleSend?: () => void;
  selectedFile: File | null;

}

// Define types for the dropped components
export interface DroppingField {
  component: string;
  x: number;
  y: number;
}
export interface DroppedComponent extends DroppingField {
  id: number;
  component: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data?: string | null;
  pageNumber?: number;
  mimeType?: string;
  assignedRecipientId?: string | null;
  required?: boolean;
  placeholder?: string;
}
export interface User {
  email: string;
  password?: string;
  name?: string;
  picture?: string;
  id?: string;
}

/* Recipients */
export interface Recipient {
  id: string;
  email: string;
  name: string;
  role: 'signer' | 'approver' | 'viewer';
  color: string;
  order: number;
  isCC?: boolean;
}

/* contacts  */
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

/* Document Management */
export interface DocumentField {
  id: string;
  type: 'signature' | 'text' | 'date' | 'checkbox' | 'image' | 'initials';
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  recipientId?: string;
  required: boolean;
  value?: string;
  placeholder?: string;
}

export interface DocumentVersion {
  version: number;
  pdfData: Buffer;
  fields: DocumentField[];
  sentAt?: Date;
  signingToken?: string;
  expiresAt?: Date;
  status: 'draft' | 'sent' | 'completed' | 'expired';
  changeLog: string;
}

export interface SavedDocument {
  id: string;
  userId: string;
  documentName: string;
  originalFileName: string;
  currentVersion: number;
  versions: DocumentVersion[];
  recipients: Recipient[];
  status: 'draft' | 'sent' | 'completed' | 'expired' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// types/document.ts
export interface IDocument extends Document {
  _id: string; // explicitly tell TypeScript _id is a string
  userId: string;
  documentName: string;
  originalFileName: string;
  currentVersion: number;
  versions: {
    version: number;
    pdfData: Buffer;
    fields?: any[];
    status?: string;
    changeLog?: string;
  }[];
  recipients?: any[];
  status?: string;
  token?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UploadResult {
  fileUrl?: string;
  fileName?: string;
  documentId?: string;
  version?: number;
  message?: string;
  [key: string]: unknown;
}
export interface HandleSavePDFOptions {
  isServerSave?: boolean;
  isDownload?: boolean;
  isMergeFields?: boolean;
}