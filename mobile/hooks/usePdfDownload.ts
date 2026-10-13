/**
 * usePdfDownload — hook wrapper for downloading authenticated PDFs.
 *
 * Reads the current UI language from i18next and passes it to the
 * download helper so the backend can render the PDF in that language.
 */

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { downloadAuthenticatedPdf } from "@/lib/download";


export function usePdfDownload() {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(
    async (path: string, filename: string) => {
      setLoading(true);
      setError(null);
      try {
        await downloadAuthenticatedPdf(path, filename, i18n.language);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Download failed";
        setError(message);
        // eslint-disable-next-line no-console
        console.error("PDF download failed:", message);
      } finally {
        setLoading(false);
      }
    },
    [i18n.language],
  );

  return { download, loading, error };
}
