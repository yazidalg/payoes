import { Button, CopyText, useCopyToClipboard } from "@dub/ui";
import { toast } from "sonner";
import { DetailSection } from "@/ui/shared/detail-section";

export function ShareLinkSection({
  title,
  description,
  url,
  copyLabel,
  copySuccessMessage,
  children,
}: {
  title: string;
  description: string;
  url: string;
  copyLabel: string;
  copySuccessMessage: string;
  children?: React.ReactNode;
}) {
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <DetailSection title={title} description={description}>
      <CopyText value={url} className="break-all font-mono text-xs">
        {url}
      </CopyText>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          text={copyLabel}
          className="h-9"
          onClick={() => {
            toast.promise(copyToClipboard(url), {
              success: copySuccessMessage,
            });
          }}
        />
        {children}
      </div>
    </DetailSection>
  );
}
