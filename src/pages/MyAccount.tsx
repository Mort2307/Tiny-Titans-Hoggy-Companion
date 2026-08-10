import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

import { useAuth } from "../context/AuthContext";
import app from "../firebase/config";

import "../styles/MyAccount.css";


function MyAccount() {
  const navigate = useNavigate();

  const {
    user,
    profile,
  } = useAuth();

  const auth = getAuth(app);


  async function handleLogout() {
    try {
      await signOut(auth);

      navigate(
        "/login",
        { replace: true }
      );

    } catch (error) {
      console.error(
        "Tiny Titans: logout failed",
        error
      );
    }
  }


  if (!user) {
    return null;
  }


  return (
    <section className="my-account-page">

      <div className="my-account-card">

        <div className="my-account-header">

          <div className="my-account-avatar">
            🐍
          </div>

          <div>

            <h1>
              My Account
            </h1>

            <p>
              Manage your Tiny Titans profile
              and account.
            </p>

          </div>

        </div>


        <div className="account-section">

          <h2>
            Profile
          </h2>


          <div className="account-detail">

            <span>
              Display name
            </span>

            <strong>
              {profile?.displayName ||
                user.displayName ||
                "Not set"}
            </strong>

          </div>


          <div className="account-detail">

            <span>
              Email
            </span>

            <strong>
              {user.email ||
                "Not available"}
            </strong>

          </div>


          <div className="account-detail">

            <span>
              Account type
            </span>

            <strong>
              {profile?.category === "child"
                ? "Child"
                : "Adult"}
            </strong>

          </div>


          <div className="account-detail">

            <span>
              Experience
            </span>

            <strong>
              {profile?.experienceLevel === "pro"
                ? "Pro"
                : profile?.experienceLevel ===
                    "intermediate"
                  ? "Intermediate"
                  : "Beginner"}
            </strong>

          </div>

        </div>


        <div className="account-section">

          <h2>
            Tiny Titans
          </h2>

          <div className="account-interests">

            {profile?.interests?.map(
              (interest) => (

                <span
                  key={interest}
                  className="interest-badge"
                >
                  {interest === "breeder-seller"
                    ? "Breeder & Seller"
                    : interest.charAt(0).toUpperCase() +
                      interest.slice(1)}
                </span>

              )
            )}

          </div>

        </div>


        <div className="account-section">

          <h2>
            Account
          </h2>


          <button
            type="button"
            className="account-button"
          >
            ✏️ Edit Profile
          </button>


          <button
            type="button"
            className="account-button"
          >
            🔐 Security
          </button>


          <button
            type="button"
            className="account-button logout-button"
            onClick={handleLogout}
          >
            🚪 Log Out
          </button>

        </div>

      </div>

    </section>
  );
}


export default MyAccount;