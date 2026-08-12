"use client";

import Image from "next/image";
import { useState } from "react";

import type { CatalogueMedia } from "@/lib/catalogue/queries";

type ProductMediaGalleryProps = {
  images: CatalogueMedia[];
  label: string;
  productName: string;
  thumbnailLabel: string;
};

/** Presents a product's published media while keeping the selected image clear to keyboard users. */
export function ProductMediaGallery({
  images,
  label,
  productName,
  thumbnailLabel,
}: Readonly<ProductMediaGalleryProps>) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = images[selectedImageIndex];

  if (!selectedImage) {
    return null;
  }

  return (
    <section aria-label={label} className="space-y-4">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-xl">
        <Image
          alt={selectedImage.altText ?? productName}
          className="object-cover"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          src={selectedImage.url}
          unoptimized
        />
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image, index) => {
            const isSelected = index === selectedImageIndex;
            const imageLabel = image.altText ?? productName;

            return (
              <button
                aria-label={`${thumbnailLabel}: ${imageLabel}`}
                aria-pressed={isSelected}
                className="bg-muted focus-visible:ring-ring relative aspect-square overflow-hidden rounded-lg ring-offset-2 transition focus-visible:ring-2 focus-visible:outline-none"
                key={image.url}
                onClick={() => setSelectedImageIndex(index)}
                type="button"
              >
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 30vw, 10rem"
                  src={image.url}
                  unoptimized
                />
                {isSelected ? (
                  <span className="ring-primary pointer-events-none absolute inset-0 rounded-lg ring-2" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
