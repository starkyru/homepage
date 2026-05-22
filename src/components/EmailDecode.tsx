'use client';

import { useEffect } from 'react';

export default function EmailDecode() {
  useEffect(() => {
    document.querySelectorAll('.email-protected').forEach((el) => {
      const u = atob((el as HTMLElement).dataset.u ?? '');
      const d = atob((el as HTMLElement).dataset.d ?? '');
      const email = u + '@' + d;
      const link = document.createElement('a');
      link.href = 'mailto:' + email;
      link.textContent = email;
      el.replaceWith(link);
    });
  }, []);

  return null;
}
