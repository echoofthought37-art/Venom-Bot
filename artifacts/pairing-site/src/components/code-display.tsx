import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodeDisplayProps {
  code: string;
  label?: string;
  size?: 'default' | 'large';
}

export function CodeDisplay({ code, label, size = 'default' }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
          {label}
        </p>
      )}
      <div className="relative group">
        <div
          className={`font-mono bg-card border border-primary/30 rounded-lg flex items-center justify-between gap-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg ${
            size === 'large' ? 'px-8 py-6 text-3xl' : 'px-6 py-4 text-xl'
          }`}
          data-testid="code-display"
        >
          <span className="text-primary font-semibold tracking-wider select-all">
            {code}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 p-2 rounded-md hover:bg-primary/10 transition-colors"
            data-testid="button-copy-code"
          >
            {copied ? (
              <Check className="w-5 h-5 text-primary" />
            ) : (
              <Copy className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
