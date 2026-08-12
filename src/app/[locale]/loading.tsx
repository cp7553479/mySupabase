export default function PublicLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page content"
      className="mx-auto flex min-h-[50svh] max-w-7xl items-center px-5 lg:px-8"
      role="status"
    >
      <div className="bg-muted h-8 w-56 animate-pulse rounded-md" />
    </div>
  );
}
