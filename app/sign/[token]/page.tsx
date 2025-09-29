import SignPageClient from "./SignPageClient";

interface PageProps {
  params: { token: string };
}

export default function SignPage({ params }: PageProps) {
  return <SignPageClient token={params.token} />;
}
