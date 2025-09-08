import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  ref?: any;
};

const Checkbox: React.FC<Props> = (props) => {
  const { label, className = '', ref: inputRef, ...rest } = props as any;

  return (
    <label className="inline-flex items-center space-x-2">
      <input ref={inputRef} type="checkbox" className={`form-checkbox h-4 w-4 ${className}`} {...rest} />
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};

export default Checkbox;