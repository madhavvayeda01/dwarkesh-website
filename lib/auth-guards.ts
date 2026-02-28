import { fail } from "@/lib/api-response";
import { getSessionFromCookies } from "@/lib/auth";
import {
  isClientModuleEnabled,
  isClientPageEnabled,
  type ClientPageKey,
  type ModuleKey,
} from "@/lib/module-control";

export async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return { error: fail("Unauthorized", 401), session: null };
  }
  return { error: null, session };
}

export async function requireClient() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client" || !session.clientId) {
    return { error: fail("Unauthorized", 401), session: null };
  }
  return { error: null, session };
}

export async function requireClientModule(moduleKey: ModuleKey) {
  const base = await requireClient();
  if (base.error || !base.session || !base.session.clientId) return base;

  const enabled = await isClientModuleEnabled(base.session.clientId, moduleKey);
  if (!enabled) {
    return {
      error: fail("Module not enabled by consultant", 403, { module: moduleKey }),
      session: null,
    };
  }

  return base;
}

export async function requireClientPage(pageKey: ClientPageKey) {
  const base = await requireClient();
  if (base.error || !base.session || !base.session.clientId) return base;

  const enabled = await isClientPageEnabled(base.session.clientId, pageKey);
  if (!enabled) {
    return {
      error: fail("Page not enabled by consultant", 403, { page: pageKey }),
      session: null,
    };
  }

  return base;
}
