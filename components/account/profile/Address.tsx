'use client';
import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Button } from '@/components/Button';
import Input from '@/components/forms/Input';
import { User } from '@/types/types';

interface AddressProps {
  user: User;
  isSaving: boolean;
  handleSave: (updated: Partial<User>) => Promise<void>;
}

interface AddressFormValues {
  country: string | null;
  street: string;
  apartment: string;
  city: string;
  state: string;
  zip: string;
}

export default function Address({ user, isSaving, handleSave }: AddressProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countries = countryList().getData();

  const defaultValues: AddressFormValues = useMemo(
    () => ({
      country: user.address?.country || null,
      street: user.address?.street || '',
      apartment: user.address?.apartment || '',
      city: user.address?.city || '',
      state: user.address?.state || '',
      zip: user.address?.zip || '',
    }),
    [user.address]
  );

  const { control, handleSubmit, reset } = useForm<AddressFormValues>({
    defaultValues,
  });

  const watchedValues = useWatch({ control });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const hasChanges = () => {
    const current = defaultValues;
    return (
      watchedValues.country !== current.country ||
      watchedValues.street !== current.street ||
      watchedValues.apartment !== current.apartment ||
      watchedValues.city !== current.city ||
      watchedValues.state !== current.state ||
      watchedValues.zip !== current.zip
    );
  };

  const onCancel = () => {
    reset(defaultValues);
    setIsEditing(false);
    setError(null);
  };

  const onSave = async (data: AddressFormValues) => {
    if (!data.country || !data.street || !data.city) {
      setError('Country, street, and city are required.');
      return;
    }

    if (!hasChanges()) {
      setIsEditing(false);
      return;
    }

    try {
      await handleSave({ address: { ...data, country: data.country || undefined } });
      setIsEditing(false);
      setError(null);
    } catch {
      setError('Failed to save address. Please try again.');
    }
  };

  return (
    <div className="rounded-xl border p-6 bg-white shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Address</h2>
        <Button
          onClick={isEditing ? onCancel : () => setIsEditing(true)}
          inverted
          className="h-8 !p-2 border-0 text-xs"
          label={isEditing ? 'Cancel' : 'Change'}
        />
      </div>

      {!isEditing && (
        <div className="space-y-1 text-sm text-slate-600">
          <p>{defaultValues.street || 'Not added'}{defaultValues.apartment ? `, ${defaultValues.apartment}` : ''}</p>
          <p>{defaultValues.city || ''}{defaultValues.state ? `, ${defaultValues.state}` : ''}{defaultValues.zip ? `, ${defaultValues.zip}` : ''}</p>
          <p>{defaultValues.country || 'Not selected'}</p>
        </div>
      )}

      {isEditing && (
        <form className="space-y-4" onSubmit={handleSubmit(onSave)}>
          <div className="snr-form-group">
            <label className="snr-form-group__label text-xs font-medium mb-1">Country / Region</label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={countries}
                  value={countries.find(c => c.value === field.value) || null}
                  onChange={val => field.onChange(val?.value || null)}
                  classNamePrefix="snr-Select"
                />
              )}
            />
          </div>

          <Input
            label="Street Address"
            placeholder="E.g. 123 Main Avenue"
            {...control.register('street')}
            className="snr-input snr-input--sm w-full"
          />

          <Input
            label="Apartment / Suite / Unit"
            placeholder="E.g. Apt #7"
            {...control.register('apartment')}
            className="snr-input snr-input--sm w-full"
          />

          <Input
            label="City / Town"
            placeholder="Enter a city or town"
            {...control.register('city')}
            className="snr-input snr-input--sm w-full"
          />

          <Input
            label="State / Region / Province"
            placeholder="Enter state, region or province"
            {...control.register('state')}
            className="snr-input snr-input--sm w-full"
          />

          <Input
            label="ZIP / Postal Code"
            placeholder="Enter ZIP / Postal Code"
            {...control.register('zip')}
            className="snr-input snr-input--sm w-full"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button
            type="submit"
            disabled={isSaving || !hasChanges()}
            label={isSaving ? 'Saving...' : 'Save Changes'}
            className="snr-btn snr-btn--primary snr-btn--sm snr-btn--auto-width"
          />
        </form>
      )}
    </div>
  );
}
