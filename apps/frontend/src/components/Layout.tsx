import { Link } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header>
        <h1>MEIU Dashboard</h1>
        <nav>
          <Link to="/">Projects</Link>
          <Link to="/notifications">Notifications</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
