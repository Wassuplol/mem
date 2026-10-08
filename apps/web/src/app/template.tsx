import { PageTransition } from "@/components/effects/page-transition";

/** Route-level wipe: every navigation plays a cinematic slide. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
