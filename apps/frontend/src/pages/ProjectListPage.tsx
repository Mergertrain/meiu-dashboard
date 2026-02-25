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
          </Link>
        ))}
      </div>
    </section>
  );
}
