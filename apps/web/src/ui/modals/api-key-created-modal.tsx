"use client";

import { Button, Copy, Modal, Tick, useCopyToClipboard } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function ApiKeyCreatedModal({
  showApiKeyCreatedModal,
  setShowApiKeyCreatedModal,
  secret,
}: {
  showApiKeyCreatedModal: boolean;
  setShowApiKeyCreatedModal: Dispatch<SetStateAction<boolean>>;
  secret: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <Modal
      showModal={showApiKeyCreatedModal}
      setShowModal={setShowApiKeyCreatedModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">API Key Created</h3>
        <p className="text-sm text-neutral-500">
          For security reasons, we will only show you the key once. Please copy
          and store it somewhere safe.
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-neutral-800">API key</h2>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-neutral-200 bg-white p-2">
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <p className="truncate font-mono text-sm text-neutral-500" title={secret}>
                {secret}
              </p>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent"
              />
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                toast.promise(copyToClipboard(secret), {
                  success: "Copied to clipboard!",
                });
              }}
              type="button"
              className="flex h-7 shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
            >
              {copied ? (
                <Tick className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <Button
          text="Done"
          onClick={() => setShowApiKeyCreatedModal(false)}
        />
      </div>
    </Modal>
  );
}

export function useApiKeyCreatedModal({ secret }: { secret: string }) {
  const [showApiKeyCreatedModal, setShowApiKeyCreatedModal] = useState(false);

  const ApiKeyCreatedModalCallback = useCallback(() => {
    return (
      <ApiKeyCreatedModal
        showApiKeyCreatedModal={showApiKeyCreatedModal}
        setShowApiKeyCreatedModal={setShowApiKeyCreatedModal}
        secret={secret}
      />
    );
  }, [showApiKeyCreatedModal, secret]);

  return useMemo(
    () => ({
      setShowApiKeyCreatedModal,
      ApiKeyCreatedModal: ApiKeyCreatedModalCallback,
    }),
    [setShowApiKeyCreatedModal, ApiKeyCreatedModalCallback],
  );
}
