import { ACCOUNT_CONFIG, AccountSection } from '@/config/account.config';

type Props = {
  active: AccountSection;
  onChange: (section: AccountSection) => void;
};

export default function AccountSidebar({ active, onChange }: Props) {
  return (
    <nav className="space-y-1">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">My Account</h2> 
      {ACCOUNT_CONFIG.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-l-4 transition
            ${
              active === id
                ? 'bg-slate-100 border-blue-600 text-slate-900'
                : 'border-transparent text-slate-700 hover:bg-slate-50'
            }`}
        >
          <Icon className="w-5 h-5 text-slate-600" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}
