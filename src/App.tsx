import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  deletePhotos,
  deletePhoto,
  readGallery,
  uploadPhoto,
  type GalleryCategory,
  type GalleryPhoto,
  type GalleryPriceOption,
} from "./lib/gallery";
import { supabase } from "./lib/supabase";

type Page = "home" | "gallery" | "login" | "admin";
type Photo = GalleryPhoto;

function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "close"
    | "upload"
    | "edit"
    | "eye"
    | "trash"
    | "menu"
    | "instagram"
    | "facebook"
    | "search"
    | "qr";
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v5h14v-5" />
      </>
    ),
    edit: (
      <>
        <path d="M13.5 5.5l5 5M4 20l3.5-.8L19 7.7 16.3 5 4.8 16.5 4 20z" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 8h16M4 16h16" />
      </>
    ),
    instagram: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
    facebook: (
      <path
        d="M13.5 21v-7.3H16l.4-2.9h-2.9V9c0-.8.2-1.3 1.4-1.3h1.5V5.1c-.7-.1-1.5-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4v1.9H7.7v2.9h2.5V21h3.3Z"
        fill="currentColor"
        stroke="none"
      />
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    qr: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
        <path d="M14 14h2v2h-2zM18 14h2M18 18v2M14 18h2v2h-2z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Sparkle({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 2c.6 8.3 5.7 13.4 14 14-8.3.6-13.4 5.7-14 14-.6-8.3-5.7-13.4-14-14C10.3 15.4 15.4 10.3 16 2Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      className={`logo ${compact ? "logo--compact" : ""}`}
      onClick={() => goTo("home")}
      aria-label="Arté Rish home"
    >
      <img className="logo-image" src="/logo.png" alt="" />
    </button>
  );
}

