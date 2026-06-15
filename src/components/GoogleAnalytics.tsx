import { useEffect } from 'react';

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

export function GoogleAnalytics() {
  useEffect(() => {
    if (!import.meta.env.PROD || !MEASUREMENT_ID) return;

    const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = scriptSrc;
    document.head.appendChild(gtagScript);

    const inlineScript = document.createElement('script');
    inlineScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${MEASUREMENT_ID}');
    `;
    document.head.appendChild(inlineScript);
  }, []);

  return null;
}
