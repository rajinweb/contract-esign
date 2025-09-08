import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | boolean;
  // allow register's ref to be passed as a normal prop
  ref?: any;
};

const Input: React.FC<Props> = (props) => {
  // pick up the ref that may be passed in via {...register(...)}
  const { label, error, className = '', ref: inputRef, ...rest } = props as any;

  return (
    <label className="block">
      {label && <div className="text-sm text-gray-600 mb-1">{label}</div>}
      <input
        ref={inputRef}
        className={`mt-1 block w-full border px-3 py-2 rounded ${className} ${error ? 'border-red-500' : ''}`}
        {...rest}
      />
      {error && typeof error === 'string' && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </label>
  );
};

export default Input;