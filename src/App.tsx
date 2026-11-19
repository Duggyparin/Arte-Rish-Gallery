import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePhoto,
  readGallery,
  uploadPhoto,
  type GalleryCategory,
  type GalleryPhoto,
} from "./lib/gallery";
import { supabase } from "./lib/supabase";

type Page = "home" | "gallery" | "login" | "admin";
type Photo = GalleryPhoto;

function Icon({
  name,
  size = 20,
}: {
  name: "arrow" | "close" | "upload" | "edit" | "eye" | "trash" | "menu" | "instagram";
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
      className={`logo ${compact ? "logo--compact" : ""}`}
      onClick={() => goTo("home")}
      aria-label="Arté Rish home"
    >
      <span className="logo-name">Arté Rish</span>
      {!compact && <span className="logo-tagline">Nails · Lash · Skin · Body</span>}
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
  return (
    <nav className="nav">
      <Logo compact />
      <div className="nav-links">
        <button className={page === "home" ? "active" : ""} onClick={() => goTo("home")}>
          Home
        </button>
        <button className={page === "gallery" ? "active" : ""} onClick={() => goTo("gallery")}>
          Gallery
        </button>
      </div>
    </nav>
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
        Nails <i>·</i> Lash <i>·</i> Skin <i>·</i> Body
      </div>
      <div className="footer-actions">
        <a href="#instagram" aria-label="Instagram">
          <Icon name="instagram" size={18} /> Instagram
        </a>
        <button onClick={() => goTo("login")}>Owner</button>
      </div>
    </footer>
  );
}

function Home({ photos }: { photos: Photo[] }) {
  return (
    <div className="page home-page">
      <Nav page="home" />
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
              {photos[0] ? (
                <img src={photos[0].src} alt={photos[0].title} />
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
          {photos.length ? (
            <div className="preview-strip">
              {photos.slice(0, 5).map((photo, i) => (
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
  loading,
  error,
}: {
  photos: Photo[];
  categories: GalleryCategory[];
  loading: boolean;
  error: string;
}) {
  const [categoryId, setCategoryId] = useState("All");
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const filtered =
    categoryId === "All" ? photos : photos.filter((photo) => photo.categoryId === categoryId);
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
    const index = photos.findIndex((p) => p.id === activePhoto.id);
    setActivePhoto(photos[(index + direction + photos.length) % photos.length]);
  };
  return (
    <div className="page gallery-page">
      <Nav page="gallery" />
      <header className="gallery-header">
        <p className="eyebrow">
          <Sparkle size={13} /> The archive
        </p>
        <h1>The Nail Gallery</h1>
        <p>A growing collection of color, detail, and tiny moments of beauty.</p>
        <div className="chips">
          <button
            key="all"
            onClick={() => setCategoryId("All")}
            className={`chip ${categoryId === "All" ? "chip--active" : ""}`}
          >
            All
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              onClick={() => setCategoryId(item.id)}
              className={`chip ${categoryId === item.id ? "chip--active" : ""}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </header>
      <main className="gallery-content">
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
          <div className="gallery-message" role="status">
            Loading the gallery…
          </div>
        ) : filtered.length ? (
          <div className="masonry">
            {filtered.map((photo, i) => (
              <button className="photo-card" key={photo.id} onClick={() => setActivePhoto(photo)}>
                <img src={photo.src} alt={photo.title} />
                <span className="photo-number">{String(i + 1).padStart(2, "0")}</span>
                <span className="photo-overlay">
                  <span>{photo.category}</span>
                  <strong>{photo.title}</strong>
                  <i>
                    <Icon name="arrow" />
                  </i>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Sparkle size={42} />
            <h2>A quiet corner, for now.</h2>
            <p>No photos in this category yet.</p>
            <button onClick={() => setCategoryId("All")} className="text-link">
              Return to all work <Icon name="arrow" size={16} />
            </button>
          </div>
        )}
      </main>
      <Footer />
      {activePhoto && (
        <Lightbox
          photo={activePhoto}
          photoNumber={photos.findIndex((photo) => photo.id === activePhoto.id) + 1}
          photoCount={photos.length}
          onClose={() => setActivePhoto(null)}
          onMove={move}
        />
      )}
    </div>
  );
}

function Login() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const configured = Boolean(supabase);

  const requestLoginLink = async () => {
    if (!supabase) {
      setError(
        "Supabase is not configured. Follow the connection steps in the project setup guide.",
      );
      return;
    }
    setSending(true);
    setError("");
    try {
      const { error: loginError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/?owner=1`, shouldCreateUser: false },
      });
      if (loginError) {
        setError(loginError.message);
        return;
      }
      setSent(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
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
      <form
        className="auth-card"
        onSubmit={(e) => {
          e.preventDefault();
          void requestLoginLink();
        }}
      >
        <Logo />
        {!sent ? (
          <>
            <div className="auth-heading">
              <p className="eyebrow">Private entrance</p>
              <h1>Welcome back.</h1>
              <p>Enter your email and we’ll send a secure link to your inbox.</p>
            </div>
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <Button type="submit" disabled={sending || !configured}>
              {sending ? "Sending…" : "Send me a login link"} <Icon name="arrow" size={18} />
            </Button>
          </>
        ) : (
          <div className="confirmation">
            <Sparkle size={42} />
            <p className="eyebrow">Link sent</p>
            <h1>Check your email.</h1>
            <p>Your secure sign-in link is on its way. Open it on this device to continue.</p>
            <button className="text-link" type="button" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        )}
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
      </form>
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

function Admin({ onGalleryChange }: { onGalleryChange: () => Promise<void> }) {
  const [tab, setTab] = useState<"photos" | "categories">("photos");
  const [access, setAccess] = useState<"checking" | "ready" | "denied">("checking");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshContent = async () => {
    const gallery = await readGallery(true);
    setCategories(gallery.categories);
    setPhotos(gallery.photos);
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
    for (const file of selectedFiles) {
      try {
        await uploadPhoto(file, categories[0]?.id ?? null);
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
      notify(
        `${selectedFiles.length} ${selectedFiles.length === 1 ? "photo" : "photos"} uploaded.`,
      );
    }
  };

  const updatePhoto = async (
    photo: Photo,
    changes: {
      title?: string;
      caption?: string;
      category_id?: string | null;
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
    if (!window.confirm(`Delete "${photo.title}" permanently?`)) return;
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
          <p role="status">Checking owner access…</p>
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
            <span>☷</span> Categories
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
            <h1>{tab === "photos" ? "Your collection" : "Manage categories"}</h1>
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
                  <p>Please keep this page open until the upload finishes.</p>
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
                  <small>JPG, PNG, WebP or HEIC · up to 20MB each</small>
                </>
              )}
            </section>
            <section className="admin-section">
              <div className="admin-section-title">
                <div>
                  <h2>Your photos</h2>
                  <p>
                    {photos.length} {photos.length === 1 ? "piece" : "pieces"} in your archive
                  </p>
                </div>
                <Button onClick={() => fileRef.current?.click()}>Add photos</Button>
              </div>
              {photos.length ? (
                <div className="admin-grid">
                  {photos.map((photo) => (
                    <article className="admin-photo" key={photo.id}>
                      <div className="admin-photo-image">
                        <img src={photo.src} alt={photo.title} />
                        <span>{photo.published ? "Published" : "Hidden"}</span>
                      </div>
                      <div className="admin-photo-meta">
                        <div>
                          <h3>{photo.title}</h3>
                          <p>{photo.category}</p>
                        </div>
                        <div className="photo-actions">
                          <button
                            aria-label={`Edit ${photo.title}`}
                            onClick={() => setEditing(photo)}
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          <button
                            aria-label={
                              photo.published ? `Hide ${photo.title}` : `Publish ${photo.title}`
                            }
                            onClick={() =>
                              void updatePhoto(photo, { is_published: !photo.published })
                            }
                          >
                            <Icon name="eye" size={17} />
                          </button>
                          <button
                            aria-label={`Delete ${photo.title}`}
                            onClick={() => void removePhoto(photo)}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="gallery-message">No photos yet. Upload your first piece above.</p>
              )}
            </section>
          </>
        ) : (
          <Categories
            categories={categories}
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
          onClose={() => setEditing(null)}
          onSave={async (changes) => {
            const saved = await updatePhoto(editing, changes);
            if (saved) setEditing(null);
            return saved;
          }}
        />
      )}
    </div>
  );
}

function PhotoEditor({
  photo,
  categories,
  onClose,
  onSave,
}: {
  photo: Photo;
  categories: GalleryCategory[];
  onClose: () => void;
  onSave: (changes: {
    title: string;
    caption: string;
    category_id: string | null;
    is_published: boolean;
  }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(photo.title);
  const [caption, setCaption] = useState(photo.caption);
  const [categoryId, setCategoryId] = useState(photo.categoryId ?? "");
  const [published, setPublished] = useState(photo.published);
  const [saving, setSaving] = useState(false);

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
          setSaving(true);
          const saved = await onSave({
            title: title.trim(),
            caption: caption.trim(),
            category_id: categoryId || null,
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
          <span>Category</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
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
        <h2>Organize the archive</h2>
        <p>Add, rename, and remove categories visitors use to explore your work.</p>
      </div>
      <form className="add-category" onSubmit={(event) => void addCategory(event)}>
        <label className="field">
          <span>New category</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Bridal details"
            required
            maxLength={80}
          />
        </label>
        <Button type="submit">Add category</Button>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshGallery();
  }, [refreshGallery]);

  if (page === "home") return <Home photos={photos} />;
  if (page === "gallery") {
    return <Gallery photos={photos} categories={categories} loading={loading} error={error} />;
  }
  if (page === "login") return <Login />;
  return <Admin onGalleryChange={refreshGallery} />;
}
