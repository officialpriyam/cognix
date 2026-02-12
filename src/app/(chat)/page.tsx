import ChatBot from "@/components/chat-bot";
import ChatBotGuest from "@/components/chat-bot-guest";
import { generateUUID } from "lib/utils";
import { getSession } from "auth/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return <ChatBotGuest />;
  }

  const id = generateUUID();
  return <ChatBot initialMessages={[]} threadId={id} key={id} />;
}
