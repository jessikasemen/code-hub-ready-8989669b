// Compatibility shim so pages migrated from react-router-dom keep working
// with minimal edits on top of @tanstack/react-router.
import {
  useNavigate as useTSNavigate,
  useLocation as useTSLocation,
  useParams as useTSParams,
  Outlet,
  Link as TSLink,
  useMatchRoute,
} from "@tanstack/react-router";
import { forwardRef, useCallback, type ComponentProps, type ReactNode } from "react";

export { Outlet };
export { Link } from "@tanstack/react-router";

export function useLocation() {
  const loc = useTSLocation();
  return {
    ...loc,
    pathname: loc.pathname,
    search: typeof (loc as any).searchStr === "string" ? (loc as any).searchStr : "",
    hash: loc.hash ?? "",
    state: (loc as any).state ?? null,
  };
}

export function useNavigate() {
  const navigate = useTSNavigate();
  return useCallback((to: string | number, opts?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (to < 0 && typeof window !== "undefined") window.history.go(to);
      return;
    }
    const [pathPart, queryPart] = to.split("?");
    const search = queryPart
      ? Object.fromEntries(new URLSearchParams(queryPart).entries())
      : undefined;
    navigate({ to: pathPart, search: search as any, replace: opts?.replace });
  }, [navigate]);
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string, string>) => void
] {
  const location = useTSLocation();
  const navigate = useTSNavigate();
  const sp = new URLSearchParams(
    typeof (location as any).searchStr === "string" ? (location as any).searchStr : ""
  );
  const setSp = (next: URLSearchParams | Record<string, string>) => {
    const obj =
      next instanceof URLSearchParams ? Object.fromEntries(next.entries()) : next;
    navigate({ to: location.pathname, search: obj as any });
  };
  return [sp, setSp];
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useTSParams({ strict: false } as any) as T;
}

type RenderFn = (state: { isActive: boolean; isPending: boolean }) => ReactNode | string;

export interface NavLinkProps
  extends Omit<ComponentProps<typeof TSLink>, "className" | "children"> {
  className?: string | RenderFn;
  children?: ReactNode | RenderFn;
  /** react-router-dom compat: when true, only match exact path */
  end?: boolean;
  /** react-router-dom compat: extra class when active */
  activeClassName?: string;
  /** react-router-dom compat: extra class when pending */
  pendingClassName?: string;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, children, end, activeClassName, pendingClassName, ...props }, ref) => {
    // TanStack Link expects a plain string className — a function would be
    // forwarded to the DOM and silently drop all styling.
    const matchRoute = useMatchRoute();
    const to = (props as any).to as string | undefined;
    const isActive = to
      ? !!matchRoute({ to, fuzzy: !end } as any)
      : false;
    const base =
      typeof className === "function"
        ? (className as RenderFn)({ isActive, isPending: false })
        : className;
    const finalClass = [base, isActive ? activeClassName : undefined]
      .filter(Boolean)
      .join(" ");
    return (
      <TSLink
        {...(props as any)}
        ref={ref as any}
        activeOptions={end ? { exact: true } : undefined}
        className={finalClass}
      >
        {typeof children === "function"
          ? (children as RenderFn)({ isActive, isPending: false })
          : children}
      </TSLink>
    );
  }
);
NavLink.displayName = "NavLink";
