import React, { useEffect, useState } from 'react';

interface PreviewProps {
  code: string;
  language: string;
}

export function CodePreview({ code, language }: PreviewProps) {
  const [iframeSrc, setIframeSrc] = useState<string>('');

  useEffect(() => {
    if (!code) return;

    // Simple strategy: If it looks like a full HTML or we can wrap it in a basic React-like environment
    // For now, let's assume the agent generates HTML/Tailwind/JS for the simplest preview.
    // If it's React, we'd need a more advanced runner. We'll try to handle basic HTML/Tailwind.
    
    const isHtml = code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<html');
    
    let doc = '';
    if (isHtml) {
      doc = code;
    } else {
      // Wrap in a Tailwind-enabled HTML container
      doc = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
            <style>
              body { margin: 0; font-family: sans-serif; }
            </style>
          </head>
          <body>
            <div id="app"></div>
            ${language === 'tsx' || language === 'jsx' ? `
              <script type="text/babel">
                // Simulating a React render if needed, but for now just raw HTML injection
                document.getElementById('app').innerHTML = \`${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
              </script>
            ` : `
              <div id="root">${code}</div>
            `}
          </body>
        </html>
      `;
    }

    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setIframeSrc(url);

    return () => URL.revokeObjectURL(url);
  }, [code, language]);

  return (
    <div className="w-full h-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {!code ? (
        <div className="flex items-center justify-center h-full text-gray-400 italic">
          No preview available. Generate some code first.
        </div>
      ) : (
        <iframe
          id="preview-frame"
          src={iframeSrc}
          className="w-full h-full border-none"
          title="Product Preview"
          sandbox="allow-scripts"
        />
      )}
    </div>
  );
}
