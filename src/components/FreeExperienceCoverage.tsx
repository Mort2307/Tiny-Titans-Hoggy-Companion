import { Link } from "react-router-dom";
import { getFreeKeeperNavigationGroups } from "../config/freeExperience";

export default function FreeExperienceCoverage() {
  return (
    <section className="paid-free-experience" aria-labelledby="paid-free-experience-title">
      <div className="paid-free-experience__header">
        <div>
          <span className="paid-kicker">BASELINE · INCLUDED EVERYWHERE</span>
          <h2 id="paid-free-experience-title">✓ The full Free Keeper experience stays included</h2>
          <p>
            Every paid tier keeps the same personal TinyTitans app that Free users get.
            Paid workspaces add tools on top; they do not remove or hide the left-hand
            app index, your care records, learning, genetics, community or account controls.
          </p>
        </div>
        <div className="paid-free-experience__badge">FREE EXPERIENCE<br />PRESERVED</div>
      </div>

      <div className="paid-free-experience__note">
        <strong>Your normal app index remains available.</strong>
        <span>
          Feeding · Weight · Shedding · Behaviour · Health &amp; Vet · Husbandry &amp; Care
          · Enclosure Intelligence · Genetics · Learning · Community · Account
        </span>
      </div>

      <div className="paid-free-experience__groups">
        {getFreeKeeperNavigationGroups().map(({ group, items }) => (
          <section key={group} className="paid-free-experience__group">
            <h3>{group}</h3>
            <div className="paid-free-experience__items">
              {items.map((item) => (
                <Link key={item.id} to={item.path} className="paid-free-experience__item">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
