import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, X, MapPin, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadPackage } from '../api/http';
import { getPhotoUrl } from '../utils/images';

export function Button({ children, secondary, busy, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`${secondary ? 'btn-secondary' : 'btn'} ${className}`}
      aria-busy={busy || undefined}
    >
      {busy && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="page-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </header>
  );
}

export function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading holiday details" className="stack">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <span className="muted">Bringing your holiday details together…</span>
    </div>
  );
}

export function ErrorState({ error, retry, title = 'A little pause in the journey' }) {
  return (
    <section className="state card" role="alert">
      <AlertCircle size={32} />
      <h2>{error?.status === 404 ? 'Not found' : title}</h2>
      <p>{error?.message || 'Something went wrong. Please try again.'}</p>
      {retry && <Button secondary onClick={retry}>Try again</Button>}
    </section>
  );
}

export function EmptyState({ title, children }) {
  return (
    <section className="state card">
      <MapPin size={32} />
      <h2>{title}</h2>
      <p>{children}</p>
      <Link className="btn" to="/plan">Plan a holiday <ArrowRight size={16} /></Link>
    </section>
  );
}

export function Modal({ title, children, onClose, maxWidth = '880px' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const before = document.activeElement;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    const handle = e => {
      e.preventDefault();
      closeRef.current();
    };
    dialog?.addEventListener('cancel', handle);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.removeEventListener('cancel', handle);
      if (dialog && dialog.open) dialog.close();
      document.body.style.overflow = old;
      before?.focus();
    };
  }, []);

  return (
    <dialog ref={ref} className="modal-popup" style={{ maxWidth }} aria-labelledby="modal-title">
      <header className="modal-header">
        <div>
          <p className="eyebrow">Customize Your Holiday</p>
          <h2 id="modal-title">{title}</h2>
        </div>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

export function ExportButton({ id }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div>
      <Button
        secondary
        busy={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await downloadPackage(id);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={16} /> Download JSON
      </Button>
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}

export function Photo({ src, alt, className = '', style }) {
  const resolvedSrc = getPhotoUrl(src, alt);
  const [failed, setFailed] = useState(false);

  return resolvedSrc && !failed ? (
    <img
      className={className}
      style={style}
      src={resolvedSrc}
      alt={alt || 'Travel Photo'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`photo-placeholder ${className}`} style={style} role="img" aria-label={alt}>
      <MapPin size={28} />
    </div>
  );
}
