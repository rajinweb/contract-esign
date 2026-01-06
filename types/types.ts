'use client';
import { CheckCircle, Eye, PenTool } from "lucide-react";
import { ReactNode } from "react";

export interface Doc {
  [x: string]: any;
  id: string;
  name: string;
  createdAt: Date;
  status:
  | 'draft'
  | 'saved'
  | 'sent'
  | 'viewed'
  | 'in_progress'
  | 'signed'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'delivery_failed'
  | 'expired'
  | 'cancelled'
  | 'pending';
  signers?: string[];
  file?: File | string;
  fileUrl?: string;
  documentId?: string;
  isTemplate?: boolean;
}
export const statuses = [
  { value: "all", label: "All Statuses", color: "text-slate-300", dot: "bg-slate-300" },

  // --- Draft / Setup ---
  { value: "draft", label: "Draft", color: "text-gray-400", dot: "bg-gray-400" },
  { value: "saved", label: "Saved", color: "text-purple-400", dot: "bg-purple-400" },

  // --- Active Workflow States ---
  { value: "sent", label: "Sent", color: "text-indigo-500", dot: "bg-indigo-500" },
  { value: "viewed", label: "Viewed", color: "text-sky-400", dot: "bg-sky-400" },
  { value: "in_progress", label: "In Progress", color: "text-amber-500", dot: "bg-amber-500" },

  // --- Completed / Finalized ---
  { value: "signed", label: "Signed", color: "text-green-500", dot: "bg-green-500" },
  { value: "approved", label: "Approved", color: "text-emerald-500", dot: "bg-emerald-500" },
  { value: "completed", label: "Completed", color: "text-green-600", dot: "bg-green-600" },

  // --- Error / Exception States ---
  { value: "rejected", label: "Rejected", color: "text-rose-500", dot: "bg-rose-500" },
  { value: "delivery_failed", label: "Delivery Failed", color: "text-red-500", dot: "bg-red-500" },
  { value: "expired", label: "Expired", color: "text-zinc-400", dot: "bg-zinc-400" },
  { value: "cancelled", label: "Cancelled", color: "text-neutral-400", dot: "bg-neutral-400" },
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
  readOnly?: boolean
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
  pageRect?: DOMRect | null;
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
  captureGpsLocation?: boolean;
  id: string;
  email: string;
  name: string;
  role: 'signer' | 'approver' | 'viewer';
  color: string;
  order: number;
  isCC?: boolean;
  totalFields?: number;
  status:
  | 'signed'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'viewed'
  | 'delivery_failed';
  rejectedAt?: Date;
  signedAt?: Date;
  approvedAt?: Date;
  viewedAt?: Date;
  ipAddress?: string;
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
// Type of all supported field kinds
export type DocumentFieldType =
  | 'signature'
  | 'text'
  | 'date'
  | 'checkbox'
  | 'image'
  | 'initials'
  | 'realtime_photo'
  | 'stamp';
/* Document Management */
export interface DocumentField {
  id: string;
  type: DocumentFieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber?: number;
  recipientId?: string | null | undefined;
  required: boolean;
  value?: string;
  placeholder?: string;
  mimeType?: string;
  pageRect?: DOMRect | null;
}

// Document Version & History
export interface IEditHistory {
  sessionId: string;
  fields: DocumentField[];
  documentName?: string;
  timestamp: Date;
  changeLog: string;
}

export interface IDocumentVersion {
  version: number;
  fileUrl?: string;
  pdfData?: Buffer;
  fields: DocumentField[];
  documentName: string;
  filePath: string;
  sentAt?: Date;
  signingToken?: string;
  expiresAt?: Date;
  status: 'draft' | 'sent' | 'signed' | 'expired' | 'final';
  changeLog: string;
  editHistory: IEditHistory[];
  createdAt: Date;
  updatedAt: Date;
  canvasWidth?: number;
  canvasHeight?: number;
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
  versions: IDocumentVersion[];
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
    filePath?: string;
  }[];
  recipients?: Recipient[];
  status?:
  | 'draft'
  | 'saved'
  | 'sent'
  | 'viewed'
  | 'in_progress'
  | 'signed'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'delivery_failed'
  | 'expired'
  | 'cancelled'
  | 'pending';
  token?: string;
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
  usageCount?: number;
  isTemplate?: boolean;
}
export interface DocumentEditorProps {
  documentId?: string | null;
  initialFileUrl?: string | null;
  initialDocumentName?: string | null;
  initialFields?: DocumentField[] | null;
  initialRecipients?: Recipient[] | null;
  isSigningMode?: boolean,
  isSigned?: boolean,
  onPageChange?: (currentPage: number) => void,
  onNumPagesChange?: (pages: number) => void
  onSignedSaveDocument?: (saveFn: () => Promise<void>) => void,
  signingToken?: string;
  currentRecipientId?: string;
  onFieldsChange?: (fields: DocumentField[]) => void;
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

export type GpsState = "idle" | "capturing" | "captured" | "error";