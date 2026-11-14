interface TopBarProps {
  statusText: string;
  online: boolean;
}

export function TopBar({ statusText, online }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <img className="brandmark" src="/icon-192.png" alt="" width={31} height={31} />
        <span>
          VYBE <span className="go">GO</span>
        </span>
      </div>
      <div className="status" role="status" aria-live="polite">
        <span className={online ? 'dot' : 'dot off'} />
        <span>{statusText}</span>
      </div>
    </header>
  );
}
