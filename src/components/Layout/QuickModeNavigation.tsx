import TinyTitansIcon from "../TinyTitansIcon";
import AnimatedAnimalIcon from "../AnimatedAnimalIcon";
import type { WorkspacePresentation } from "../../services/workspacePresentationService";
import type { QuickNavItem } from "../../data/quickNavigation";
import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

type Props = {
  workspace: WorkspacePresentation;
  quickSearch: string;
  setQuickSearch: (value: string) => void;
  quickGroups: Record<string, QuickNavItem[]>;
  quickItems: QuickNavItem[];
  pinnedItems: QuickNavItem[];
  pinnedPaths: string[];
  recentItems: QuickNavItem[];
  moreOpen: boolean;
  onToggleMore: () => void;
  onClose: () => void;
  onOpenItem: (path: string) => void;
  onTogglePin: (path: string) => void;
};

function QuickModeNavigation({
  workspace,
  quickSearch,
  setQuickSearch,
  quickGroups,
  quickItems,
  pinnedItems,
  pinnedPaths,
  recentItems,
  moreOpen,
  onToggleMore,
  onClose,
  onOpenItem,
  onTogglePin,
}: Props) {
  const location = useLocation();
  const isActive = (path: string) => path === "/" ? location.pathname === "/" : location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen, onClose]);

  return (
    <>
      <nav className="app-navigation tt-easy-nav-strip" aria-label="Quick View navigation">
        <div className="tt-easy-nav-inner">
          <a className={`tt-easy-nav-link${isActive("/") ? " active" : ""}`} href="/" onClick={(event) => { event.preventDefault(); onOpenItem("/"); }}>
            <TinyTitansIcon name="home" size={24} /><small>At a Glance</small>
          </a>
          <a className={`tt-easy-nav-link${isActive("/animals") ? " active" : ""}`} href="/animals" onClick={(event) => { event.preventDefault(); onOpenItem("/animals"); }}>
            <AnimatedAnimalIcon size={24} /><small>{workspace.product.terminology.animals || "My Animals"}</small>
          </a>
          <a className={`tt-easy-nav-link${isActive("/reminders") ? " active" : ""}`} href="/reminders" onClick={(event) => { event.preventDefault(); onOpenItem("/reminders"); }}>
            <TinyTitansIcon name="reminders" size={24} /><small>Due</small>
          </a>
          <button ref={everythingButtonRef} type="button" data-route-guide-target="quick-more" className={`tt-easy-nav-link tt-easy-nav-more${moreOpen ? " active" : ""}`} onClick={onToggleMore} aria-expanded={moreOpen} aria-controls="tt-easy-more-menu">
            <TinyTitansIcon name="menu" size={24} /><small>Everything</small>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="tt-easy-more-backdrop" role="presentation" onClick={onClose}>
          <section
            id="tt-easy-more-menu"
            className="tt-easy-more"
            role="dialog"
            aria-modal="true"
            aria-label="Quick View full app navigation"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              const target = event.target as HTMLElement;
              if (target.tagName === "INPUT") return;
              const targets = Array.from(document.querySelectorAll<HTMLElement>("#tt-easy-more-menu [data-quick-nav-target='true']"));
              const index = targets.indexOf(target);
              if (index < 0 || targets.length === 0) return;
              event.preventDefault();
              const nextIndex = event.key === "ArrowDown"
                ? (index + 1) % targets.length
                : (index - 1 + targets.length) % targets.length;
              targets[nextIndex]?.focus();
            }}
          >
            <div className="tt-easy-more-head">
              <div>
                <span>QUICK VIEW · FULL APP</span>
                <h2>{workspace.product.name}</h2>
                <p>Quick View is the TinyTitans navigation — the full feature set remains available.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close full navigation"><TinyTitansIcon name="close" size={18} /></button>
            </div>

            <label className="tt-easy-search">
              <TinyTitansIcon name="search" size={20} />
              <input
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && quickItems[0]) {
                    event.preventDefault();
                    onOpenItem(quickItems[0].path);
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    document.querySelector<HTMLElement>("#tt-easy-more-menu [data-quick-nav-target='true']")?.focus();
                  }
                }}
                placeholder="Find anything in TinyTitans…"
                aria-label="Search the full TinyTitans app"
                autoFocus
              /><kbd aria-label="Keyboard shortcut Control K">Ctrl K</kbd>
            </label>

            {!quickSearch.trim() && pinnedItems.length > 0 && (
              <section className="tt-easy-more-group tt-easy-pinned">
                <h3><TinyTitansIcon name="pin" size={15} /> Pinned</h3>
                <div className="tt-easy-more-grid">
                  {pinnedItems.map((item) => (
                    <div className="tt-easy-feature-row" key={`pinned:${item.id}`}>
                      <button type="button" className="tt-easy-feature-link" data-quick-nav-target="true" onClick={() => onOpenItem(item.path)}>
                        <span className="app-navigation-icon" aria-hidden="true"><TinyTitansIcon name={item.icon} size={24} /></span>
                        <span><strong>{item.label}</strong><small>{item.description}</small></span>
                      </button>
                      <button type="button" className="tt-easy-pin-button active" onClick={() => onTogglePin(item.path)} aria-label={`Unpin ${item.label}`} title={`Unpin ${item.label}`}>
                        <TinyTitansIcon name="pin" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!quickSearch.trim() && recentItems.length > 0 && (
              <section className="tt-easy-more-group tt-easy-recent">
                <h3><TinyTitansIcon name="timeline" size={15} /> Recent</h3>
                <div className="tt-easy-more-grid">
                  {recentItems.map((item) => (
                    <button type="button" className="tt-easy-feature-link" key={`recent:${item.id}`} onClick={() => onOpenItem(item.path)}>
                      <span className="app-navigation-icon" aria-hidden="true"><TinyTitansIcon name={item.icon} size={24} /></span>
                      <span><strong>{item.label}</strong><small>{item.description}</small></span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {Object.entries(quickGroups).map(([group, items]) => (
              <section className="tt-easy-more-group" key={group}>
                <h3>{group}</h3>
                <div className="tt-easy-more-grid">
                  {items.map((item) => (
                    <div className="tt-easy-feature-row" key={item.id}>
                      <button type="button" data-route-guide-target={item.id === "account" ? "quick-my-account" : undefined} className="tt-easy-feature-link" data-quick-nav-target="true" onClick={() => onOpenItem(item.path)}>
                        <span className="app-navigation-icon" aria-hidden="true"><TinyTitansIcon name={item.icon} size={24} /></span>
                        <span><strong>{item.label}</strong><small>{item.description}</small></span>
                      </button>
                      <button
                        type="button"
                        className={`tt-easy-pin-button${pinnedPaths.includes(item.path) ? " active" : ""}`}
                        onClick={() => onTogglePin(item.path)}
                        aria-label={`${pinnedPaths.includes(item.path) ? "Unpin" : "Pin"} ${item.label}`}
                        title={`${pinnedPaths.includes(item.path) ? "Unpin" : "Pin"} ${item.label}`}
                      >
                        <TinyTitansIcon name="pin" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {quickItems.length === 0 && (
              <div className="tt-easy-no-results">
                <strong>Nothing matched.</strong>
                <span>Try a broader search such as feeding, genetics, community or account.</span>
              </div>
            )}

            <div className="tt-easy-more-foot">
              <button type="button" onClick={() => onOpenItem("/account/personalise")}>
                <TinyTitansIcon name="edit" size={17} /> Customise Quick View
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default QuickModeNavigation;
