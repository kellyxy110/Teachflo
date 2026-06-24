import { BetaHubClient } from "./BetaHubClient";

export const metadata = {
  title: "Beta Testing Hub — TeachFlow OS",
};

export default function BetaPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <BetaHubClient />
    </div>
  );
}
