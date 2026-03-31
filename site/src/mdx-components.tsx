import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import type { MDXComponents } from "mdx/types";
import Link from "next/link";

function SmartLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const href = props.href ?? "";

  if (href.startsWith("/")) {
    return <Link {...props} href={href} />;
  }

  if (href.startsWith("#")) {
    return <a {...props} />;
  }

  return <a {...props} rel="noreferrer" target="_blank" />;
}

function MdxImage({
  alt = "",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  // MDX chapter images come from exported book assets and may not have stable dimensions.
  // A plain img keeps the reader predictable in static export mode.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt} loading="lazy" />;
}

const components: MDXComponents = {
  a: SmartLink,
  img: MdxImage,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
