'use client';

import { useEffect } from 'react';

export default function EmailDecode() {
  useEffect(() => {
    document.querySelectorAll('.email-protected').forEach((el) => {
      const u = atob((el as HTMLElement).dataset.u ?? '');
      const d = atob((el as HTMLElement).dataset.d ?? '');
      el.textContent = u + '@' + d;
    });
  }, []);

  return null;
}
