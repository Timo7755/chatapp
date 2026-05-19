import { useEffect, useCallback } from "react";

interface Props {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    },
    [onClose, onNext, onPrev],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.92)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
            letterSpacing: "2px",
          }}
        >
          // image {currentIndex + 1} of {images.length}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontFamily: "var(--font)",
            fontSize: "11px",
            letterSpacing: "1px",
          }}
        >
          [ esc ]
        </button>
      </div>

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt="lightbox"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "80vh",
          objectFit: "contain",
          border: "1px solid var(--border)",
        }}
      />

      {/* Navigation */}
      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg)",
          }}
        >
          <button
            className="retro-btn-secondary"
            style={{
              fontSize: "11px",
              letterSpacing: "2px",
              padding: "6px 16px",
              cursor: "pointer",
            }}
            onClick={onPrev}
          >
            [ &lt;- prev ]
          </button>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              letterSpacing: "1px",
            }}
          >
            {currentIndex + 1} / {images.length}
          </span>
          <button
            className="retro-btn-secondary"
            style={{
              fontSize: "11px",
              letterSpacing: "2px",
              padding: "6px 16px",
              cursor: "pointer",
            }}
            onClick={onNext}
          >
            [ next -&gt; ]
          </button>
        </div>
      )}
    </div>
  );
}
