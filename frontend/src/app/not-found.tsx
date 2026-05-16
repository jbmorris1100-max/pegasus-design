import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center max-w-md px-6">
        <div className="text-muted text-6xl font-bold mb-4 font-mono">404</div>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted mb-6">The route you requested doesn't exist.</p>
        <Link href="/dashboard" className="btn-primary btn-sm inline-flex">
          Back to Command Center
        </Link>
      </div>
    </div>
  );
}
