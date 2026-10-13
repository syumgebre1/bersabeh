/**
 * DownloadButton — auth'd PDF download with loading + error handling.
 *
 * Uses the downloadAuthenticatedPdf helper so the token is included
 * in the request headers (Linking.openURL would NOT do that).
 */

import { Download } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { theme } from "@/constants/theme";


interface DownloadButtonProps {
  path: string;
  filename: string;
  label?: string;
  variant?: "primary" | "outline" | "secondary";
  size?: "sm" | "md" | "lg";
}


export function DownloadButton({
  path,
  filename,
  label = "Download PDF",
  variant = "primary",
  size = "md",
}: DownloadButtonProps) {
  const { download, loading } = usePdfDownload();

  const iconColor =
    variant === "primary"
      ? theme.colors.textInverse
      : theme.colors.primary;

  return (
    <Button
      label={label}
      variant={variant}
      size={size}
      loading={loading}
      disabled={loading}
      leftIcon={<Download size={14} color={iconColor} strokeWidth={2.2} />}
      onPress={() => download(path, filename)}
    />
  );
}
