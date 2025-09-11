import React from 'react';
import UserDropdown from '../UserDropdown';
import { Bell, CircleQuestionMark } from 'lucide-react';
import DocSearch from './DocSearch';
import Link from 'next/link';

type DashboardHeaderProps = {
  docSearchQuery: string;
  setDocSearchQuery: (q: string) => void;
};
const DashboardHeader = ({ docSearchQuery, setDocSearchQuery }: DashboardHeaderProps) => {
    return (
        <header className="flex items-center justify-end  border-b  gap-4 px-6  bg-white h-16">
             <DocSearch
                docSearchQuery={docSearchQuery}
                setDocSearchQuery={setDocSearchQuery}
            />
            <button className="p-2 border rounded text-sm">Contact Sales</button>
            <Link className="p-2 bg-orange-500 text-white rounded text-sm" href="/pricing">
                Select Plan
            </Link>
            <Bell className="h-4 w-4"/>                
            <CircleQuestionMark className="h-4 w-4 mr-2"/>
            <UserDropdown />
        </header>
        );
}

export default DashboardHeader;  