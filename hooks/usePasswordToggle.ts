import { useState } from 'react';

const usePasswordToggle = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(prevVisible => !prevVisible);
  };

  return {
    isVisible,
    toggleVisibility,
  };
};

export default usePasswordToggle;