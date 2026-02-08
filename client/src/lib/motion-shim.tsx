import React, { forwardRef, useEffect, useRef, useState, useCallback } from "react";

type MotionProps = {
  initial?: Record<string, any> | string;
  animate?: Record<string, any> | string;
  exit?: Record<string, any> | string;
  whileHover?: Record<string, any>;
  whileInView?: Record<string, any> | string;
  whileTap?: Record<string, any>;
  transition?: Record<string, any>;
  variants?: Record<string, Record<string, any>>;
  viewport?: Record<string, any>;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
};

const motionPropKeys = new Set([
  "initial", "animate", "exit", "whileHover", "whileInView", "whileTap",
  "transition", "variants", "viewport", "layout", "layoutId",
]);

function resolveVariant(
  value: Record<string, any> | string | undefined,
  variants?: Record<string, Record<string, any>>
): Record<string, any> | undefined {
  if (!value) return undefined;
  if (typeof value === "string" && variants?.[value]) return variants[value];
  if (typeof value === "object") return value;
  return undefined;
}

function toCSS(props: Record<string, any>): React.CSSProperties {
  const style: any = {};
  for (const [key, val] of Object.entries(props)) {
    if (key === "opacity") style.opacity = val;
    else if (key === "x") style.transform = `${style.transform || ""} translateX(${typeof val === "number" ? val + "px" : val})`.trim();
    else if (key === "y") style.transform = `${style.transform || ""} translateY(${typeof val === "number" ? val + "px" : val})`.trim();
    else if (key === "scale") style.transform = `${style.transform || ""} scale(${val})`.trim();
    else if (key === "rotate") style.transform = `${style.transform || ""} rotate(${typeof val === "number" ? val + "deg" : val})`.trim();
  }
  return style;
}

function getTransitionCSS(transition?: Record<string, any>): string {
  const duration = transition?.duration ?? 0.3;
  const delay = transition?.delay ?? 0;
  const ease = transition?.type === "spring" ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "ease-out";
  return `all ${duration}s ${ease} ${delay}s`;
}

function createMotionComponent(tag: string) {
  const Component = forwardRef<any, MotionProps>((props, ref) => {
    const {
      initial, animate, exit, whileHover, whileInView, whileTap,
      transition, variants, viewport, style, children, ...rest
    } = props;

    const innerRef = useRef<HTMLElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [mounted, setMounted] = useState(false);

    const filteredProps: Record<string, any> = {};
    for (const [key, val] of Object.entries(rest)) {
      if (!motionPropKeys.has(key)) {
        filteredProps[key] = val;
      }
    }

    useEffect(() => {
      const timer = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(timer);
    }, []);

    useEffect(() => {
      const el = innerRef.current;
      if (!el || !whileInView) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (viewport?.once !== false) observer.unobserve(el);
          }
        },
        { threshold: viewport?.amount ?? 0.2 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [whileInView, viewport]);

    const initialStyles = resolveVariant(initial, variants);
    const animateStyles = resolveVariant(animate, variants);
    const inViewStyles = resolveVariant(whileInView, variants);

    let targetStyles: Record<string, any> = {};
    if (whileInView) {
      targetStyles = isInView ? (inViewStyles || {}) : (initialStyles || {});
    } else if (animate) {
      targetStyles = mounted ? (animateStyles || {}) : (initialStyles || {});
    }

    const cssTarget = toCSS(targetStyles);
    const transitionStr = getTransitionCSS(transition);

    const combinedStyle: React.CSSProperties = {
      ...(!mounted && initialStyles ? toCSS(initialStyles) : {}),
      ...cssTarget,
      transition: transitionStr,
      ...style,
    };

    const setRefs = useCallback((el: HTMLElement | null) => {
      (innerRef as any).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as any).current = el;
    }, [ref]);

    return React.createElement(tag, {
      ref: setRefs,
      style: combinedStyle,
      ...filteredProps,
    }, children);
  });

  Component.displayName = `motion.${tag}`;
  return Component;
}

const motionCache = new Map<string, React.ForwardRefExoticComponent<any>>();

export const motion = new Proxy({} as Record<string, React.ForwardRefExoticComponent<any>>, {
  get(_, tag: string) {
    if (!motionCache.has(tag)) {
      motionCache.set(tag, createMotionComponent(tag));
    }
    return motionCache.get(tag)!;
  },
});

export function AnimatePresence({ children }: { children: React.ReactNode; mode?: string }) {
  return <>{children}</>;
}

export function useMotionValue(initial: number) {
  const ref = useRef(initial);
  const listeners = useRef<Set<(v: number) => void>>(new Set());

  return {
    get: () => ref.current,
    set: (v: number) => {
      ref.current = v;
      listeners.current.forEach((l) => l(v));
    },
    onChange: (fn: (v: number) => void) => {
      listeners.current.add(fn);
      return () => listeners.current.delete(fn);
    },
  };
}

export function useSpring(source: ReturnType<typeof useMotionValue>, _config?: any) {
  return source;
}
