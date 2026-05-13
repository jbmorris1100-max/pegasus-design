import { Shell } from "@/components/ui/shell";
import { Card } from "@/components/ui/core";

export default function Page() {
  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scheduling & Capacity</h1>
          <p className="text-sm text-muted mt-1">Production scheduling, capacity planning, and resource allocation</p>
        </div>
        <Card>
          <div className="text-center py-16 text-muted">
            <p className="text-lg font-medium mb-2">Module Under Construction</p>
            <p className="text-sm">This module is actively being built. Return to the Command Center for live features.</p>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
