import ToastMessage from './ToastMessage';
import type { ToastProps } from './types';

/**
 * Figma "Feedback/Toast": a short confirmation with an optional action, centred 24px above
 * the wizard's action bar. The status region stays in the page, so that every new
 * message is announced.
 */
export default function Toast({ toast, onAction, holdAction = false, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-104 z-30 flex justify-center px-16"
    >
      {toast && (
        <ToastMessage
          key={toast.id}
          toast={toast}
          onAction={onAction}
          holdAction={holdAction}
          onDismiss={onDismiss}
        />
      )}
    </div>
  );
}
