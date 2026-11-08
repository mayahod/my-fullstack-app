const placeholder = '/images/recipe-placeholder.svg';

function thumbnailUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    if (!['images.unsplash.com', 'images.pexels.com'].includes(url.hostname)) return imageUrl;
    const width = Number(url.searchParams.get('w'));
    if (!width || width > 640) url.searchParams.set('w', '640');
    if (url.hostname === 'images.unsplash.com') url.searchParams.set('auto', 'format');
    return url.href;
  } catch {
    return imageUrl;
  }
}

export default function RecipeImage({
  src,
  alt = '',
  className,
  thumbnail = false,
  eager = false,
}) {
  const imageUrl = thumbnail ? thumbnailUrl(src) : src;
  return (
    <img
      className={className}
      src={imageUrl || placeholder}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.getAttribute('src') !== placeholder)
          event.currentTarget.src = placeholder;
      }}
    />
  );
}
