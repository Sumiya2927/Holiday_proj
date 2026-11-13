export default function ValidationMessage({ children, id }) { return children ? <p className="field-error" id={id} role="alert">{children}</p> : null; }
