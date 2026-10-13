/**
 * scrollToSection — scroll the landing page to a section by DOM id.
 *
 * Works on React Native Web (uses document.getElementById under the hood).
 * On native (iOS/Android), you'd use a ref + scrollTo — but this portfolio
 * targets web first.
 */

export function scrollToSection(id: string): void {
  if (typeof document === "undefined") return;

  // Strip leading "#" if present
  const cleanId = id.startsWith("#") ? id.slice(1) : id;

  const el = document.getElementById(cleanId);
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function scrollToTop(): void {
  if (typeof window !== "undefined" && window.scrollTo) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
