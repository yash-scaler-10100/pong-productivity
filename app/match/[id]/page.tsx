import { PublishedMatchViewer } from "@/components/published-match-viewer";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublishedMatchViewer id={id} />;
}
