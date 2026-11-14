interface StageOverlayProps {
  visible: boolean;
  title: string;
  text: string;
}

export function StageOverlay({ visible, title, text }: StageOverlayProps) {
  return (
    <div className={visible ? 'overlay show' : 'overlay'} role="alertdialog" aria-live="polite" aria-hidden={!visible}>
      <div className="dialog">
        <div className="spinner" />
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
