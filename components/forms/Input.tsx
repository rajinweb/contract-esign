import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | boolean;
  ref?: React.Ref<HTMLInputElement>;
  readOnly?: boolean;
  className?: string;
};

const Input: React.FC<Props> = (props) => {
  const { label, error, readOnly, className = '', ref: inputRef, ...rest } = props;

  return (
    <label className="block">
      {label && <div className="text-sm text-gray-600 mb-1">{label}</div>}
      <input
        ref={inputRef}
        className={`block w-full border px-3 py-2 rounded ${readOnly ? 'cursor-default bg-transparent' : 'cursor-text bg-white'} ${className} ${error ? 'border-red-500' : ''}`}
        {...rest}
        readOnly={readOnly}
      />
      {error && typeof error === 'string' && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </label>
  );
};

export default Input;