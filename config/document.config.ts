import type { ComponentType } from 'react';
import {
    User,
    Settings,
    Trash2,
    FileStack,
    Layers,
} from 'lucide-react';


import TemplatesPage from '@/app/templates/page';
import TrashPage from '@/app/trash/page';
import DocumentList from '@/components/DocumentList';

export type DocumentSection =
    | 'dash-documents'
    | 'templates'
    | 'my-templates'
    | 'system-templates'
    | 'trash';

export type SectionComponentProps = {
    searchQuery?: string;
    view?: 'my' | 'system';
};

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
        icon: FileStack as React.ElementType,
        component: DocumentList as ComponentType<SectionComponentProps>,
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
        component: TrashPage as ComponentType<SectionComponentProps>,
    },
] as const;
export const SECTION_TO_ROUTE: Partial<Record<DocumentSection, string>> = {
    'dash-documents': '/dashboard',
    'trash': '/trash',
};

export const SECTION_TO_VIEW: Partial<Record<DocumentSection, 'my' | 'system'>> = {
    'my-templates': 'my',
    'system-templates': 'system',
};
