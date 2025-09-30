import SignPageClient from "./SignPageClient";

interface PageProps {
  params: { token: string };
}

export default async function SignPage({ params }: PageProps) {
  const token = params?.token;
  if (!token) {
    return <div>Invalid link</div>;
  }
  return <SignPageClient token={token} />;
}
