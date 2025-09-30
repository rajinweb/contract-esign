import SignPageClient from "./SignPageClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SignPage(props: PageProps) {
  // Await the incoming params per Next.js App Router guidance
  const awaitedParams = await props.params;
  const token = awaitedParams?.token;
  if (!token) {
    return <div>Invalid link</div>;
  }
  return <SignPageClient token={token} />;
}