let navigate: (page: Page) => void = () => {};
function goTo(page: Page) {
  navigate(page);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button button--${variant}`}
    >
      {children}
    </button>
  );
}

function Nav({ page }: { page: Page }) {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <nav className="nav">
      <Logo compact />
      <div className="nav-actions">
        <div className="nav-links">
          <button className={page === "home" ? "active" : ""} onClick={() => goTo("home")}>
            Home
          </button>
          <button className={page === "gallery" ? "active" : ""} onClick={() => goTo("gallery")}>
            Gallery
          </button>
        </div>
        <button
          className="share-button"
          onClick={() => setShareOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={shareOpen}
        >
          <Icon name="qr" size={17} />
          Share
        </button>
      </div>
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} />}
    </nav>
  );
}

function ShareDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const shareUrl = new URL("/", window.location.href).toString();

  useEffect(() => {
    closeButtonRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const copyLink = async () => {
    setShareError("");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch (error) {
      setShareError(errorMessage(error));
    }
  };

  const shareLink = async () => {
    setShareError("");
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "Arté Rish",
        text: "Explore the Arté Rish beauty gallery.",
        url: shareUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError(errorMessage(error));
    }
  };

  const saveQr = () => {
    setShareError("");
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      setShareError("The QR code is not ready yet. Please try again.");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "arte-rish-gallery-qr.png";
      document.body.append(link);
      link.click();
      link.remove();
    } catch (error) {
      setShareError(errorMessage(error));
    }
  };

  return (
    <div className="share-backdrop" onClick={onClose}>
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="share-close"
          onClick={onClose}
          aria-label="Close share dialog"
        >
          <Icon name="close" size={18} />
        </button>
        <p className="eyebrow">Share the collection</p>
        <h2 id="share-dialog-title">Arté Rish</h2>
        <div className="share-qr">
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={shareUrl}
            size={512}
            level="M"
            style={{
              width: "min(208px, calc(100vw - 120px))",
              height: "min(208px, calc(100vw - 120px))",
            }}
            fgColor="#3f2a18"
            bgColor="#ffffff"
            aria-label="Scan to open the Arté Rish gallery"
            role="img"
          />
        </div>
        <p className="share-url">{shareUrl}</p>
        <div className="share-dialog-actions">
          <Button variant="secondary" onClick={() => void copyLink()}>
            {copied ? "Link copied" : "Copy link"}
          </Button>
          <Button variant="secondary" onClick={saveQr}>
            Save QR
          </Button>
          <Button onClick={() => void shareLink()}>Share link</Button>
        </div>
        {shareError && (
          <p className="form-error" role="alert">
            {shareError}
          </p>
        )}
      </section>
    </div>
  );
}

function DeletePhotoDialog({
  photo,
  onClose,
  onConfirm,
}: {
  photo: Photo;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onClose]);

  return (
    <div className="share-backdrop" onClick={() => !deleting && onClose()}>
      <section
        className="share-dialog delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-photo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Remove from your archive</p>
        <h2 id="delete-photo-title">Delete this photo?</h2>
        <p>
          <strong>{photo.title}</strong> and its stored image will be permanently deleted.
        </p>
        <div className="delete-dialog-actions">
          <Button variant="secondary" disabled={deleting} onClick={onClose}>
            Cancel
          </Button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="button button--primary"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
            }}
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}

function BulkDeletePhotoDialog({
  photoCount,
  onClose,
  onConfirm,
}: {
  photoCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onClose]);

  return (
    <div className="share-backdrop" onClick={() => !deleting && onClose()}>
      <section
        className="share-dialog delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-photos-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Remove from your archive</p>
        <h2 id="bulk-delete-photos-title">
          Delete {photoCount} {photoCount === 1 ? "photo" : "photos"}?
        </h2>
        <p>The selected photos and their stored images will be permanently deleted.</p>
        <div className="delete-dialog-actions">
          <Button variant="secondary" disabled={deleting} onClick={onClose}>
            Cancel
          </Button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="button button--primary"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
            }}
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}

function LeafDivider() {
  return (
    <div className="leaf-divider" aria-hidden="true">
      <span />
      <svg viewBox="0 0 90 30">
        <path d="M4 24C24 22 39 14 51 4M28 19c-1-7 2-11 8-13 0 6-2 10-8 13Zm14-7c-1 6 1 10 7 13 1-6-1-10-7-13Zm-25 11c-1-5 1-8 5-11 1 5-1 9-5 11Z" />
      </svg>
      <span />
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <Logo compact />
        <p>A quiet archive of artistry, detail, and care.</p>
      </div>
      <div className="footer-center">
        Nails Extension <i>·</i> Lashes Extension <i>·</i> Facial Care <i>·</i> Gluta Drip <i>·</i>{" "}
        Slimming Services <i>·</i> Foot Care <i>·</i> Profilo <i>·</i> Botox <i>·</i> GLP1
        Terzipatide <i>·</i> Other Services
      </div>
      <div className="footer-actions">
        <a
          href="https://www.instagram.com/arterish_cdo"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Arté Rish on Instagram"
        >
          <Icon name="instagram" size={18} /> Instagram
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=100095680775899"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Arté Rish on Facebook"
        >
          <Icon name="facebook" size={18} /> Facebook
        </a>
        <button onClick={() => goTo("login")}>Owner</button>
      </div>
    </footer>
  );
}

function Home({ photos, slowLoading }: { photos: Photo[]; slowLoading: boolean }) {
  const availablePhotos = photos.filter((photo) => !photo.imageError);
  return (
    <div className="page home-page">
      <Nav page="home" />
      {slowLoading && <SlowConnectionNotice />}
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <Sparkle size={13} /> A personal archive of artistry
            </p>
            <div className="hero-mark">
              <Logo />
            </div>
            <h1>
              Beauty, shaped
              <br />
              <em>by hand.</em>
            </h1>
            <p className="hero-intro">
              Thoughtful beauty, created by hand, and made to feel like you.
            </p>
            <Button onClick={() => goTo("gallery")}>
              Explore the Gallery <Icon name="arrow" size={18} />
            </Button>
          </div>
          <div className="hero-visual">
            <div className="arch arch--main">
              {availablePhotos[0] ? (
                <img src={availablePhotos[0].src} alt={availablePhotos[0].title} />
              ) : (
                <div className="gallery-placeholder">
                  <Sparkle size={38} />
                  <span>Your work, beautifully collected</span>
                </div>
              )}
            </div>
            <span className="hero-sparkle hero-sparkle--one">
              <Sparkle size={32} />
            </span>
            <span className="hero-sparkle hero-sparkle--two">
              <Sparkle size={18} />
            </span>
            <div className="hero-note">
              made with
              <br />
              care & intention
            </div>
          </div>
        </section>

        <section className="about">
          <div className="about-label">
            <span>01</span>
            <p>About the archive</p>
          </div>
          <div className="about-copy">
            <h2>
              Every set tells
              <br />a small story.
            </h2>
            <p>
              This space holds the details, colors, and quiet moments behind each creation. A place
              to look back, feel proud, and share the work with anyone who finds joy in it.
            </p>
          </div>
        </section>

        <LeafDivider />
        <section className="preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Selected work</p>
              <h2>A few favorites</h2>
            </div>
            <button className="text-link" onClick={() => goTo("gallery")}>
              View the full gallery <Icon name="arrow" size={16} />
            </button>
          </div>
          {availablePhotos.length ? (
            <div className="preview-strip">
              {availablePhotos.slice(0, 5).map((photo, i) => (
                <button
                  key={photo.id}
                  className={`preview-card preview-card--${i}`}
                  onClick={() => {
                    goTo("gallery");
                    setTimeout(
                      () =>
                        window.dispatchEvent(new CustomEvent("openPhoto", { detail: photo.id })),
                      50,
                    );
                  }}
                >
                  <img src={photo.src} alt={photo.title} />
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-gallery-note">
              New work will appear here as soon as it is published.
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function useSlowLoading(active: boolean) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }

    const timer = window.setTimeout(() => setSlow(true), 1200);
    return () => window.clearTimeout(timer);
  }, [active]);

  return slow;
}

function LoadingStatus({ label, slow }: { label: string; slow: boolean }) {
  return (
    <div className="loading-status" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>
        {slow
          ? "This is taking longer than usual. Your connection may be slow; please wait…"
          : label}
      </span>
    </div>
  );
}

function SlowConnectionNotice() {
  return (
    <div className="slow-connection-notice" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>This is taking longer than usual. Your connection may be slow; please wait…</span>
    </div>
  );
}

function Lightbox({
  photo,
  photoNumber,
  photoCount,
  onClose,
  onMove,
}: {
  photo: Photo;
  photoNumber: number;
  photoCount: number;
  onClose: () => void;
  onMove: (direction: number) => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [onClose, onMove]);
  const price = getPhotoPrice(photo);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.title}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <div className="lightbox-image">
        <img src={photo.src} alt={photo.title} />
      </div>
      <div className="lightbox-info">
        <div>
          <span className="chip chip--small">{photo.category}</span>
          <h2>{photo.title}</h2>
          <p>{photo.caption}</p>
          {price !== null && (
            <div className="lightbox-price">
              <span>{photo.priceOption?.name ?? "Design price"}</span>
              {photo.priceOption?.details && <small>{photo.priceOption.details}</small>}
              <strong>{formatPhotoPrice(price)}</strong>
            </div>
          )}
        </div>
        <div className="lightbox-nav">
          <button onClick={() => onMove(-1)} aria-label="Previous photo">
            <Icon name="arrow" />
          </button>
          <span>
            {String(photoNumber).padStart(2, "0")} / {String(photoCount).padStart(2, "0")}
          </span>
          <button onClick={() => onMove(1)} aria-label="Next photo">
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Gallery({
  photos,
  categories,
  priceOptions,
  loading,
  error,
}: {
  photos: Photo[];
  categories: GalleryCategory[];
  priceOptions: GalleryPriceOption[];
  loading: boolean;
  error: string;
}) {
  const [categoryId, setCategoryId] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<number | null>(null);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const slowLoading = useSlowLoading(loading);
  const availablePhotos = photos.filter((photo) => !photo.imageError);
  const unavailablePhotoCount = photos.length - availablePhotos.length;
  const pricesForCurrentService = [
    ...priceOptions.flatMap((option) =>
      option.price !== null && (categoryId === "All" || option.categoryId === categoryId)
        ? [option.price]
        : [],
    ),
    ...availablePhotos
      .filter((photo) => categoryId === "All" || photo.categoryId === categoryId)
      .map(getPhotoPrice)
      .filter((price): price is number => price !== null),
  ];
  const availablePrices = [
    ...new Set(pricesForCurrentService),
  ].sort((a, b) => a - b);
  const filtered = availablePhotos.filter(
    (photo) =>
      (categoryId === "All" || photo.categoryId === categoryId) &&
      (priceFilter === null || getPhotoPrice(photo) === priceFilter) &&
      matchesPhotoSearch(photo, searchQuery),
  );
  useEffect(() => {
    const open = (event: Event) => {
      const requestedId = (event as CustomEvent<string>).detail;
      setActivePhoto(photos.find((photo) => photo.id === requestedId) ?? null);
    };
    window.addEventListener("openPhoto", open);
    return () => window.removeEventListener("openPhoto", open);
  }, [photos]);
  const move = (direction: number) => {
    if (!activePhoto) return;
    const index = filtered.findIndex((photo) => photo.id === activePhoto.id);
    const nextIndex = (index + direction + filtered.length) % filtered.length;
    setActivePhoto(filtered[nextIndex] ?? null);
  };
  return (
    <div className="page gallery-page">
      <Nav page="gallery" />
      <header className="gallery-header">
        <p className="eyebrow">
          <Sparkle size={13} /> The archive
        </p>
        <h1>The Beauty Gallery</h1>
        <p>A growing collection of color, detail, and tiny moments of beauty.</p>
        <div className="chips">
          <button
            key="all"
            onClick={() => {
              setCategoryId("All");
              setPriceFilter(null);
            }}
            className={`chip ${categoryId === "All" ? "chip--active" : ""}`}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCategoryId(item.id);
                setPriceFilter(null);
              }}
              className={`chip ${categoryId === item.id ? "chip--active" : ""}`}
            >
              {item.name}
            </button>
          ))}
        </div>
        {availablePrices.length > 0 && (
          <label className="gallery-price-filter">
            <span>Filter by price</span>
            <select
              aria-label="Filter designs by price"
              value={priceFilter ?? ""}
              onChange={(event) =>
                setPriceFilter(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">All prices</option>
              {availablePrices.map((price) => (
                <option key={price} value={price}>
                  {formatPhotoPrice(price)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="search-field gallery-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            aria-label="Search designs by name, caption, or category"
            placeholder="Search designs by name..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </header>
      <main className="gallery-content">
        {unavailablePhotoCount > 0 && !loading && !error && (
          <div className="gallery-message" role="status">
            <p>
              {unavailablePhotoCount} {unavailablePhotoCount === 1 ? "photo could" : "photos could"}{" "}
              not be loaded. The owner can remove and re-upload{" "}
              {unavailablePhotoCount === 1 ? "it" : "them"}.
            </p>
          </div>
        )}
        <div className="gallery-count">
          <span>
            {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
          </span>
          <span>Curated by Arté Rish</span>
        </div>
        {error ? (
          <div className="gallery-message" role="alert">
            <h2>Gallery unavailable</h2>
            <p>{error}</p>
          </div>
        ) : loading ? (
          <LoadingStatus label="Loading the gallery…" slow={slowLoading} />
        ) : filtered.length ? (
          <div className="masonry">
            {filtered.map((photo, i) => {
              const price = getPhotoPrice(photo);
              return (
                <button className="photo-card" key={photo.id} onClick={() => setActivePhoto(photo)}>
                  <img src={photo.src} alt={photo.title} />
                  {price !== null && (
                    <span className="photo-price-badge">{formatPhotoPrice(price)}</span>
                  )}
                  <span className="photo-number">{String(i + 1).padStart(2, "0")}</span>
                  <span className="photo-overlay">
                    <span>{photo.category}</span>
                    <strong>{photo.title}</strong>
                    <i>
                      <Icon name="arrow" />
                    </i>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Sparkle size={42} />
            <h2>
              {searchQuery.trim()
                ? "No designs found."
                : priceFilter !== null
                  ? "No designs at this price."
                  : unavailablePhotoCount
                    ? "Some images need attention."
                    : "A quiet corner, for now."}
            </h2>
            <p>
              {searchQuery.trim()
                ? `No designs match "${searchQuery.trim()}". Try another search.`
                : priceFilter !== null
                  ? `No designs match ${formatPhotoPrice(priceFilter)} with the current filters.`
                  : unavailablePhotoCount
                    ? "The owner can remove and re-upload the unavailable photos."
                    : "No photos in this category yet."}
            </p>
            {(searchQuery.trim() || categoryId !== "All" || priceFilter !== null) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryId("All");
                  setPriceFilter(null);
                }}
                className="text-link"
              >
                Clear search and filters <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
        )}
      </main>
      <Footer />
      {activePhoto && (
        <Lightbox
          photo={activePhoto}
          photoNumber={filtered.findIndex((photo) => photo.id === activePhoto.id) + 1}
          photoCount={filtered.length}
          onClose={() => setActivePhoto(null)}
          onMove={move}
        />
      )}
    </div>
  );
}

function Login() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const configured = Boolean(supabase);

  const signInWithGoogle = async () => {
    if (!supabase) {
      setError(
        "Supabase is not configured. Follow the connection steps in the project setup guide.",
      );
      return;
    }
    setSending(true);
    setError("");
    try {
      const { error: loginError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/?owner=1` },
      });
      if (loginError) {
        setError(loginError.message);
        setSending(false);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
      setSending(false);
    }
  };

  return (
    <div className="auth-page">
      <button className="auth-back" onClick={() => goTo("home")}>
        <span>←</span> Back to portfolio
      </button>
      <div className="auth-decoration">
        <Sparkle size={28} />
        <Sparkle size={14} />
      </div>
      <div className="auth-card">
        <Logo />
        <div className="auth-heading">
          <p className="eyebrow">Private entrance</p>
          <h1>Welcome back.</h1>
          <p>Continue with the Google account authorized to manage this gallery.</p>
        </div>
        <Button onClick={() => void signInWithGoogle()} disabled={sending || !configured}>
          {sending ? "Connecting…" : "Continue with Google"} <Icon name="arrow" size={18} />
        </Button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!configured && (
          <p className="form-error" role="status">
            Add your Supabase URL and publishable key to the local .env file to enable owner
            sign-in.
          </p>
        )}
        <p className="owner-note">
          <span>•</span> Owner access only <span>•</span>
        </p>
      </div>
    </div>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    if (typeof error.message === "string") return error.message;
  }
  return "Something went wrong. Please try again.";
}

