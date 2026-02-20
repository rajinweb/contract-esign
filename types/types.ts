'use client';
import { CheckCircle, Eye, PenTool } from "lucide-react";
import { ReactNode } from "react";

export type SidebarType = 'documents' | 'contacts' | 'account';
export type SecondarySidebarType = 'dash-documents' | 'my-templates' | 'trash' | 'profile';
export interface Doc {
  [x: string]: unknown;
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
  | 'voided'
  | 'pending'
  | 'trashed'; // Add 'trashed' status
  deletedAt?: Date | null; // Add optional deletedAt property
  statusBeforeDelete?: Doc['status'];
  signers?: string[];
  file?: File | string;
  fileUrl?: string;
  url?: string;
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
  { value: "completed", label: "Completed", color: "text-green-600", dot: "bg-green-600" },

  // --- Error / Exception States ---
  { value: "rejected", label: "Rejected", color: "text-rose-500", dot: "bg-rose-500" },
  { value: "delivery_failed", label: "Delivery Failed", color: "text-red-500", dot: "bg-red-500" },
  { value: "expired", label: "Expired", color: "text-zinc-400", dot: "bg-zinc-400" },
  { value: "cancelled", label: "Cancelled", color: "text-neutral-400", dot: "bg-neutral-400" },
  { value: "voided", label: "Voided", color: "text-neutral-400", dot: "bg-neutral-400" },
];

export const ROLES = [
  { value: 'signer', label: 'Signer', icon: PenTool, description: 'Can sign and fill out the document', color: '#3B82F6', isNew: false },
  { value: 'approver', label: 'Approver', icon: CheckCircle, description: 'Can approve or reject the document', color: '#10B981', isNew: true },
  { value: 'viewer', label: 'Viewer', icon: Eye, description: 'Can only view the document', color: '#6B7280', isNew: false },
] as const;

export type FieldOwner = "me" | "recipients";
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
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string | null;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string | null>>;
  trashedTemplatesCount: number;
  setTrashedTemplatesCount: React.Dispatch<React.SetStateAction<number>>;
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
  className?: string;
}


export interface FieldsProps {
  mouseDown: (lable: string, event: React.MouseEvent<HTMLDivElement>, fieldOwner: FieldOwner) => void;
  activeComponent: DroppingField | null;
  handleSave?: () => void;
  handleSend?: () => void;
  selectedFile: File | null;
}

// Define types for the dropped components
export interface DroppingField {
  component: string;
  x: number;
  y: number;
  fieldOwner?: FieldOwner,
  data?: string | null;
}
export interface PageRect {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}
export interface DroppedComponent extends DroppingField {
  id: number;
  fieldId?: string;
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
  pageRect?: PageRect | DOMRect | null;
  hasError?: boolean;
}
export interface Address {
  country?: string;
  street?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zip?: string;
}
export interface User {
  email: string;
  password?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  id?: string;
  initials?: SignatureInitial[];
  signatures?: SignatureInitial[];
  stamps?: SignatureInitial[];
  phone?: string;
  address?: Address;
  role?: string;
  createdAt?: Date;
  updatedAt?: string;
}

/* Recipients */
export interface Recipient {
  signingToken?: string;
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
  | 'delivery_failed'
  | 'expired';
  rejectedAt?: Date;
  signedAt?: Date;
  signedVersion?: number | null;
  approvedAt?: Date;
  viewedAt?: Date;
  ipAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    city?: string;
    state?: string;
    country?: string;
    capturedAt?: Date;
  };
  device?: {
    type?: 'mobile' | 'desktop' | 'tablet';
    os?: string;
    browser?: string;
    userAgent?: string;
  };
  network?: {
    ip?: string;
    ipUnavailableReason?: string;
    isp?: string;
    ipLocation?: {
      city?: string;
      country?: string;
    };
  };
  consent?: {
    locationGranted?: boolean;
    grantedAt?: Date;
    method?: 'system_prompt' | 'checkbox' | 'other';
  };
  identityVerification?: {
    method?: 'email' | 'sms' | 'kba' | 'id_document' | 'bank_id' | 'selfie' | 'manual' | 'none';
    provider?: string;
    result?: 'passed' | 'failed' | 'skipped';
    verifiedAt?: Date;
    transactionId?: string;
    payloadHash?: string;
  };
  authentication?: {
    method?: 'email' | 'sms' | 'otp' | 'sso' | 'none';
    channel?: string;
    verifiedAt?: Date;
    transactionId?: string;
  };
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
  | 'live_photo'
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
  pageRect?: PageRect | DOMRect | null;
  fieldOwner?: FieldOwner;
}

