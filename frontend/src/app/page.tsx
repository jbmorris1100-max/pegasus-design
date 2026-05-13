/** Pegasus Design — Root Page (redirects to Command Center) */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
