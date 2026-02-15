import { useState } from 'react';

export const useDashboardSidebar = () => {
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);

  const handleToggleChange = (collapsed: boolean) => {
    setIsSecondaryCollapsed(collapsed);
  };

  return {
    isSecondaryCollapsed,
    handleToggleChange,
  };
};
