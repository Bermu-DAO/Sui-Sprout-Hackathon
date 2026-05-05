'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { CreateBrandFormData } from '@/lib/coin-publisher/validateCreateBrandForm';
import {
  getCreateBrandFormErrors,
  isCreateBrandFormValid,
} from '@/lib/coin-publisher/validateCreateBrandForm';

const EMPTY_FORM: CreateBrandFormData = {
  name: '',
  symbol: '',
  description: '',
  iconUrl: '',
  maxSupply: '',
};

interface CreateBrandFormProps {
  onSubmit: (data: CreateBrandFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function CreateBrandForm({
  onSubmit,
  isLoading = false,
  disabled = false,
}: CreateBrandFormProps) {
  const [data, setData] = useState<CreateBrandFormData>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof CreateBrandFormData, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const fieldErrors = useMemo(() => getCreateBrandFormErrors(data), [data]);

  const visibleFieldError = (key: keyof CreateBrandFormData): string | undefined => {
    if (!touched[key] && !submitAttempted) return undefined;
    return fieldErrors[key];
  };

  const markTouched = (key: keyof CreateBrandFormData) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const canSubmit = useMemo(() => isCreateBrandFormValid(data), [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!isCreateBrandFormValid(data)) return;
    onSubmit(data);
  };

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-lg border bg-white px-4 py-3 text-sm font-sans text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
      hasError
        ? 'border-red-400 focus:ring-red-400'
        : 'border-ink-300/40 focus:ring-ink-900'
    }`;

  const nameErr = visibleFieldError('name');
  const symbolErr = visibleFieldError('symbol');
  const descriptionErr = visibleFieldError('description');
  const iconUrlErr = visibleFieldError('iconUrl');
  const maxSupplyErr = visibleFieldError('maxSupply');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-serif font-medium text-ink-700 mb-2">
            Token Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={data.name}
            onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
            onBlur={() => markTouched('name')}
            placeholder="e.g. Brand USDC"
            className={inputClass(!!nameErr)}
            disabled={disabled}
          />
          {nameErr && <p className="mt-1.5 text-xs text-red-600">{nameErr}</p>}
        </div>
        <div>
          <label htmlFor="symbol" className="block text-sm font-serif font-medium text-ink-700 mb-2">
            Token Symbol <span className="text-red-500">*</span>
          </label>
          <input
            id="symbol"
            type="text"
            value={data.symbol}
            onChange={(e) => setData((d) => ({ ...d, symbol: e.target.value }))}
            onBlur={() => markTouched('symbol')}
            placeholder="e.g. bUSDC"
            className={inputClass(!!symbolErr)}
            disabled={disabled}
          />
          {symbolErr && <p className="mt-1.5 text-xs text-red-600">{symbolErr}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-serif font-medium text-ink-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={data.description}
          onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
          onBlur={() => markTouched('description')}
          placeholder="e.g. Brand USDC stablecoin backed by USDC"
          rows={3}
          className={`${inputClass(!!descriptionErr)} resize-none`}
          disabled={disabled}
        />
        {descriptionErr && <p className="mt-1.5 text-xs text-red-600">{descriptionErr}</p>}
      </div>

      <div>
        <label htmlFor="iconUrl" className="block text-sm font-serif font-medium text-ink-700 mb-2">
          Icon URL <span className="text-red-500">*</span>
        </label>
        <input
          id="iconUrl"
          type="url"
          value={data.iconUrl}
          onChange={(e) => setData((d) => ({ ...d, iconUrl: e.target.value }))}
          onBlur={() => markTouched('iconUrl')}
          placeholder="https://..."
          className={inputClass(!!iconUrlErr)}
          disabled={disabled}
        />
        {iconUrlErr && <p className="mt-1.5 text-xs text-red-600">{iconUrlErr}</p>}
      </div>

      <div>
        <label htmlFor="maxSupply" className="block text-sm font-serif font-medium text-ink-700 mb-2">
          Max Supply <span className="text-red-500">*</span>
        </label>
        <input
          id="maxSupply"
          type="text"
          inputMode="decimal"
          value={data.maxSupply}
          onChange={(e) => {
            if (/^\d*\.?\d*$/.test(e.target.value)) {
              setData((d) => ({ ...d, maxSupply: e.target.value }));
            }
          }}
          onBlur={() => markTouched('maxSupply')}
          placeholder="e.g. 1000000"
          className={inputClass(!!maxSupplyErr)}
          disabled={disabled}
        />
        {maxSupplyErr && <p className="mt-1.5 text-xs text-red-600">{maxSupplyErr}</p>}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={disabled || isLoading || !canSubmit}
        isLoading={isLoading}
      >
        {isLoading ? 'Processing...' : 'Create Brand Stablecoin'}
      </Button>
    </form>
  );
}
