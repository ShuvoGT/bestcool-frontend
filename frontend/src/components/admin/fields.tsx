"use client";

/** Reusable form fields for admin editors, including upload-backed images. */
import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputDark = "border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-600";

export function TextField({
  label, value, onChange, placeholder, type = "text", required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300">{label}</Label>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputDark}
      />
    </div>
  );
}

export function NumberField({
  label, value, onChange, min, step,
}: {
  label: string; value: number | ""; onChange: (v: number | "") => void; min?: number; step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        step={step ?? 1}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={inputDark}
      />
    </div>
  );
}

export function TextareaField({
  label, value, onChange, rows = 4, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300">{label}</Label>
      <Textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputDark, "font-mono text-xs leading-relaxed")}
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

/** URL input + file upload button + live preview. */
export function ImageField({
  label, value, onChange, aspectHint,
}: {
  label: string; value: string; onChange: (v: string) => void; aspectHint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadImage(file));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300">
        {label} {aspectHint && <span className="ml-1 text-xs font-normal text-zinc-500">({aspectHint})</span>}
      </Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload →" className={inputDark} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange("")}
            className="shrink-0 border-white/10 bg-white/5 hover:bg-red-500/10 hover:text-red-400"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        <div className="relative mt-2 h-24 w-44 overflow-hidden rounded-lg border border-white/10">
          <Image src={value} alt="" fill unoptimized className="object-cover" />
        </div>
      )}
    </div>
  );
}

export function SwitchField({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/8 bg-white/3 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-zinc-200">{label}</span>
        {description && <span className="block text-xs text-zinc-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-gradient-to-r from-cyan-500 to-violet-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-[calc(100%-1.375rem)]" : "left-0.5"
          )}
        />
      </button>
    </label>
  );
}
