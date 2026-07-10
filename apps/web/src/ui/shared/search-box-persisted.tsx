"use client";

import {
  LoadingSpinner,
  useRouterStuff,
} from "@dub/ui";
import { CircleXmark, Magnifier } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type SearchBoxProps = {
  value: string;
  loading?: boolean;
  showClearButton?: boolean;
  onChange: (value: string) => void;
  onChangeDebounced?: (value: string) => void;
  debounceTimeoutMs?: number;
  inputClassName?: string;
  placeholder?: string;
};

function SearchBox({
  value,
  loading,
  showClearButton = true,
  onChange,
  onChangeDebounced,
  debounceTimeoutMs = 500,
  inputClassName,
  placeholder,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (nextValue: string) => {
      onChange(nextValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onChangeDebounced?.(nextValue);
      }, debounceTimeoutMs);
    },
    [debounceTimeoutMs, onChange, onChangeDebounced],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;

    if (
      event.key === "/" &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA"
    ) {
      event.preventDefault();
      inputRef.current?.focus();
    } else if (event.key === "Escape") {
      inputRef.current?.blur();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        {loading && value.length > 0 ? (
          <LoadingSpinner className="h-4 w-4" />
        ) : (
          <Magnifier className="h-4 w-4 text-neutral-400" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        className={cn(
          "peer w-full rounded-lg border border-neutral-200 px-10 text-black outline-none placeholder:text-neutral-400 sm:text-sm",
          "transition-all focus:border-neutral-500 focus:ring-4 focus:ring-neutral-200",
          inputClassName,
        )}
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        autoCapitalize="none"
      />
      {showClearButton && value.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            handleChange("");
            onChangeDebounced?.("");
          }}
          className="pointer-events-auto absolute inset-y-0 right-0 flex items-center pr-4"
        >
          <CircleXmark className="h-4 w-4 text-neutral-600" />
        </button>
      ) : null}
    </div>
  );
}

export function SearchBoxPersisted({
  urlParam = "search",
  onChange,
  onChangeDebounced,
  ...props
}: { urlParam?: string } & Partial<SearchBoxProps>) {
  const { queryParams, searchParams } = useRouterStuff();
  const searchFromUrl = searchParams.get(urlParam) ?? "";
  const pendingUrlWrite = useRef<string | null>(null);

  const [value, setValue] = useState(searchFromUrl);
  const [debouncedValue, setDebouncedValue] = useState(searchFromUrl);

  // Push debounced input to the URL.
  useEffect(() => {
    if (searchFromUrl !== debouncedValue) {
      pendingUrlWrite.current = debouncedValue;
      queryParams(
        debouncedValue === ""
          ? { del: [urlParam, "page"] }
          : { set: { [urlParam]: debouncedValue }, del: "page" },
      );
    }
  }, [debouncedValue, queryParams, searchFromUrl, urlParam]);

  // Pull URL changes into the input when the user is not mid-typing.
  useEffect(() => {
    if (pendingUrlWrite.current !== null) {
      if (searchFromUrl === pendingUrlWrite.current) {
        pendingUrlWrite.current = null;
      }
      return;
    }

    if (searchFromUrl !== value && value === debouncedValue) {
      setValue(searchFromUrl);
      setDebouncedValue(searchFromUrl);
    }
    // Only sync when the URL search param changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFromUrl]);

  return (
    <SearchBox
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        onChange?.(nextValue);
      }}
      onChangeDebounced={(nextValue) => {
        setDebouncedValue(nextValue);
        onChangeDebounced?.(nextValue);
      }}
      {...props}
    />
  );
}
