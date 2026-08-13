import { Outlet } from "react-router-dom";
import CreatorAdminNav from "./CreatorAdminNav";

export default function CreatorAdmin() {
  return (
    <div className="creator-admin">
      <CreatorAdminNav />
      <main className="creator-admin__content">
        <Outlet />
      </main>
    </div>
  );
}
