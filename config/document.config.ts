import type { ComponentType } from 'react';
import {
    User,
    Archive,
    Settings,
    Trash2,
    FileStack,
    Layers,
} from 'lucide-react';


import ArchivePage from '@/app/archive/page';
import TemplatesPage from '@/app/templates/page';
import TrashPage from '@/app/trash/page';
import DocumentList from '@/components/DocumentList';

export type DocumentSection =
    | 'dash-documents'
    | 'archive'
    | 'templates'
    | 'my-templates'
    | 'system-templates'
    | 'trash';

export type DocumentConfigItem = {
    id: DocumentSection;
    label: string;
    icon: React.ElementType;
    component?: ComponentType;
    children?: readonly DocumentConfigItem[];
};

export const DOCUMENT_CONFIG: readonly DocumentConfigItem[] = [
    {
        id: 'dash-documents',
        label: 'Documents',
        icon: FileStack,
        component: DocumentList as ComponentType,
    },
    {
        id: 'archive',
        label: 'Archive',
        icon: Archive,
        component: ArchivePage,
    },
    {
        id: 'templates',
        label: 'Templates',
        icon: Layers,
        children: [
            {
                id: 'my-templates',
                label: 'My Templates',
                icon: User,
                component: TemplatesPage,
            },
            {
                id: 'system-templates',
                label: 'System Templates',
                icon: Settings,
                component: TemplatesPage,
            },
        ],
    },
    {
        id: 'trash',
        label: 'Trash',
        icon: Trash2,
        component: TrashPage,
    },
] as const;
export const SECTION_TO_ROUTE: Partial<Record<DocumentSection, string>> = {
    'dash-documents': '/dashboard',
    archive: '/archive',
    trash: '/trash',
};

export const SECTION_TO_VIEW: Partial<Record<DocumentSection, 'my' | 'system'>> = {
    'my-templates': 'my',
    'system-templates': 'system',
};
