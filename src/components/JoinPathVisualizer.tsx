import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { getCategoryStroke } from '../data/categoryAccents';
import type { DataViewCategory } from '../data/sfmcSchema';
import type { StructuralPathLink } from '../utils/joinPathVisualizer';
import { buildCubicBezierPath } from '../utils/joinPathVisualizer';

export interface RenderedJoinPath {
  id: string;
  d: string;
  stroke: string;
}

interface JoinPathVisualizerProps {
  structuralPaths: StructuralPathLink[];
  tableCategories: Record<string, DataViewCategory>;
  containerRef: RefObject<HTMLElement | null>;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

function queryTableCard(container: HTMLElement, tableName: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-table-card="${CSS.escape(tableName)}"]`);
}

function getCardAnchor(
  card: HTMLElement,
  container: HTMLElement,
  side: 'left' | 'right',
): { x: number; y: number } | null {
  const cardRect = card.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (cardRect.width === 0 || cardRect.height === 0) {
    return null;
  }

  const x =
    side === 'right'
      ? cardRect.right - containerRect.left
      : cardRect.left - containerRect.left;
  const y = cardRect.top - containerRect.top + cardRect.height / 2;

  return { x, y };
}

export function JoinPathVisualizer({
  structuralPaths,
  tableCategories,
  containerRef,
  scrollContainerRef,
}: JoinPathVisualizerProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [renderedPaths, setRenderedPaths] = useState<RenderedJoinPath[]>([]);

  const recomputePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container || structuralPaths.length === 0) {
      setRenderedPaths([]);
      return;
    }

    const width = container.scrollWidth;
    const height = container.scrollHeight;
    setCanvasSize({ width, height });

    const nextPaths: RenderedJoinPath[] = [];

    for (const link of structuralPaths) {
      const fromCard = queryTableCard(container, link.fromTable);
      const toCard = queryTableCard(container, link.toTable);
      if (!fromCard || !toCard) {
        continue;
      }

      const from = getCardAnchor(fromCard, container, 'right');
      const to = getCardAnchor(toCard, container, 'left');
      if (!from || !to) {
        continue;
      }

      const originCategory = tableCategories[link.fromTable];
      nextPaths.push({
        id: `${link.fromTable}->${link.toTable}`,
        d: buildCubicBezierPath(from, to),
        stroke: getCategoryStroke(originCategory),
      });
    }

    setRenderedPaths(nextPaths);
  }, [containerRef, structuralPaths, tableCategories]);

  useLayoutEffect(() => {
    recomputePaths();
  }, [recomputePaths, structuralPaths]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      recomputePaths();
    });
    resizeObserver.observe(container);

    const onScroll = () => recomputePaths();
    const onResize = () => recomputePaths();

    scrollContainer?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      resizeObserver.disconnect();
      scrollContainer?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [containerRef, scrollContainerRef, recomputePaths]);

  const hasPaths = renderedPaths.length > 0 && canvasSize.width > 0 && canvasSize.height > 0;

  const pathElements = useMemo(
    () =>
      renderedPaths.map((path) => (
        <g key={path.id}>
          <path
            d={path.d}
            fill="none"
            stroke={path.stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeOpacity={0.22}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path.d}
            fill="none"
            stroke={path.stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeOpacity={0.88}
            vectorEffect="non-scaling-stroke"
            className="join-path-flow"
          />
        </g>
      )),
    [renderedPaths],
  );

  if (!hasPaths) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-[5]"
      width={canvasSize.width}
      height={canvasSize.height}
      aria-hidden
    >
      <defs>
        <filter id="join-path-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#join-path-glow)">{pathElements}</g>
    </svg>
  );
}
