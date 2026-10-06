import { useEffect, useState } from 'react';

// Mock account menu for the demo: the user and items are placeholders and do nothing.
const MOCK_USER = { name: 'Jordan Reyes', role: 'Warehouse Associate · Shift A', photo: '/avatar.svg' };
const ITEMS = ['My profile', 'My shifts', 'Cycle counts', 'Receiving', 'Settings', 'Help', 'Sign out'];

export default function UserMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="user-menu">
      <button
        className="burger"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="user-menu-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div id="user-menu-panel" className="menu-panel" role="menu">
            <div className="menu-user">
              <img src={MOCK_USER.photo} alt="" width="44" height="44" />
              <div>
                <div className="strong">{MOCK_USER.name}</div>
                <div className="muted small">{MOCK_USER.role}</div>
              </div>
            </div>
            <ul>
              {ITEMS.map((item) => (
                <li key={item} role="menuitem" aria-disabled="true">
                  {item}
                </li>
              ))}
            </ul>
            <p className="muted small menu-note">Demo menu — items are not active.</p>
          </div>
        </>
      )}
    </div>
  );
}
