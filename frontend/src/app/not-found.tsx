export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-bg text-fg flex items-center justify-center p-6">
      <div className="card p-8 max-w-md w-full text-center space-y-3">
        <p className="type-small-bold text-fg-muted">404</p>
        <h1 className="type-title">This page could not be found</h1>
        <p className="type-caption text-fg-muted">
          Return to the workspace to continue exploring repositories.
        </p>
        <a href="/" className="btn btn-primary inline-flex">
          Back to CodeIntel
        </a>
      </div>
    </main>
  );
}
