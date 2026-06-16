"use client";

import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export default function MediaPage() {
  return (
    <div>
      <PageHeader
        title="Media"
        subtitle="Every image, video and document uploaded to your site — upload, copy links or delete"
      />
      <MediaLibrary showDelete />
    </div>
  );
}
