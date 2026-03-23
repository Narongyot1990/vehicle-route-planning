"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Job, JobStop } from "@/features/gantt/types/job";

type JobUpdateResult = void | boolean | Promise<void | boolean>;

export type JobHistoryEntry = {
  id: string;
  before: Job;
  after: Job;
  label: string;
};

type UseJobHistoryArgs = {
  jobsById: Map<string, Job>;
  onJobUpdate?: (updated: Job) => JobUpdateResult;
  syncPlacementWithJob: (job: Job) => void;
};

const HISTORY_LIMIT = 50;
const HISTORY_MENU_LIMIT = 10;

function cloneStops(stops: JobStop[]): JobStop[] {
  return stops.map((stop) => ({ ...stop }));
}

function cloneJob(job: Job): Job {
  return {
    ...job,
    stops: cloneStops(job.stops),
  };
}

function isJobHistoryEqual(a: Job, b: Job): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useJobHistory({
  jobsById,
  onJobUpdate,
  syncPlacementWithJob,
}: UseJobHistoryArgs) {
  const [past, setPast] = useState<JobHistoryEntry[]>([]);
  const [future, setFuture] = useState<JobHistoryEntry[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const pastRef = useRef<JobHistoryEntry[]>([]);
  const futureRef = useRef<JobHistoryEntry[]>([]);
  const historyBusyRef = useRef(false);
  const entryIdRef = useRef(0);

  const setPastState = useCallback((nextPast: JobHistoryEntry[]) => {
    pastRef.current = nextPast;
    setPast(nextPast);
  }, []);

  const setFutureState = useCallback((nextFuture: JobHistoryEntry[]) => {
    futureRef.current = nextFuture;
    setFuture(nextFuture);
  }, []);

  const setHistoryBusyState = useCallback((nextBusy: boolean) => {
    historyBusyRef.current = nextBusy;
    setHistoryBusy(nextBusy);
  }, []);

  const pushToPast = useCallback((entry: JobHistoryEntry) => {
    const nextPast = [...pastRef.current, entry];
    const trimmedPast = nextPast.length > HISTORY_LIMIT
      ? nextPast.slice(nextPast.length - HISTORY_LIMIT)
      : nextPast;
    setPastState(trimmedPast);
  }, [setPastState]);

  const persistJob = useCallback(async (nextJob: Job, fallbackJob: Job) => {
    syncPlacementWithJob(nextJob);

    if (!onJobUpdate) {
      return true;
    }

    const result = await onJobUpdate(nextJob);
    if (result === false) {
      syncPlacementWithJob(fallbackJob);
      return false;
    }

    return true;
  }, [onJobUpdate, syncPlacementWithJob]);

  const applyJobChange = useCallback(async (
    nextJob: Job,
    options?: {
      beforeJob?: Job;
      label?: string;
      recordHistory?: boolean;
      clearFuture?: boolean;
    }
  ) => {
    const beforeJob = options?.beforeJob ?? jobsById.get(nextJob.id);
    if (!beforeJob) {
      return false;
    }

    const normalizedBefore = cloneJob(beforeJob);
    const normalizedAfter = cloneJob(nextJob);
    if (isJobHistoryEqual(normalizedBefore, normalizedAfter)) {
      return true;
    }

    const persisted = await persistJob(normalizedAfter, normalizedBefore);
    if (!persisted) {
      return false;
    }

    if (options?.recordHistory !== false) {
      pushToPast({
        id: `history-${entryIdRef.current + 1}`,
        before: normalizedBefore,
        after: normalizedAfter,
        label: options?.label ?? normalizedAfter.jobNumber,
      });
      entryIdRef.current += 1;
      if (options?.clearFuture !== false) {
        setFutureState([]);
      }
    }

    return true;
  }, [jobsById, persistJob, pushToPast, setFutureState]);

  const recordHistoryEntry = useCallback((
    beforeJob: Job,
    afterJob: Job,
    label: string,
  ) => {
    pushToPast({
      id: `history-${entryIdRef.current + 1}`,
      before: cloneJob(beforeJob),
      after: cloneJob(afterJob),
      label,
    });
    entryIdRef.current += 1;
    setFutureState([]);
  }, [pushToPast, setFutureState]);

  const runHistory = useCallback(async (direction: "undo" | "redo", count: number) => {
    const normalizedCount = Math.max(1, Math.floor(count));
    const sourceStack = direction === "undo" ? pastRef.current : futureRef.current;
    if (historyBusyRef.current || sourceStack.length === 0) {
      return false;
    }

    setHistoryBusyState(true);

    let nextPast = [...pastRef.current];
    let nextFuture = [...futureRef.current];
    let completedCount = 0;

    for (let step = 0; step < normalizedCount; step += 1) {
      const entry = direction === "undo"
        ? nextPast[nextPast.length - 1]
        : nextFuture[0];

      if (!entry) {
        break;
      }

      const persisted = await persistJob(
        cloneJob(direction === "undo" ? entry.before : entry.after),
        cloneJob(direction === "undo" ? entry.after : entry.before),
      );

      if (!persisted) {
        break;
      }

      if (direction === "undo") {
        nextPast = nextPast.slice(0, -1);
        nextFuture = [entry, ...nextFuture];
      } else {
        nextFuture = nextFuture.slice(1);
        const candidatePast = [...nextPast, entry];
        nextPast = candidatePast.length > HISTORY_LIMIT
          ? candidatePast.slice(candidatePast.length - HISTORY_LIMIT)
          : candidatePast;
      }

      completedCount += 1;
    }

    setPastState(nextPast);
    setFutureState(nextFuture);
    setHistoryBusyState(false);
    return completedCount > 0;
  }, [persistJob, setFutureState, setHistoryBusyState, setPastState]);

  const handleUndoMany = useCallback((count: number) => {
    return runHistory("undo", count);
  }, [runHistory]);

  const handleRedoMany = useCallback((count: number) => {
    return runHistory("redo", count);
  }, [runHistory]);

  const handleUndo = useCallback(() => {
    return handleUndoMany(1);
  }, [handleUndoMany]);

  const handleRedo = useCallback(() => {
    return handleRedoMany(1);
  }, [handleRedoMany]);

  const canUndo = past.length > 0 && !historyBusy;
  const canRedo = future.length > 0 && !historyBusy;

  const undoLabel = useMemo(
    () => (past.length > 0 ? past[past.length - 1].label : null),
    [past]
  );

  const redoLabel = useMemo(
    () => (future.length > 0 ? future[0].label : null),
    [future]
  );

  const undoEntries = useMemo(
    () => [...past].reverse().slice(0, HISTORY_MENU_LIMIT),
    [past]
  );

  const redoEntries = useMemo(
    () => future.slice(0, HISTORY_MENU_LIMIT),
    [future]
  );

  return {
    applyJobChange,
    recordHistoryEntry,
    handleUndo,
    handleRedo,
    handleUndoMany,
    handleRedoMany,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    undoEntries,
    redoEntries,
    historyBusy,
  };
}

export type JobHistoryState = ReturnType<typeof useJobHistory>;
