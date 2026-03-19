# AI_RULES.md

This file defines the strict operating principles, architectural rules, and required workflows for all AI agents contributing to this repository.

## 🧠 Core AI Agent Behavior & Thinking Process
- **Think First:** Before writing or modifying any code, output a brief execution plan. Identify the core files and side effects.
- **No Hallucinations:** If context, schema, or utilities are missing, STOP and ASK the user. Do not invent missing parts.
- **Respect Existing Patterns:** Match the project's existing architecture and naming conventions.
- **Incremental Refactoring:** If you encounter messy code while fixing a bug, clean up the local scope (Boy Scout Rule), but do NOT rewrite unrelated parts of the file.

## 🏗 Architectural Fundamentals (Clean Architecture)
- **Separation of Concerns:** UI must focus purely on layout/rendering. Business logic, data fetching, and complex calculations MUST be extracted into hooks (`use...`), services, or helpers.
- **Scannability over Inline Logic:** A developer must be able to scan a file and instantly understand its structure (like reading a Table of Contents). Do not hide logic deep inside nested HTML/JSX tags.
- **Feature Colocation:** Group related code (components, hooks, types, utils) inside a specific `features/` directory rather than dumping everything into global folders.

## ⚛️ UI & Component Strict Rules (The "No Monster" Rule)
- **Max Component Length:** If a component's `return` statement or a `<div>` block grows beyond 100-150 lines, it MUST be broken down into sub-components.
- **No Large Maps in UI:** When mapping over data (e.g., `items.map(...)`), extract the inner structure into its own typed component instead of rendering 20 lines of inline JSX.
- **No Inline Event Handlers:** DO NOT write multi-line logic inside `onClick`, `onDrop`, or `onChange`. Extract them into named functions (e.g., `handleJobDrop`) above the `return` statement.
- **Extract Complex State:** If a UI component has more than 3 `useState` hooks or complex `useEffect` logic, extract them into a custom hook (e.g., `useDashboardState`).

---

## 📁 Standard Folder References
When extracting components, follow this mental model so developers can easily trace imports:
- `@/components/ui/` -> Reusable, dumb visual elements (Buttons, Inputs, Modals).
- `@/components/layout/` -> Structural elements (Header, Sidebar, Footer).
- `@/features/{domain}/components/` -> Domain-specific UI (e.g., `GanttTimeline`, `LeaveRequestForm`).
- `@/features/{domain}/hooks/` -> Domain-specific state management.

---

## 📝 Code Example & Template

All AI agents MUST strictly follow this standard when generating or refactoring UI components.

### ❌ BAD (The "Monster Div" Anti-Pattern)
Do NOT generate heavily nested code with inline state, inline event handlers, and large mapped elements inside a single file.

```tsx
// ❌ BAD: Hard to read, impossible to scan, massive cognitive load.
export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  // ... many more states and complex calculations here

  return (
    <div className="main-container">
      {/* 50 lines of Header logic */}
      <header className="flex justify-between p-4 bg-white shadow">
        <div className="logo">App</div>
        <nav>
           <ul>...</ul>
        </nav>
      </header>

      {/* 200 lines of complex mapped logic inline */}
      <main className="dashboard-grid">
        <div className="sidebar">
           {jobs.map(job => (
             <div 
               key={job.id} 
               className="job-card" 
               // ❌ Inline logic is banned
               onDragStart={(e) => { 
                 e.dataTransfer.setData("text", job.id);
                 setDragItem(job);
                 setIsEditing(false);
               }}
             >
                <h4>{job.title}</h4>
                <div className="segments">
                   {/* ❌ Nested mapping without extraction */}
                   {job.segments.map(seg => <div key={seg.id}>{seg.name}</div>)}
                </div>
             </div>
           ))}
        </div>
        
        {/* 150 lines of grid and timeline logic */}
        <div className="timeline">...</div>
      </main>
    </div>
  );
}

✅ GOOD (The "Scannable Composition" Pattern)
DO extract logical sections into clearly named components and move state to custom hooks. The main file should read like a table of contents.
// ✅ GOOD: Instantly readable. Developers know exactly which file to open.
import { Header } from "@/components/layout/Header";
import { JobSidebar } from "@/features/jobs/components/JobSidebar";
import { GanttTimeline } from "@/features/timeline/components/GanttTimeline";
import { useDashboardState } from "@/features/dashboard/hooks/useDashboardState";

export default function Dashboard() {
  // ✅ State and complex logic are abstracted away
  const { jobs, handlers, timelineState } = useDashboardState();

  return (
    <div className="main-container flex flex-col min-h-screen">
      <Header />
      
      <main className="dashboard-grid flex flex-1">
        {/* ✅ Props are clean and intention-revealing */}
        <JobSidebar 
          jobs={jobs} 
          onDragStart={handlers.handleDragStart} 
        />
        
        <GanttTimeline 
          state={timelineState} 
          onDrop={handlers.handleDrop} 
        />
      </main>
    </div>
  );
}

✅ Definition of Done
Before completing a task, the AI MUST silently verify:

The requested problem is solved effectively.

The UI return block is clean, highly scannable, and delegates details to imported components.

Complex states or event handlers were extracted to hooks or named functions.

Naming is clear, types are strict, and files are placed in their proper features/ or components/ folders.