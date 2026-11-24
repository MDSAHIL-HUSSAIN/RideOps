import { requireChatGPTUser } from "./chatgpt-auth";
import Workspace from "./workspace";

export const dynamic = "force-dynamic";

export default async function Home(){
  const user=await requireChatGPTUser("/");
  return <Workspace user={{id:user.userId,name:user.displayName,email:user.email}}/>;
}
