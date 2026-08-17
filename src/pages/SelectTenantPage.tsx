// SelectTenantPage — M00.F02（登录选租户）。awaiting_tenant 态的落地页。

import { Navigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/state/auth-context";
import { isErrorResponse } from "@/state/auth-context";

export function SelectTenantPage() {
  const { state, switchTenant } = useAuth();

  if (state.kind === "authenticated") return <Navigate to="/" replace />;
  if (state.kind !== "awaiting_tenant") return <Navigate to="/login" replace />;

  const { user, tenants } = state.value;

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="bg-background w-full max-w-md rounded-lg border p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Building2 className="text-primary size-8" />
          <h1 className="text-xl font-semibold">选择租户</h1>
          <p className="text-muted-foreground text-sm">
            {user.displayName ?? user.username}，你属于 {tenants.length} 个租户，请选择一个进入
          </p>
        </div>
        <div className="space-y-2">
          {tenants.map((t) => (
            <Button
              key={t.tenantId}
              variant="outline"
              className="w-full justify-between"
              onClick={() => void switchTenant({ tenantId: t.tenantId })}
            >
              <span>{t.name}</span>
              <span className="text-muted-foreground font-mono text-xs">{t.code}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { isErrorResponse };
