'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconHelpCircle
} from '@tabler/icons-react';

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'success';
}

interface DialogState extends DialogOptions {
  isOpen: boolean;
  type: 'confirm' | 'alert';
}

interface DialogContextValue {
  confirm: (options: DialogOptions | string) => Promise<boolean>;
  alert: (options: DialogOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    message: ''
  });

  const resolverRef = useRef<((val: any) => void) | null>(null);

  const confirm = useCallback((options: DialogOptions | string): Promise<boolean> => {
    const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        ...opts,
        title: opts.title ?? 'Confirmation Required',
        confirmText: opts.confirmText ?? 'Yes, Confirm',
        cancelText: opts.cancelText ?? 'No, Cancel',
        variant: opts.variant ?? 'default',
        isOpen: true,
        type: 'confirm'
      });
    });
  }, []);

  const alert = useCallback((options: DialogOptions | string): Promise<void> => {
    const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      setDialogState({
        ...opts,
        title: opts.title ?? (opts.variant === 'destructive' ? 'Notice / Error' : 'Success'),
        confirmText: opts.confirmText ?? 'OK',
        variant: opts.variant ?? 'default',
        isOpen: true,
        type: 'alert'
      });
    });
  }, []);

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    resolverRef.current?.(true);
    resolverRef.current = null;
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    resolverRef.current?.(false);
    resolverRef.current = null;
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {dialogState.isOpen && (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150'>
          <div
            className='bg-card border-border text-card-foreground w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-150'
            role='dialog'
            aria-modal='true'
          >
            <div className='flex items-start gap-4'>
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                  dialogState.variant === 'destructive'
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                    : dialogState.variant === 'success'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-primary/15 text-primary'
                }`}
              >
                {dialogState.variant === 'destructive' ? (
                  <IconAlertTriangle className='size-6' />
                ) : dialogState.variant === 'success' ? (
                  <IconCircleCheck className='size-6' />
                ) : dialogState.type === 'confirm' ? (
                  <IconHelpCircle className='size-6' />
                ) : (
                  <IconInfoCircle className='size-6' />
                )}
              </div>

              <div className='min-w-0 flex-1'>
                <h3 className='text-base font-bold text-foreground leading-snug'>
                  {dialogState.title}
                </h3>
                <div className='text-muted-foreground mt-2 text-sm leading-relaxed whitespace-pre-line'>
                  {dialogState.message}
                </div>
              </div>
            </div>

            <div className='mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border/60'>
              {dialogState.type === 'confirm' ? (
                <>
                  <button
                    type='button'
                    onClick={handleCancel}
                    className='rounded-lg border border-border bg-muted/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer'
                  >
                    {dialogState.cancelText}
                  </button>
                  <button
                    type='button'
                    onClick={handleConfirm}
                    className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer ${
                      dialogState.variant === 'destructive'
                        ? 'bg-red-600 hover:bg-red-700 ring-1 ring-red-500/50'
                        : dialogState.variant === 'success'
                          ? 'bg-emerald-600 hover:bg-emerald-700 ring-1 ring-emerald-500/50'
                          : 'bg-blue-600 hover:bg-blue-700 ring-1 ring-blue-500/50'
                    }`}
                  >
                    {dialogState.confirmText}
                  </button>
                </>
              ) : (
                <button
                  type='button'
                  onClick={handleConfirm}
                  className='rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer ring-1 ring-blue-500/50'
                >
                  {dialogState.confirmText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return ctx;
}
