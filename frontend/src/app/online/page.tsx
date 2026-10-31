import { OnlinePlay } from "@/components/online-play";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game } = await searchParams;
  return <OnlinePlay gameId={game} />;
}
