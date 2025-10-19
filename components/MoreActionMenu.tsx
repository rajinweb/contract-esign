'use client'
import { Ellipsis, LucideProps } from 'lucide-react';
import { Button } from './Button';

interface MenuItem  {
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  subtext?: string;
  subIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  type?: 'checkbox' | 'divider';
  checked?: boolean;
  className?: string;
  action?: () => void;
}

interface MoreActionsProps {
  menuItems: MenuItem[];
  triggerIcon?: React.ComponentType<LucideProps>;
}

const MoreActions: React.FC<MoreActionsProps> = ({ menuItems, triggerIcon: TriggerIcon }) => {
  return (
    <div className="relative inline-block text-left group">
      {/* Button */}
      <Button inverted title="More Actions" icon={TriggerIcon ? <TriggerIcon size={16} /> : <Ellipsis size={16} />}/>

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
                onClick={() => {
                  if (item.action) {
                    item.action();
                  }
                }}
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
