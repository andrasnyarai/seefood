import type { Metadata } from "next";
import { ClassifyWorkspace } from "@/components/classify-workspace";

export const metadata: Metadata = {
  title: "Classify",
};

export default function HomePage() {
  return <ClassifyWorkspace />;
}
