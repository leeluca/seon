import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { t } from '@lingui/core/macro';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '~/utils';
import { blockNonNumberInput } from '~/utils/validation';
import { Button } from './button';
import { Input } from './input';

interface NumberInputContextValue {
  value: number | undefined;
  setValue: React.Dispatch<React.SetStateAction<number | undefined>>;
  min: number;
  max: number;
  stepper?: number;
  buttonStacked?: boolean;
  ref: React.MutableRefObject<HTMLInputElement | null>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  handleBlur?: () => void;
  handleIncrement?: () => void;
  handleDecrement?: () => void;
}

const NumberInputContext = createContext<NumberInputContextValue | null>(null);

export interface NumberInputRootProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  stepper?: number;
  buttonStacked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  children?: React.ReactNode;
}

function useCombinedRef(
  externalRef: React.Ref<HTMLInputElement> | undefined,
): React.RefObject<HTMLInputElement> {
  const internalRef = useRef<HTMLInputElement>(null);
  return (
    externalRef && typeof externalRef !== 'function' ? externalRef : internalRef
  ) as React.RefObject<HTMLInputElement>;
}

function useNumberInput({
  value: controlledValue,
  defaultValue,
  min = -Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  buttonStacked,
  stepper,
  onChange,
}: NumberInputRootProps) {
  const [value, setValue] = useState<number | undefined>(
    controlledValue ?? defaultValue,
  );
  const internalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  const handleIncrement = useCallback(() => {
    setValue((prev) => {
      const newVal =
        prev === undefined
          ? Math.min(stepper ?? 1, max)
          : Math.min(prev + (stepper ?? 1), max);
      if (internalRef.current) {
        internalRef.current.value = String(newVal ?? '');
        onChange?.({
          target: internalRef.current,
          currentTarget: internalRef.current,
        } as React.ChangeEvent<HTMLInputElement>);
      }
      return newVal;
    });
  }, [stepper, max, onChange]);

  const handleDecrement = useCallback(() => {
    setValue((prev) => {
      const newVal =
        prev === undefined
          ? Math.max(-(stepper ?? 1), min)
          : Math.max(prev - (stepper ?? 1), min);
      if (internalRef.current) {
        internalRef.current.value = String(newVal ?? '');
        onChange?.({
          target: internalRef.current,
          currentTarget: internalRef.current,
        } as React.ChangeEvent<HTMLInputElement>);
      }
      return newVal;
    });
  }, [stepper, min, onChange]);

  const handleBlur = useCallback(() => {
    if (value !== undefined) {
      if (value < min) {
        setValue(min);
        if (internalRef.current) {
          internalRef.current.value = String(min);
        }
      } else if (value > max) {
        setValue(max);
        if (internalRef.current) {
          internalRef.current.value = String(max);
        }
      }
    }
  }, [min, max, value]);

  return {
    value,
    setValue,
    min,
    max,
    stepper,
    buttonStacked,
    ref: internalRef,
    onChange,
    handleBlur,
    handleIncrement,
    handleDecrement,
  };
}

export function NumberInputRoot({ children, ...props }: NumberInputRootProps) {
  const contextValue = useNumberInput(props);
  return (
    <NumberInputContext.Provider value={contextValue}>
      <div className="flex items-center">{children}</div>
    </NumberInputContext.Provider>
  );
}

export interface NumberInputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
}

export function NumberInputField({
  inputRef,
  className,
  ...props
}: NumberInputFieldProps) {
  const context = useContext(NumberInputContext);
  const combinedRef = useCombinedRef(inputRef);

  useEffect(() => {
    // Sync context ref with combined ref
    if (combinedRef.current && context?.ref) {
      context.ref.current = combinedRef.current;
    }
  }, [combinedRef, context]);

  if (!context) return null;

  const { value, onChange, handleBlur, buttonStacked } = context;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitizedValueString = rawValue.replace(/[^0-9]/g, '');
    let newVal: number | undefined = Number.parseInt(sanitizedValueString, 10);

    if (Number.isNaN(newVal)) {
      newVal = undefined;
    } else {
      if (context.min !== undefined && newVal < context.min) {
        newVal = context.min;
      }
      if (context.max !== undefined && newVal > context.max) {
        return;
      }
    }

    context.setValue(newVal);

    // Update the event target's value for external handlers
    e.target.value = newVal !== undefined ? String(newVal) : '';

    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      context.handleIncrement?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      context.handleDecrement?.();
    } else {
      blockNonNumberInput(e);
    }
  };

  return (
    <Input
      value={value ?? ''}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      ref={combinedRef}
      className={cn(
        buttonStacked ? 'rounded-r-none focus-visible:z-1' : '',
        className,
      )}
      {...props}
    />
  );
}

export interface NumberInputButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction?: 'inc' | 'dec';
}

export function NumberInputButton({
  direction = 'inc',
  className,
  ...props
}: NumberInputButtonProps) {
  const context = useContext(NumberInputContext);
  if (!context) return null;

  const { value, max, min, buttonStacked, handleIncrement, handleDecrement } =
    context;
  const isDisabled =
    (direction === 'inc' && value === max) ||
    (direction === 'dec' && value === min);

  const handleClick = () => {
    if (direction === 'inc') {
      handleIncrement?.();
    } else {
      handleDecrement?.();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      variant="outline"
      type="button"
      className={cn(
        {
          'border-input h-[18px] px-2 focus-visible:relative': buttonStacked,
          'rounded-l-none rounded-br-none border-b-0 border-l-0':
            buttonStacked && direction === 'inc',
          'rounded-l-none rounded-tr-none border-t-[0.5px] border-l-0':
            buttonStacked && direction === 'dec',
        },
        className,
      )}
      aria-label={direction === 'inc' ? t`Increase` : t`Decrease`}
      {...props}
    >
      {direction === 'inc' ? (
        <ChevronUp size={15} />
      ) : (
        <ChevronDown size={15} />
      )}
    </Button>
  );
}

export const NumberInput = {
  Root: NumberInputRoot,
  Field: NumberInputField,
  Button: NumberInputButton,
};
