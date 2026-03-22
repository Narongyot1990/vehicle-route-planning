"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildDaysFromOffset, HOURS } from "@/lib/gantt";

// ── Constants ────────────────────────────────────────────────────────────────

const INITIAL_WINDOW_START_DAY_OFFSET = 0;
const INITIAL_WINDOW_DAY_COUNT = 30;
const WINDOW_EXTEND_DAYS = 14;

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the timeline window: which days are visible, scroll-to-hour jumps,
 * and zoom level. Extracted from the monolith useGanttChartState.
 */
export function useTimelineNavigation() {
  const timelineOrigin = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [windowStartDayOffset, setWindowStartDayOffset] = useState(INITIAL_WINDOW_START_DAY_OFFSET);
  const [windowDayCount, setWindowDayCount] = useState(INITIAL_WINDOW_DAY_COUNT);

  const days = useMemo(
    () => buildDaysFromOffset(timelineOrigin, windowStartDayOffset, windowDayCount),
    [timelineOrigin, windowStartDayOffset, windowDayCount]
  );

  const windowStartHour = windowStartDayOffset * HOURS.length;
  const displayTotalHours = windowDayCount * HOURS.length;

  // ── Jump state ──────────────────────────────────────────────────────────────

  const [jumpAbsoluteHour, setJumpAbsoluteHour] = useState(0);
  const [jumpToken, setJumpToken] = useState(0);
  const [jumpJobId, setJumpJobId] = useState<string | null>(null);
  const [jumpVehicleId, setJumpVehicleId] = useState<string | null>(null);
  const [jumpJobToken, setJumpJobToken] = useState(0);
  const [prependHours, setPrependHours] = useState(0);
  const [prependToken, setPrependToken] = useState(0);
  const [hourWidth, setHourWidth] = useState(44);
  const [initializedJump, setInitializedJump] = useState(false);

  // ── Index conversion ────────────────────────────────────────────────────────

  const toDisplayIndex = useCallback(
    (absoluteHourIndex: number) => absoluteHourIndex - windowStartHour,
    [windowStartHour]
  );

  const toAbsoluteIndex = useCallback(
    (displayHourIndex: number) => windowStartHour + displayHourIndex,
    [windowStartHour]
  );

  // ── Navigation handlers ─────────────────────────────────────────────────────

  const requestJumpToAbsoluteHour = useCallback((targetAbsoluteHour: number) => {
    const targetDayOffset = Math.floor(targetAbsoluteHour / HOURS.length);

    if (targetDayOffset < windowStartDayOffset || targetDayOffset >= windowStartDayOffset + windowDayCount) {
      const nextStart = targetDayOffset - 7;
      setWindowStartDayOffset(nextStart);
      setWindowDayCount(INITIAL_WINDOW_DAY_COUNT);
    }

    setJumpAbsoluteHour(targetAbsoluteHour);
    setJumpToken((current) => current + 1);
  }, [windowStartDayOffset, windowDayCount]);

  // Auto-jump to today on first render
  useEffect(() => {
    if (initializedJump) return;
    requestJumpToAbsoluteHour(0);
    setInitializedJump(true);
  }, [initializedJump, requestJumpToAbsoluteHour]);

  const handleGoToToday = useCallback(() => {
    setJumpJobId(null);
    setJumpVehicleId(null);
    requestJumpToAbsoluteHour(0);
  }, [requestJumpToAbsoluteHour]);

  const handleCustomDateNavigate = useCallback((dateValue: string) => {
    if (!dateValue) return;

    const targetDate = new Date(`${dateValue}T00:00:00`);
    targetDate.setHours(0, 0, 0, 0);
    const diffMs = targetDate.getTime() - timelineOrigin.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    setJumpJobId(null);
    setJumpVehicleId(null);
    requestJumpToAbsoluteHour(diffHours);
  }, [requestJumpToAbsoluteHour, timelineOrigin]);

  const handleNavigateToJobPlacement = useCallback((jobId: string, startIndex: number) => {
    setJumpJobId(jobId);
    setJumpVehicleId(null);
    setJumpJobToken((current) => current + 1);
    requestJumpToAbsoluteHour(startIndex);
  }, [requestJumpToAbsoluteHour]);

  const handleExtendWindowLeft = useCallback(() => {
    const addedHours = WINDOW_EXTEND_DAYS * HOURS.length;
    setWindowStartDayOffset((current) => current - WINDOW_EXTEND_DAYS);
    setWindowDayCount((current) => current + WINDOW_EXTEND_DAYS);
    setPrependHours(addedHours);
    setPrependToken((current) => current + 1);
  }, []);

  const handleExtendWindowRight = useCallback(() => {
    setWindowDayCount((current) => current + WINDOW_EXTEND_DAYS);
  }, []);

  const handleClearSelection = useCallback(() => {
    setJumpJobId(null);
    setJumpVehicleId(null);
  }, []);

  return {
    timelineOrigin,
    days,
    windowStartHour,
    displayTotalHours,
    jumpAbsoluteHour,
    jumpToken,
    jumpJobId,
    jumpVehicleId,
    jumpJobToken,
    prependHours,
    prependToken,
    hourWidth,
    setHourWidth,
    toDisplayIndex,
    toAbsoluteIndex,
    handleGoToToday,
    handleCustomDateNavigate,
    handleNavigateToJobPlacement,
    handleExtendWindowLeft,
    handleExtendWindowRight,
    handleClearSelection,
    setJumpJobId,
    setJumpVehicleId,
  };
}

export type TimelineNavigationState = ReturnType<typeof useTimelineNavigation>;
