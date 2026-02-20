import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        <div className="text-4xl font-semibold text-gray-900">404</div>
        <h1 className="mt-2 text-lg font-medium text-gray-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          The page you’re looking for doesn’t exist or the link has expired.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
}
