/**
 * Download authenticated binary files (PDFs) from the backend.
 *
 * The browser can't inject Authorization headers into a plain <a href>,
 * so we fetch the PDF via fetch() with the token, convert it to a Blob,
 * and trigger a native download.
 *
 * locale — optional. When set, appended as ?locale=xx to tell the backend
 * to render the PDF in that language.
 */

import { useAppStore } from "@/store/app";


const API_BASE_URL = "http://localhost:8000";


export async function downloadAuthenticatedPdf(
  path: string,
  filename: string,
  locale?: string,
): Promise<void> {
  const token = useAppStore.getState().accessToken;
  if (!token) {
    throw new Error("Not authenticated");
  }

  // Append ?locale= if provided (respects existing query params in path)
  let url = `${API_BASE_URL}${path}`;
  if (locale) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}locale=${encodeURIComponent(locale)}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();

  // Web: create an object URL and trigger a download
  if (typeof window !== "undefined" && typeof window.URL !== "undefined") {
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(objectUrl);
  }
}
