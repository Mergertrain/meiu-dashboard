import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPatch, apiPost, sseUrl } from "../api/client";
import { Milestone, Project, Task, UpdateEntry } from "../api/types";
import { useEventStream } from "../hooks/useEventStream";

interface ProjectDetailResponse {
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
  updates: UpdateEntry[];
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const numericProjectId = Number(projectId);
  const [detail, setDetail] = useState<ProjectDetailResponse | null>(null);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const data = await apiGet<ProjectDetailResponse>(`/projects/${numericProjectId}`);
      setDetail(data);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, [numericProjectId]);

  useEffect(() => {
    if (numericProjectId) {
      load().catch(console.error);
    }
  }, [numericProjectId, load]);

  const stream = useMemo(() => (numericProjectId ? sseUrl(numericProjectId) : null), [numericProjectId]);
  useEventStream(stream, () => {
    load().catch(console.error);
  });

  if (!numericProjectId) {
    return <p>Invalid project</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!detail) {
    return <p>Loading...</p>;
  }

  return (
    <section className="project-grid">
      <article className="panel">
        <h2>{detail.project.title}</h2>
        <p>Status: {detail.project.status}</p>
        <p>Scope: {detail.project.scope ?? "n/a"}</p>
        <button
          onClick={async () => {
            await apiPatch(`/projects/${numericProjectId}`, { status: "active" });
            await load();
          }}
        >
          Mark Active
        </button>
      </article>

      <article className="panel">
        <h3>Status Board</h3>
        <div className="kanban">
          {["todo", "in_progress", "blocked", "done"].map((status) => (
            <div key={status}>
              <h4>{status}</h4>
              {detail.tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <div key={task.id} className="task">
                    <p>{task.title}</p>
                    <small>{task.points} pts</small>
                    {status !== "done" && (
                      <button
                        onClick={async () => {
                          const next = status === "todo" ? "in_progress" : status === "in_progress" ? "blocked" : "done";
                          await apiPatch(`/tasks/${task.id}`, { status: next });
                          await load();
                        }}
                      >
                        Advance
                      </button>
                    )}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>Milestones & Tasks</h3>
        {detail.milestones.map((milestone) => (
          <div key={milestone.id} className="milestone">
            <h4>{milestone.title}</h4>
            <p>{milestone.status}</p>
            <ul>
              {detail.tasks
                .filter((task) => task.milestone_id === milestone.id)
                .map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
            </ul>
          </div>
        ))}
        <button
          onClick={async () => {
            await apiPost("/updates", {
              projectId: numericProjectId,
              type: "comment",
              payload: { summary: "Quick project check-in" }
            });
            await load();
          }}
        >
          Add Check-in
        </button>
      </article>

      <article className="panel">
        <h3>Activity Feed</h3>
        <div className="list">
          {detail.updates.map((entry) => (
            <div key={entry.id}>
              <strong>{entry.type}</strong> {JSON.stringify(entry.payload_json)}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
