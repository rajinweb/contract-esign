import type { ComponentType } from 'react';
import {
    User,
    CreditCard,
    Settings,
    Bell,
    Puzzle,
    Cloud,
    Users,
    Building2,
    ShieldCheck,
} from 'lucide-react';

import ProfilePage from '@/app/account/profile/page';
import Subscription from '@/app/account/subscription/page';
import SettingsPage from '@/app/account/settings/page';
import PaymentServices from '@/app/account/paymentServices/page';
import NotificationSettings from '@/app/account/notificationSettings/page';
import Integrations from '@/app/account/integrations/page';
import CloudStorage from '@/app/account/cloudStorage/page';
import MyTeams from '@/app/account/myTeams/page';
import MyOrganizations from '@/app/account/myOrganizations/page';
import AuditTrail from '@/app/account/auditTrail/page';

export type AccountSection =
    | 'profile'
    | 'subscription'
    | 'settings'
    | 'payment-services'
    | 'notifications'
    | 'integrations'
    | 'cloud-storages'
    | 'my-teams'
    | 'organization'
    | 'audit-trail';

export type AccountConfigItem = {
    id: AccountSection;
    label: string;
    icon: React.ElementType;
    component: ComponentType;
};

export const ACCOUNT_CONFIG: readonly AccountConfigItem[] = [
    {
        id: 'profile',
        label: 'User Profile',
        icon: User,
        component: ProfilePage,
    },
    {
        id: 'subscription',
        label: 'Subscription',
        icon: CreditCard,
        component: Subscription,
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        component: SettingsPage,
    },
    {
        id: 'payment-services',
        label: 'Payment Services',
        icon: CreditCard,
        component: PaymentServices,
    },
    {
        id: 'notifications',
        label: 'Notification Settings',
        icon: Bell,
        component: NotificationSettings,
    },
    {
        id: 'integrations',
        label: 'Integrations',
        icon: Puzzle,
        component: Integrations,
    },
    {
        id: 'cloud-storages',
        label: 'Cloud Storage',
        icon: Cloud,
        component: CloudStorage,
    },
    {
        id: 'my-teams',
        label: 'My Teams',
        icon: Users,
        component: MyTeams,
    },
    {
        id: 'organization',
        label: 'My Organizations',
        icon: Building2,
        component: MyOrganizations,
    },
    {
        id: 'audit-trail',
        label: 'Audit Trail',
        icon: ShieldCheck,
        component: AuditTrail,
    },
] as const;