export interface SigningViewDocument {
  id: string;
  fileUrl: string;
  name: string;
  fields: DocumentField[];
  recipients: Recipient[];
  currentRecipientId?: string;
  currentRecipient?: Recipient;
  status: string;
  signingMode?: 'sequential' | 'parallel';
  deletedAt?: string | null;
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
  label?: string;
  signedBy?: string[];
  renderedBy?: string;
  pdfSignedAt?: Date;
  changeMeta?: {
    action?: string;
    actorId?: string;
    actorRole?: string;
    signingMode?: string;
    baseVersion?: number;
    derivedFromVersion?: number;
    signedAt?: Date;
    source?: 'client' | 'server' | 'system';
  };
  storage?: {
    provider: string;
    bucket?: string;
    region?: string;
    key?: string;
    url?: string;
    versionId?: string;
  };
  hash?: string;
  hashAlgo?: string;
  size?: number;
  mimeType?: string;
  locked?: boolean;
  derivedFromVersion?: number;
  fileUrl?: string;
  pdfData?: Buffer;
  fields?: DocumentField[];
  documentName?: string;
  filePath?: string;
  sentAt?: Date;
  signingToken?: string;
  expiresAt?: Date;
  status?: 'draft' | 'sent' | 'signed' | 'expired' | 'final' | 'locked';
  changeLog?: string;
  editHistory?: IEditHistory[];
  createdAt?: Date;
  updatedAt?: Date;
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
  status: 'draft' | 'sent' | 'signed' | 'expired' | 'cancelled' | 'voided';
  createdAt: Date;
  updatedAt: Date;
}

// types/document.ts
export interface IDocument {
  _id: string; // explicitly tell TypeScript _id is a string
  userId: string;
  documentName: string;
  originalFileName: string;
  currentVersion: number;
  currentSessionId?: string;
  sequentialSigning?: boolean; // Added sequential signing toggle
  signingMode?: 'parallel' | 'sequential';
  signingEvents?: Array<{
    recipientId: string;
    action?: 'sent' | 'viewed' | 'signed' | 'approved' | 'rejected' | 'voided';
    fields?: Array<{ fieldId: string; fieldHash: string }>;
    fieldsHash?: string;
    fieldsHashAlgo?: string;
    signatureHash?: string;
    signatureHashAlgo?: string;
    signedAt?: Date;
    sentAt?: Date;
    serverTimestamp?: Date;
    baseVersion?: number;
    targetVersion?: number;
    ip?: string;
    ipUnavailableReason?: string;
    userAgent?: string;
    order?: number;
    version?: number;
    client?: {
      ip?: string;
      userAgent?: string;
      deviceType?: 'mobile' | 'desktop' | 'tablet';
      os?: string;
      browser?: string;
    };
    geo?: {
      latitude?: number;
      longitude?: number;
      accuracyMeters?: number;
      city?: string;
      state?: string;
      country?: string;
      capturedAt?: Date;
      source?: string;
    };
    consent?: {
      locationGranted?: boolean;
      grantedAt?: Date;
      method?: 'system_prompt' | 'checkbox' | 'other';
    };
  }>;
  versions: {
    version: number;
    pdfData?: Buffer;
    fields?: unknown[];
    status?: string;
    changeLog?: string;
    filePath?: string;
    signingToken?: string;
    sentAt?: Date;
    expiresAt?: Date;
    signedBy?: string[];
    derivedFromVersion?: number;
    renderedBy?: string;
    pdfSignedAt?: Date;
    changeMeta?: {
      action?: string;
      actorId?: string;
      actorRole?: string;
      signingMode?: string;
      baseVersion?: number;
      derivedFromVersion?: number;
      signedAt?: Date;
      source?: 'client' | 'server' | 'system';
    };
  }[];
  auditTrailVersion?: number;
  completedAt?: Date;
  finalizedAt?: Date;
  derivedFromDocumentId?: string | { toString(): string };
  derivedFromVersion?: number;
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
  | 'voided'
  | 'pending';
  token?: string;
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
  usageCount?: number;
  isTemplate?: boolean;
  statusBeforeDelete?: string;
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
export interface SignatureInitial {
  id: string; // unique id to identify
  value: string; // either text initials or dataURL for image
  type: "typed" | "drawn"; // how it was created
  isDefault: boolean;
}
export type itemTypes = "Signature" | "Initials" | "Stamp";
