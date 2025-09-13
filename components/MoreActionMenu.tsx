import {
  Download,
  History,
  FileText,
  LayoutDashboard,
  Keyboard,
  Globe,
  HelpCircle,
  Star,
  Ellipsis
} from 'lucide-react';

const menuItems = [
  { label: 'Download', icon: Download },
  { label: 'Download with History', icon: History },
  { label: 'History', icon: History },
  { type: 'divider' },
  { label: 'Import Fields from Other Documents', icon: FileText, subtext: 'Payment Request', subIcon: FileText },
  { label: 'Payment Request', icon: LayoutDashboard },
  { type: 'divider' },
  { label: 'Show Editing Tools', icon: LayoutDashboard, type: 'checkbox', checked: true },
  { label: 'Enable Field Snapping', icon: Keyboard, type: 'checkbox', checked: false },
  { type: 'divider' },
  { label: 'Keyboard Shortcuts', icon: Keyboard },
  { label: 'Language', icon: Globe },
  { type: 'divider' },
  { label: 'Support', icon: HelpCircle },
  { label: 'Upgrade Subscription', icon: Star, className: 'text-yellow-500' },
];

const MoreActions = () => {
  return (
    <div className="relative inline-block text-left group">
      {/* Button */}
      <button className="iconButton border border-gray-300 text-md" title="More Actions" >
        <Ellipsis size={16} />
      </button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible group-hover:opacity-100 group-hover:visible transform scale-95 group-focus-within:scale-100 group-hover:scale-100 transition-all duration-150 z-50">
        <div className="py-1">
          {menuItems.map((item, index) => {
            if (item.type === 'divider') return <div key={index} className="border-t border-gray-200 my-1 mx-2" />;

            const Icon = item.icon;
            const SubIcon = item.subIcon;

            return (
              <div
                key={index}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                {item.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className="form-checkbox h-4 w-4 text-indigo-600 rounded mr-2"
                  />
                ) : (
                  Icon && <Icon className={`h-5 w-5 mr-3 ${item.className || 'text-gray-400'}`} />
                )}
                <div className="flex-1 flex flex-col">
                  <span className="font-medium text-gray-600">{item.label}</span>
                  {item.subtext && (
                    <div className="text-gray-500 text-xs mt-0.5 flex items-center">
                      {SubIcon && <SubIcon className="h-3 w-3 mr-1" />}
                      {item.subtext}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MoreActions;