function getPhotoPrice(photo: Photo) {
  return photo.customPrice ?? photo.priceOption?.price ?? null;
}

function formatPhotoPrice(price: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
}

function matchesPhotoSearch(photo: Photo, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;

  const searchableText = `${photo.title} ${photo.caption} ${photo.category}`.toLowerCase();
  return terms.every((term) => searchableText.includes(term));
}

function Admin({ onGalleryChange }: { onGalleryChange: () => Promise<void> }) {
  const [tab, setTab] = useState<"photos" | "categories" | "pricing">("photos");
  const [access, setAccess] = useState<"checking" | "ready" | "denied">("checking");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoSearch, setPhotoSearch] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(() => new Set());
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [priceOptions, setPriceOptions] = useState<GalleryPriceOption[]>([]);
  const [pricingAvailable, setPricingAvailable] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [toast, setToast] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<Photo | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<Photo | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const slowAccessCheck = useSlowLoading(access === "checking");
  const slowUpload = useSlowLoading(uploading);
  const fileRef = useRef<HTMLInputElement>(null);
  const filteredPhotos = photos.filter((photo) => matchesPhotoSearch(photo, photoSearch));
  const selectedPhotos = photos.filter((photo) => selectedPhotoIds.has(photo.id));
  const allFilteredPhotosSelected =
    filteredPhotos.length > 0 && filteredPhotos.every((photo) => selectedPhotoIds.has(photo.id));

  const refreshContent = async () => {
    const gallery = await readGallery(true);
    setCategories(gallery.categories);
    setPhotos(gallery.photos);
    const currentPhotoIds = new Set(gallery.photos.map((photo) => photo.id));
    setSelectedPhotoIds((current) => new Set([...current].filter((id) => currentPhotoIds.has(id))));
    setPriceOptions(gallery.priceOptions);
    setPricingAvailable(gallery.pricingAvailable);
  };

  const loadContent = useCallback(async () => {
    setAccess("checking");
    if (!supabase) {
      setLoadError("Supabase is not configured. Follow the project connection guide first.");
      setAccess("denied");
      return;
    }
    setLoadError("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (!user) {
        setAccess("denied");
        return;
      }

      const { data: adminRecord, error: adminError } = await supabase
        .from("gallery_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (adminError) throw adminError;
      if (!adminRecord) {
        setAccess("denied");
        return;
      }

      await refreshContent();
      setAccess("ready");
    } catch (error) {
      setLoadError(errorMessage(error));
      setAccess("denied");
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const reload = async () => {
    try {
      await refreshContent();
      await onGalleryChange();
      setActionError("");
      return true;
    } catch (error) {
      setActionError(errorMessage(error));
      return false;
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;
    setUploading(true);
    setActionError("");
    const failures: string[] = [];
    let optimizedCount = 0;
    let optimizationSkippedCount = 0;
    for (const file of selectedFiles) {
      try {
        const result = await uploadPhoto(file, categories[0]?.id ?? null);
        if (result.optimized) optimizedCount += 1;
        if (result.optimizationSkipped) optimizationSkippedCount += 1;
      } catch (error) {
        failures.push(`${file.name}: ${errorMessage(error)}`);
      }
    }
    const refreshed = await reload();
    if (!refreshed)
      failures.push("Some uploads may have completed, but the photo list could not be refreshed.");
    setUploading(false);
    if (failures.length) {
      setActionError(failures.join(" "));
    } else {
      const uploadSummary = [
        `${selectedFiles.length} ${selectedFiles.length === 1 ? "photo" : "photos"} uploaded.`,
        optimizedCount > 0
          ? `${optimizedCount} ${optimizedCount === 1 ? "image was" : "images were"} optimized for faster loading.`
          : "",
        optimizationSkippedCount > 0
          ? `${optimizationSkippedCount} large ${optimizationSkippedCount === 1 ? "image was" : "images were"} uploaded unchanged because this browser could not optimize ${optimizationSkippedCount === 1 ? "it" : "them"}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      notify(uploadSummary);
    }
  };

  const updatePhoto = async (
    photo: Photo,
    changes: {
      title?: string;
      caption?: string;
      category_id?: string | null;
      price_tier_id?: string | null;
      custom_price?: number | null;
      is_published?: boolean;
    },
  ): Promise<boolean> => {
    if (!supabase) return false;
    setActionError("");
    try {
      const { error } = await supabase.from("photos").update(changes).eq("id", photo.id);
      if (error) {
        setActionError(error.message);
        return false;
      }
      const refreshed = await reload();
      if (refreshed) notify("Changes saved.");
      return refreshed;
    } catch (error) {
      setActionError(errorMessage(error));
      return false;
    }
  };

  const removePhoto = async (photo: Photo) => {
    setActionError("");
    try {
      await deletePhoto(photo);
      if (await reload()) notify("Photo deleted.");
    } catch (error) {
      const failure = errorMessage(error);
      try {
        await refreshContent();
        await onGalleryChange();
      } catch (refreshError) {
        setActionError(`${failure} The dashboard could not refresh: ${errorMessage(refreshError)}`);
        return;
      }
      setActionError(failure);
    }
  };

  const removeSelectedPhotos = async () => {
    const photosToDelete = photos.filter((photo) => selectedPhotoIds.has(photo.id));
    if (!photosToDelete.length) return;

    setBulkDeleting(true);
    setActionError("");
    let deleteError = "";
    try {
      await deletePhotos(photosToDelete);
    } catch (error) {
      deleteError = errorMessage(error);
    }

    let refreshError = "";
    try {
      await refreshContent();
      await onGalleryChange();
    } catch (error) {
      refreshError = errorMessage(error);
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);

    if (deleteError || refreshError) {
      const messages: string[] = [];
      if (deleteError) messages.push(deleteError);
      if (refreshError) {
        messages.push(`The gallery could not be refreshed: ${refreshError}`);
      }
      setActionError(messages.join(" "));
      return;
    }

    notify(`${photosToDelete.length} ${photosToDelete.length === 1 ? "photo" : "photos"} deleted.`);
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const toggleFilteredPhotoSelection = () => {
    setSelectedPhotoIds((current) => {
      const next = new Set(current);
      for (const photo of filteredPhotos) {
        if (allFilteredPhotosSelected) next.delete(photo.id);
        else next.add(photo.id);
      }
      return next;
    });
  };

  const clearPhotoSelection = () => setSelectedPhotoIds(new Set());

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setActionError(error.message);
        return;
      }
      goTo("home");
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  if (access !== "ready") {
    return (
      <div className="access-state">
        <Logo />
        {access === "checking" ? (
          <LoadingStatus label="Checking owner access…" slow={slowAccessCheck} />
        ) : (
          <>
            <h1>{loadError ? "Dashboard unavailable" : "Owner access only"}</h1>
            <p>{loadError || "Sign in with the owner email address to manage this gallery."}</p>
            {loadError && (
              <button className="text-link" onClick={() => void loadContent()}>
                Try again
              </button>
            )}
            <button className="button button--secondary" onClick={() => goTo("login")}>
              Go to owner sign-in
            </button>
            <button className="text-link" onClick={() => goTo("gallery")}>
              Back to gallery
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <Logo />
        <div className="admin-menu">
          <p>Workspace</p>
          <button className={tab === "photos" ? "active" : ""} onClick={() => setTab("photos")}>
            <span>◫</span> Photos
          </button>
          <button
            className={tab === "categories" ? "active" : ""}
            onClick={() => setTab("categories")}
          >
            <span>☷</span> Services
          </button>
          <button className={tab === "pricing" ? "active" : ""} onClick={() => setTab("pricing")}>
            <span>₱</span> Pricing
          </button>
        </div>
        <button className="sidebar-exit sidebar-exit--view" onClick={() => goTo("gallery")}>
          ← View portfolio
        </button>
        <button className="sidebar-exit sidebar-exit--signout" onClick={() => void signOut()}>
          Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Owner dashboard</p>
            <h1>
              {tab === "photos"
                ? "Your collection"
                : tab === "categories"
                  ? "Manage services"
                  : "Manage pricing"}
            </h1>
          </div>
          <div className="avatar">AR</div>
        </header>
        {actionError && (
          <p className="form-error admin-error" role="alert">
            {actionError}
          </p>
        )}
        {tab === "photos" ? (
          <>
            <section
              className={`dropzone ${uploading ? "dropzone--uploading" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (!uploading) void uploadFiles(event.dataTransfer.files);
              }}
              onClick={() => !uploading && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={(event) => {
                  if (event.target.files) void uploadFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              {uploading ? (
                <>
                  <div className="sparkle-loader">
                    <Sparkle size={34} />
                  </div>
                  <h3>Uploading your photos…</h3>
                  <p>
                    {slowUpload
                      ? "This is taking longer than usual. Your connection may be slow; keep this page open."
                      : "Please keep this page open until the upload finishes."}
                  </p>
                </>
              ) : (
                <>
                  <span className="upload-icon">
                    <Icon name="upload" size={26} />
                  </span>
                  <h3>Bring new work into your archive</h3>
                  <p>
                    Drop multiple photos here, or <u>browse your files</u>
                  </p>
                  <small>
                    Image files up to 20MB. Large JPG, PNG and WebP files are optimized
                    automatically.
                  </small>
                </>
              )}
            </section>
            <section className="admin-section">
              <div className="admin-section-title">
                <div>
                  <h2>Your photos</h2>
                  <p>
                    {photoSearch.trim()
                      ? `${filteredPhotos.length} of ${photos.length} pieces`
                      : `${photos.length} ${photos.length === 1 ? "piece" : "pieces"} in your archive`}
                  </p>
                </div>
                <div className="admin-section-tools">
                  {photos.length > 0 && (
                    <label className="search-field admin-search">
                      <Icon name="search" size={18} />
                      <input
                        type="search"
                        aria-label="Search your photos by name, caption, or category"
                        placeholder="Search your photos..."
                        value={photoSearch}
                        onChange={(event) => setPhotoSearch(event.target.value)}
                      />
                    </label>
                  )}
                  <Button onClick={() => fileRef.current?.click()}>Add photos</Button>
                </div>
              </div>
              {photos.length > 0 && (
                <div className="bulk-selection-toolbar">
                  <button
                    type="button"
                    className="text-link"
                    disabled={filteredPhotos.length === 0 || bulkDeleting}
                    onClick={toggleFilteredPhotoSelection}
                  >
                    {allFilteredPhotosSelected
                      ? "Deselect shown"
                      : `Select all ${filteredPhotos.length} shown`}
                  </button>
                  <span className="bulk-selection-count" aria-live="polite">
                    {selectedPhotos.length} selected
                  </span>
                  <button
                    type="button"
                    className="text-link"
                    disabled={selectedPhotos.length === 0 || bulkDeleting}
                    onClick={clearPhotoSelection}
                  >
                    Clear selection
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={selectedPhotos.length === 0 || bulkDeleting}
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    Delete selected{selectedPhotos.length ? ` (${selectedPhotos.length})` : ""}
                  </button>
                </div>
              )}
              {filteredPhotos.length ? (
                <div className="admin-grid">
                  {filteredPhotos.map((photo) => (
                    <article
                      className={`admin-photo ${selectedPhotoIds.has(photo.id) ? "admin-photo--selected" : ""}`}
                      key={photo.id}
                    >
                      <div className="admin-photo-image">
                        <img src={photo.src} alt={photo.title} />
                        <span>
                          {photo.imageError
                            ? "Image unavailable"
                            : photo.published
                              ? "Published"
                              : "Hidden"}
                        </span>
                        <label className="photo-select-toggle" title={`Select ${photo.title}`}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${photo.title}`}
                            checked={selectedPhotoIds.has(photo.id)}
                            disabled={bulkDeleting}
                            onChange={() => togglePhotoSelection(photo.id)}
                          />
                        </label>
                      </div>
                      <div className="admin-photo-meta">
                        <div>
                          <h3>{photo.title}</h3>
                          <p>{photo.category}</p>
                          {photo.imageError && (
                            <p className="form-error" role="status">
                              {photo.imageError} Remove and re-upload this photo.
                            </p>
                          )}
                        </div>
                        <div className="photo-actions">
                          <button
                            aria-label={`Edit ${photo.title}`}
                            disabled={bulkDeleting}
                            onClick={() => setEditing(photo)}
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          <button
                            aria-label={
                              photo.published ? `Hide ${photo.title}` : `Publish ${photo.title}`
                            }
                            disabled={bulkDeleting}
                            onClick={() =>
                              void updatePhoto(photo, { is_published: !photo.published })
                            }
                          >
                            <Icon name="eye" size={17} />
                          </button>
                          <button
                            aria-label={`Delete ${photo.title}`}
                            disabled={bulkDeleting}
                            onClick={() => setDeletingPhoto(photo)}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : photos.length ? (
                <div className="gallery-message">
                  <p>No photos match “{photoSearch.trim()}”.</p>
                  <button className="text-link" onClick={() => setPhotoSearch("")}>
                    Clear search
                  </button>
                </div>
              ) : (
                <p className="gallery-message">No photos yet. Upload your first piece above.</p>
              )}
            </section>
          </>
        ) : tab === "categories" ? (
          <Categories
            categories={categories}
            onChanged={reload}
            notify={notify}
            setError={setActionError}
          />
        ) : (
          <PricingManager
            categories={categories}
            priceOptions={priceOptions}
            pricingAvailable={pricingAvailable}
            onChanged={reload}
            notify={notify}
            setError={setActionError}
          />
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Sparkle size={17} /> {toast}
        </div>
      )}
      {editing && (
        <PhotoEditor
          photo={editing}
          categories={categories}
          priceOptions={priceOptions}
          pricingAvailable={pricingAvailable}
          onClose={() => setEditing(null)}
          onSave={async (changes) => {
            const saved = await updatePhoto(editing, changes);
            if (saved) setEditing(null);
            return saved;
          }}
        />
      )}
      {deletingPhoto && (
        <DeletePhotoDialog
          photo={deletingPhoto}
          onClose={() => setDeletingPhoto(null)}
          onConfirm={async () => {
            await removePhoto(deletingPhoto);
            setDeletingPhoto(null);
          }}
        />
      )}
      {bulkDeleteOpen && (
        <BulkDeletePhotoDialog
          photoCount={selectedPhotos.length}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={removeSelectedPhotos}
        />
      )}
    </div>
  );
}

function PhotoEditor({
  photo,
  categories,
  priceOptions,
  pricingAvailable,
  onClose,
  onSave,
}: {
  photo: Photo;
  categories: GalleryCategory[];
  priceOptions: GalleryPriceOption[];
  onClose: () => void;
  onSave: (changes: {
    title: string;
    caption: string;
    category_id: string | null;
    price_tier_id?: string | null;
    custom_price?: number | null;
    is_published: boolean;
  }) => Promise<boolean>;
  pricingAvailable: boolean;
}) {
  const [title, setTitle] = useState(photo.title);
  const [caption, setCaption] = useState(photo.caption);
  const [categoryId, setCategoryId] = useState(photo.categoryId ?? "");
  const [priceTierId, setPriceTierId] = useState(photo.priceTierId ?? "");
  const [customPrice, setCustomPrice] = useState(photo.customPrice?.toString() ?? "");
  const [priceError, setPriceError] = useState("");
  const [published, setPublished] = useState(photo.published);
  const [saving, setSaving] = useState(false);
  const availablePriceOptions = priceOptions.filter((option) => option.categoryId === categoryId);
  const selectedPriceOption = priceOptions.find((option) => option.id === priceTierId);

  return (
    <div
      className="editor-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${photo.title}`}
    >
      <form
        className="photo-editor"
        onSubmit={async (event) => {
          event.preventDefault();
          const parsedCustomPrice = customPrice.trim() ? Number(customPrice) : null;
          if (
            parsedCustomPrice !== null &&
            (!Number.isSafeInteger(parsedCustomPrice) || parsedCustomPrice <= 0)
          ) {
            setPriceError("Enter a positive whole-peso amount, or leave the override blank.");
            return;
          }
          setPriceError("");
          setSaving(true);
          const saved = await onSave({
            title: title.trim(),
            caption: caption.trim(),
            category_id: categoryId || null,
            ...(pricingAvailable
              ? {
                  price_tier_id: priceTierId || null,
                  custom_price: parsedCustomPrice,
                }
              : {}),
            is_published: published,
          });
          setSaving(false);
          if (saved) onClose();
        }}
      >
        <div className="editor-heading">
          <div>
            <p className="eyebrow">Edit photo</p>
            <h2>Details & story</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor">
            <Icon name="close" />
          </button>
        </div>
        <img className="editor-thumb" src={photo.src} alt="" />
        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label className="field">
          <span>Caption</span>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={3}
            maxLength={1000}
          />
        </label>
        <label className="field">
          <span>Service</span>
          <select
            value={categoryId}
            onChange={(event) => {
              const nextCategoryId = event.target.value;
              setCategoryId(nextCategoryId);
              if (priceTierId && nextCategoryId !== selectedPriceOption?.categoryId) {
                setPriceTierId("");
                setCustomPrice("");
              }
            }}
          >
            <option value="">No service</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        {pricingAvailable ? (
          <>
            <label className="field">
              <span>Price label</span>
              <select
                value={priceTierId}
                onChange={(event) => {
                  const nextPriceTierId = event.target.value;
                  setPriceTierId(nextPriceTierId);
                  if (!nextPriceTierId) setCustomPrice("");
                }}
              >
                <option value="">No price shown</option>
                {availablePriceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                    {option.price !== null ? ` — ₱${option.price}` : " — price not set"}
                  </option>
                ))}
              </select>
            </label>
            {priceTierId && (
              <label className="field">
                <span>Custom price override (optional)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder={selectedPriceOption?.price?.toString() ?? ""}
                  value={customPrice}
                  onChange={(event) => setCustomPrice(event.target.value)}
                />
                <small className="field-hint">
                  {selectedPriceOption?.price === null
                    ? "This service has no saved price yet. Enter one here or add it in Pricing."
                    : "Leave blank to use the selected service price."}
                </small>
              </label>
            )}
            {priceError && (
              <p className="form-error" role="alert">
                {priceError}
              </p>
            )}
          </>
        ) : (
          <p className="pricing-unavailable" role="status">
            Pricing needs the updated Supabase schema. Run the updated supabase/schema.sql in your
            project’s SQL Editor to enable price labels.
          </p>
        )}
        <label className="publish-toggle">
          <span>
            <strong>Published</strong>
            <small>Visible in the public gallery</small>
          </span>
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          <i />
        </label>
        <div className="editor-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PricingManager({
  categories,
  priceOptions,
  pricingAvailable,
  onChanged,
  notify,
  setError,
}: {
  categories: GalleryCategory[];
  priceOptions: GalleryPriceOption[];
  pricingAvailable: boolean;
  onChanged: () => Promise<boolean>;
  notify: (message: string) => void;
  setError: (message: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [price, setPrice] = useState("");
  const selectedCategoryId = categories.some((category) => category.id === categoryId)
    ? categoryId
    : (categories[0]?.id ?? "");
  const categoryOptions = priceOptions.filter((option) => option.categoryId === selectedCategoryId);

  const addOption = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !selectedCategoryId || !name.trim()) return;
    const parsedPrice = price.trim() ? Number(price) : null;
    if (parsedPrice !== null && (!Number.isSafeInteger(parsedPrice) || parsedPrice <= 0)) {
      setError("Enter a positive whole-peso amount, or leave the price blank for now.");
      return;
    }

    setError("");
    try {
      const { error } = await supabase.from("price_options").insert({
        id: crypto.randomUUID(),
        category_id: selectedCategoryId,
        name: name.trim(),
        details: details.trim(),
        price: parsedPrice,
        position: categoryOptions.length + 1,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setName("");
      setDetails("");
      setPrice("");
      if (await onChanged()) notify("Price entry added.");
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  const updateOption = async (
    id: string,
    changes: { name: string; details: string; price: number | null },
  ) => {
    if (!supabase) return false;
    setError("");
    try {
      const { error } = await supabase.from("price_options").update(changes).eq("id", id);
      if (error) {
        setError(error.message);
        return false;
      }
      if (await onChanged()) {
        notify("Price entry saved.");
        return true;
      }
    } catch (error) {
      setError(errorMessage(error));
    }
    return false;
  };

  const deleteOption = async (option: GalleryPriceOption) => {
    if (
      !supabase ||
      !window.confirm(`Delete "${option.name}"? Photos using it will keep their custom price only.`)
    )
      return;
    setError("");
    try {
      const { error } = await supabase.from("price_options").delete().eq("id", option.id);
      if (error) {
        setError(error.message);
        return;
      }
      if (await onChanged()) notify("Price entry deleted.");
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  return (
    <section className="category-panel">
      <div className="panel-intro">
        <h2>Service price list</h2>
        <p>
          Add named price entries under a service. Leave the amount blank while you are waiting for
          it.
        </p>
      </div>
      {!pricingAvailable ? (
        <p className="pricing-unavailable" role="status">
          Run the updated supabase/schema.sql in your project’s SQL Editor to enable service
          pricing.
        </p>
      ) : categories.length === 0 ? (
        <p className="gallery-message">Add a service category before creating its price list.</p>
      ) : (
        <>
          <label className="field pricing-service">
            <span>Service</span>
            <select
              value={selectedCategoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <form className="pricing-add-form" onSubmit={(event) => void addOption(event)}>
            <label className="field">
              <span>Price or service name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Brow Lamination"
                required
                maxLength={120}
              />
            </label>
            <label className="field">
              <span>Price in ₱ (optional)</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Leave blank if unknown"
              />
            </label>
            <label className="field pricing-details">
              <span>Details (optional)</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={2}
                maxLength={500}
              />
            </label>
            <Button type="submit">Add price entry</Button>
          </form>
          <div className="pricing-list">
            {categoryOptions.length ? (
              categoryOptions.map((option) => (
                <PriceOptionRow
                  key={option.id}
                  option={option}
                  onSave={updateOption}
                  onDelete={deleteOption}
                />
              ))
            ) : (
              <p className="gallery-message">No price entries for this service yet.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function PriceOptionRow({
  option,
  onSave,
  onDelete,
}: {
  option: GalleryPriceOption;
  onSave: (
    id: string,
    changes: { name: string; details: string; price: number | null },
  ) => Promise<boolean>;
  onDelete: (option: GalleryPriceOption) => Promise<void>;
}) {
  const [name, setName] = useState(option.name);
  const [details, setDetails] = useState(option.details);
  const [price, setPrice] = useState(option.price?.toString() ?? "");
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    setName(option.name);
    setDetails(option.details);
    setPrice(option.price?.toString() ?? "");
  }, [option]);

  return (
    <form
      className="pricing-option-row"
      onSubmit={async (event) => {
        event.preventDefault();
        const parsedPrice = price.trim() ? Number(price) : null;
        if (parsedPrice !== null && (!Number.isSafeInteger(parsedPrice) || parsedPrice <= 0)) {
          setPriceError("Enter a positive whole-peso amount or leave it blank.");
          return;
        }
        setPriceError("");
        await onSave(option.id, {
          name: name.trim(),
          details: details.trim(),
          price: parsedPrice,
        });
      }}
    >
      <label className="field">
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
        />
      </label>
      <label className="field">
        <span>Price in ₱</span>
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Not set"
        />
      </label>
      <label className="field">
        <span>Details</span>
        <input
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={500}
        />
      </label>
      <div className="pricing-option-actions">
        <Button type="submit" variant="secondary">
          Save
        </Button>
        <button
          type="button"
          aria-label={`Delete ${option.name}`}
          onClick={() => void onDelete(option)}
        >
          <Icon name="trash" size={17} />
        </button>
      </div>
      {priceError && (
        <p className="form-error" role="alert">
          {priceError}
        </p>
      )}
    </form>
  );
}

function Categories({
  categories,
  onChanged,
  notify,
  setError,
}: {
  categories: GalleryCategory[];
  onChanged: () => Promise<boolean>;
  notify: (message: string) => void;
  setError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const addCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !name.trim()) return;
    setError("");
    try {
      const { error } = await supabase.from("categories").insert({
        name: name.trim(),
        position: categories.length + 1,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setName("");
      if (await onChanged()) notify("Category added.");
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  const renameCategory = async (
    event: React.FormEvent<HTMLFormElement>,
    category: GalleryCategory,
  ) => {
    event.preventDefault();
    if (!supabase || !draft.trim()) return;
    setError("");
    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: draft.trim() })
        .eq("id", category.id);
      if (error) {
        setError(error.message);
        return;
      }
      setEditingId(null);
      if (await onChanged()) notify("Category renamed.");
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  const removeCategory = async (category: GalleryCategory) => {
    if (!supabase || !window.confirm(`Delete the "${category.name}" category?`)) return;
    setError("");
    try {
      const { error } = await supabase.from("categories").delete().eq("id", category.id);
      if (error) {
        setError(
          error.code === "23503"
            ? "This category still has photos. Reassign those photos before deleting it."
            : error.message,
        );
        return;
      }
      if (await onChanged()) notify("Category deleted.");
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  return (
    <section className="category-panel">
      <div className="panel-intro">
        <h2>Organize services</h2>
        <p>Add, rename, and remove service categories visitors use to explore your work.</p>
      </div>
      <form className="add-category" onSubmit={(event) => void addCategory(event)}>
        <label className="field">
          <span>New service</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Brow Lamination"
            required
            maxLength={80}
          />
        </label>
        <Button type="submit">Add service</Button>
      </form>
      <div className="category-list">
        {categories.map((category, index) => (
          <form
            className="category-row"
            key={category.id}
            onSubmit={(event) => void renameCategory(event, category)}
          >
            <span className="category-index">{String(index + 1).padStart(2, "0")}</span>
            {editingId === category.id ? (
              <>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  required
                  maxLength={80}
                  aria-label={`Rename ${category.name}`}
                />
                <button type="submit" aria-label="Save category name">
                  <Icon name="edit" size={17} />
                </button>
                <button type="button" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="category-name">{category.name}</span>
                <button
                  type="button"
                  aria-label={`Rename ${category.name}`}
                  onClick={() => {
                    setEditingId(category.id);
                    setDraft(category.name);
                  }}
                >
                  <Icon name="edit" size={17} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => void removeCategory(category)}
                >
                  <Icon name="trash" size={17} />
                </button>
              </>
            )}
          </form>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(() =>
    new URLSearchParams(window.location.search).get("owner") === "1" ? "admin" : "home",
  );
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [priceOptions, setPriceOptions] = useState<GalleryPriceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const slowLoading = useSlowLoading(loading);
  navigate = setPage;

  const refreshGallery = useCallback(async () => {
    if (!supabase) {
      setError(
        "Connect Supabase by adding VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the local .env file.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const gallery = await readGallery();
      setCategories(gallery.categories);
      setPhotos(gallery.photos);
      setPriceOptions(gallery.priceOptions);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshGallery();
  }, [refreshGallery]);

  if (page === "home") return <Home photos={photos} slowLoading={slowLoading} />;
  if (page === "gallery") {
    return (
      <Gallery
        photos={photos}
        categories={categories}
        priceOptions={priceOptions}
        loading={loading}
        error={error}
      />
    );
  }
  if (page === "login") return <Login />;
  return <Admin onGalleryChange={refreshGallery} />;
}
