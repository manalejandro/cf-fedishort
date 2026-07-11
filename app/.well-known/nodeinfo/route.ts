import { getCloudflareContext, json } from "@/lib/cf";

export async function GET(): Promise<Response> {
  return json({
    links: [
      { rel: "http://nodeinfo.diaspora.software/ns/schema/2.0", href: "https://fedishort.com/nodeinfo/2.0" },
    ],
  });
}
