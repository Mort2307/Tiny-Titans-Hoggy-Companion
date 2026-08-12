export type SaveStage =
  | "idle"
  | "preparing"
  | "processing-photo"
  | "uploading-photo"
  | "saving-profile"
  | "syncing"
  | "complete"
  | "error";


type SaveProgressProps = {
  stage: SaveStage;
  snakeName?: string;
  errorMessage?: string;
};


type StageConfig = {
  label: string;
  description: string;
  icon: string;
  progress: number;
};


const stageConfig: Record<
  Exclude<
    SaveStage,
    "idle" | "complete" | "error"
  >,
  StageConfig
> = {
  preparing: {
    label: "Preparing your snake",
    description:
      "Tiny Titans is checking your snake's information and preparing it for secure storage.",
    icon: "🐍",
    progress: 10,
  },


  "processing-photo": {
    label: "Processing photo",
    description:
      "Your photo is being compressed and prepared so it can be stored efficiently.",
    icon: "📸",
    progress: 25,
  },


  "uploading-photo": {
    label: "Uploading photo",
    description:
      "Tiny Titans is securely uploading your snake's photo to Firebase Storage.",
    icon: "☁️",
    progress: 45,
  },


  "saving-profile": {
    label: "Saving snake profile",
    description:
      "Your snake's details, genetics, weights, dates and notes are being saved to your account.",
    icon: "💾",
    progress: 65,
  },


  syncing: {
    label: "Syncing with Firebase",
    description:
      "Tiny Titans is confirming that your snake has been safely synchronised with your account.",
    icon: "🔄",
    progress: 85,
  },
};


function SaveProgress({
  stage,
  snakeName,
  errorMessage,
}: SaveProgressProps) {
  if (stage === "idle") {
    return null;
  }


  // =========================================
  // COMPLETE
  // =========================================

  if (stage === "complete") {
    return (
      <div
        className="save-progress save-progress-complete"
        role="status"
        aria-live="polite"
      >
        <div className="save-progress-icon">
          ✅
        </div>

        <div className="save-progress-content">
          <strong>
            Snake saved!
          </strong>

          <p>
            {snakeName
              ? `${snakeName} is now safely stored in your Tiny Titans account.`
              : "Your snake is now safely stored in your Tiny Titans account."}
          </p>
        </div>

        <div className="save-progress-percentage">
          100%
        </div>
      </div>
    );
  }


  // =========================================
  // ERROR
  // =========================================

  if (stage === "error") {
    return (
      <div
        className="save-progress save-progress-error"
        role="alert"
      >
        <div className="save-progress-icon">
          ⚠️
        </div>

        <div className="save-progress-content">
          <strong>
            We couldn't save your snake
          </strong>

          <p>
            {errorMessage ||
              "Tiny Titans couldn't complete the save. Please try again."}
          </p>
        </div>
      </div>
    );
  }


  // =========================================
  // ACTIVE SAVE
  // =========================================

  const config =
    stageConfig[
      stage as keyof typeof stageConfig
    ];


  if (!config) {
    return null;
  }


  return (
    <div
      className="save-progress"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* HEADER */}

      <div className="save-progress-header">
        <div className="save-progress-icon">
          {config.icon}
        </div>


        <div className="save-progress-heading">
          <strong>
            {snakeName
              ? `Saving ${snakeName}`
              : "Saving your snake"}
          </strong>

          <span>
            {config.label}
          </span>
        </div>


        <div className="save-progress-percentage">
          {config.progress}%
        </div>
      </div>


      {/* PROGRESS BAR */}

      <div
        className="save-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={config.progress}
        aria-label={`Save progress ${config.progress}%`}
      >
        <div
          className="save-progress-bar-fill"
          style={{
            width:
              `${config.progress}%`,
          }}
        />
      </div>


      {/* EXPLANATION */}

      <div className="save-progress-description">
        <strong>
          {config.label}
        </strong>

        <p>
          {config.description}
        </p>
      </div>


      {/* FOOTER */}

      <div className="save-progress-footer">
        <span>
          🔒 Your information is being securely saved.
        </span>

        <span>
          Please keep this screen open.
        </span>
      </div>
    </div>
  );
}


export default SaveProgress;