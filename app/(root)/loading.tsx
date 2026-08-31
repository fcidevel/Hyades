/**
 * Streaming placeholder for the main app segment, so a slow database read shows
 * a skeleton rather than a blank page while the server component resolves.
 */
export default function Loading() {
  return (
    <section
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
      aria-busy="true"
      aria-live="polite"
    >
      <i className="bi bi-arrow-repeat animate-spin text-5xl text-orange-400" />
      <p className="p-16-regular text-dark-400">Loading your library...</p>
    </section>
  );
}
