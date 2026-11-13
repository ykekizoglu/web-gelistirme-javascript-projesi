import { useLayoutEffect, useRef } from 'react';

export default function useDialog(initialFocus) {
  const dialog = useRef(null);
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    initialFocus?.current?.focus();
    return () => {
      element.close();
      if (previous?.isConnected) previous.focus();
      else document.querySelector('[data-new-application]')?.focus();
    };
  }, []);
  return dialog;
}
