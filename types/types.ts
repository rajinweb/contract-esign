'use client';
import { CheckCircle, Eye, PenTool } from "lucide-react";
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
  | 'saved'
  | 'sent';
  signers?: string[];
  file?: File | string;
  fileUrl?: string;
  documentId?: string;
}
export const statuses = [
  { value: "all", label: "All Statuses", color: "text-slate-300", dot: "bg-slate-300" },
  { value: "unfinished", label: "Unfinished", color: "text-yellow-400", dot: "bg-yellow-400" },
  { value: "waiting_me", label: "Waiting for Me", color: "text-sky-400", dot: "bg-sky-400" },
  { value: "waiting_others", label: "Waiting for Others", color: "text-teal-400", dot: "bg-teal-400" },
  { value: "signed", label: "Signed", color: "text-green-500", dot: "bg-green-500" },
  { value: "pending", label: "Pending", color: "text-amber-600", dot: "bg-amber-600" },
  { value: "draft", label: "Draft", color: "text-gray-400", dot: "bg-gray-400" },
  { value: "declined", label: "Declined", color: "text-rose-400", dot: "bg-rose-400" },
  { value: "expired", label: "Expired", color: "text-zinc-300", dot: "bg-zinc-300" },
  { value: "delivery_failed", label: "Delivery Failed", color: "text-red-500", dot: "bg-red-500" },
  { value: "saved", label: "Saved", color: "text-purple-400", dot: "bg-purple-400" },
  { value: "sent", label: "Sent", color: "text-indigo-500", dot: "bg-indigo-500" },
];

export const ROLES = [
  { value: 'signer', label: 'Signer', icon: PenTool, description: 'Can sign and fill out the document', color: '#3B82F6', isNew: false },
  { value: 'approver', label: 'Approver', icon: CheckCircle, description: 'Can approve or reject the document', color: '#10B981', isNew: true },
  { value: 'viewer', label: 'Viewer', icon: Eye, description: 'Can only view the document', color: '#6B7280', isNew: false },
] as const;

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
  totalFields: number
}
/* send email */
export interface SendDocumentRequest {
  recipients: Recipient[];
  documentName?: string;
  documentId?: string;
  subject: string;
  message: string;
  sendReminders: boolean;
  reminderDays: number;
  expiryDays: number;
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
  status: 'draft' | 'sent' | 'signed' | 'expired';
  changeLog: string;
}
export interface DocumentVersionsProps {
  documentId: string;
  currentVersion: number;
  onVersionSelect?: (version: number) => void;
}

export interface SavedDocument {
  id: string;
  userId: string;
  documentName: string;
  originalFileName: string;
  currentVersion: number;
  versions: DocumentVersion[];
  recipients: Recipient[];
  status: 'draft' | 'sent' | 'signed' | 'expired' | 'cancelled';
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
  currentSessionId?: string;
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
export interface DocumentEditorProps {
  documentId?: string | null;
  initialFileUrl?: string | null;
  initialDocumentName?: string | null;
  initialFields?: DocumentField[] | null;
  initialRecipients?: Recipient[] | null;
  isSigningMode?: boolean,
  onPageChange?: (currentPage: number) => void,
  onNumPagesChange?: (pages: number) => void
  onSignedSaveDocument?: (saveFn: () => Promise<void>) => void;
}

export interface UploadResult {
  fileUrl?: string;
  documentName?: string;
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