'use client'
import { useEffect, useMemo, forwardRef } from "react";
import { InputProps } from '@/types/types';
import Input from '@/components/forms/Input';


const DateField = forwardRef<HTMLInputElement, Omit<InputProps, "ref">>((props, ref) => {
  const {textInput, defaultDate, readOnly, className} = props;
  const text = useMemo(() => {
    if (!defaultDate) return '';
    const parsedDate = new Date(defaultDate);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return parsedDate.toISOString().substring(0, 10);
  }, [defaultDate]);
  
  useEffect(() => {
    if (ref && 'current' in ref && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [ref]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    textInput(value)
  };

  return (
        <Input
          ref={ref}
          value={text}
          onChange={handleChange}
          type="date"
          className={className || "text-xs text-center"}
          readOnly={readOnly}
        />

  );
})
DateField.displayName= 'DateField';
export default DateField
