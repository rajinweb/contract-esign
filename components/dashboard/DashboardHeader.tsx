import UserDropdown from '../UserDropdown';
import { Bell, CircleQuestionMark } from 'lucide-react';
import Link from 'next/link';

const DashboardHeader = () => {
    return (
      <>            
        <button className="p-2 border rounded text-sm">Contact Sales</button>
        <Link className="p-2 bg-orange-500 text-white rounded text-sm" href="/pricing"> Select Plan </Link>
        <Bell className="h-4 w-4"/>                
        <CircleQuestionMark className="h-4 w-4 mr-2"/>
        <UserDropdown />
      </>
    );
}

export default DashboardHeader;  
