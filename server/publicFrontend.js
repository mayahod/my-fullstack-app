export function publicFrontend() {
  return (
    process.env.NETLIFY_ORIGIN ||
    (process.env.RENDER ? 'https://velvety-semolina-e365c7.netlify.app' : '')
  );
}
