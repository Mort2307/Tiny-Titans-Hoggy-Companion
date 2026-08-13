import { useMemo, useState } from "react";

export default function AdminUsers() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "moderator" | "user">("all");
  const visibleFilterLabel = useMemo(() => (filter === "all" ? "All roles" : filter[0].toUpperCase() + filter.slice(1)), [filter]);

  return (
    <section className="creator-admin-users" aria-labelledby="admin-users-title">
      <header>
        <p className="creator-dashboard__eyebrow">Creator Centre</p>
        <h1 id="admin-users-title">Users</h1>
        <p>Manage registered Tiny Titans accounts and review account roles.</p>
      </header>
      <div className="creator-admin-users__toolbar">
        <label>
          <span className="sr-only">Search users</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users…" />
        </label>
        <label>
          <span className="sr-only">Filter users by role</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>
        </label>
      </div>
      <div className="creator-admin-users__empty" role="status">
        <strong>User telemetry is not connected yet.</strong>
        <p>Search: {query || "all users"} · Role filter: {visibleFilterLabel}. Live Firebase user data will be rendered here once the trusted admin data layer is connected.</p>
      </div>
    </section>
  );
}
