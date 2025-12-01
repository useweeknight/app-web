/**
 * Input 组件
 *
 * 可复用的输入框组件
 */
import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="input-wrapper" style={{ width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              marginBottom: 'var(--spacing-xs)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input ${error ? 'input-error' : ''} ${className}`}
          style={{
            borderColor: error ? 'var(--color-error)' : undefined,
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            style={{
              marginTop: 'var(--spacing-xs)',
              fontSize: '0.75rem',
              color: 'var(--color-error)',
            }}
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            style={{
              marginTop: 'var(--spacing-xs)',
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

