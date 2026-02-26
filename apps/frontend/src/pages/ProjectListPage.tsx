import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import { Project } from "../api/types";

export function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    apiGet<Project[]>("/projects").then(setProjects).catch(console.error);
  }, []);

  return (
    <section>
      <h2>Projects</h2>
      <div className="cards">
        {projects.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="card">
            <h3>{project.title}</h3>
            <p>Status: {project.status}</p>
            <p>Priority: {project.priority}</p>
            <p>Target: {project.target_date ?? "n/a"}</p>
            {project.stats && (
              <>
                <div className="progress-track" aria-label="Task progress">
                  <div className="progress-fill" style={{ width: `${project.stats.taskStats.progress_pct}%` }} />
                </div>
                <p className="progress-label">{project.stats.taskStats.progress_pct}% complete</p>
                <div className="task-badges">
                  <span className="task-badge">todo {project.stats.taskStats.todo}</span>
                  <span className="task-badge">in_progress {project.stats.taskStats.in_progress}</span>
                  <span className="task-badge task-badge-blocked">blocked {project.stats.taskStats.blocked}</span>
                  <span className="task-badge">done {project.stats.taskStats.done}</span>
                </div>
                {project.stats.currentBlocker && <p className="current-blocker">Current blocker: {project.stats.currentBlocker}</p>}
                {project.stats.latestTask && (
                  <p className="last-activity">
                    Last activity: {new Date(project.stats.latestTask.updatedAt).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
