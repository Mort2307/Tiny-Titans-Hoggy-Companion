import { useState } from "react";
import {
  submitReportIssue,
  type CreateReportIssueInput,
} from "../services/reportIssueService";
import type {
  ReportIssueCategory,
  ReportIssuePriority,
  ReportIssueSource,
} from "../types/reportIssue";
import "./ReportIssueButton.css";

type ReportIssueButtonProps = {
  source: ReportIssueSource;

  context?: string;

  defaultCategory?: ReportIssueCategory;

  defaultPriority?: ReportIssuePriority;

  metadata?: Record<string, unknown>;

  userId?: string;

  appVersion?: string;
};

const CATEGORY_OPTIONS: ReportIssueCategory[] = [
  "Genetics",
  "Morph Database",
  "Calculator",
  "Breeding Planner",
  "Husbandry",
  "App Bug",
  "Other",
];

const PRIORITY_OPTIONS: ReportIssuePriority[] = [
  "Low",
  "Normal",
  "High",
  "Critical",
];

export default function ReportIssueButton({
  source,
  context,
  defaultCategory = "App Bug",
  defaultPriority = "Normal",
  metadata,
  userId,
  appVersion,
}: ReportIssueButtonProps) {
  const [open, setOpen] = useState(false);

  const [category, setCategory] =
    useState<ReportIssueCategory>(
      defaultCategory
    );

  const [priority, setPriority] =
    useState<ReportIssuePriority>(
      defaultPriority
    );

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [submitted, setSubmitted] =
    useState(false);

  const [error, setError] =
    useState("");

  function resetForm() {
    setCategory(defaultCategory);
    setPriority(defaultPriority);
    setTitle("");
    setDescription("");
    setError("");
    setSubmitted(false);
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!title.trim()) {
      setError(
        "Please give the issue a short title."
      );
      return;
    }

    if (!description.trim()) {
      setError(
        "Please describe what went wrong."
      );
      return;
    }

    const report: CreateReportIssueInput = {
      category,
      priority,
      source,
      title,
      description,
      context,
      userId,
      appVersion,
      metadata,
    };

    const saved =
      submitReportIssue(report);

    if (!saved) {
      setError(
        "The issue could not be saved. Please try again."
      );
      return;
    }

    setSubmitted(true);
  }

  return (
    <>
      <button
        type="button"
        className="report-issue-button"
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
      >
        <span aria-hidden="true">
          ⚠
        </span>

        Report Issue
      </button>

      {open && (
        <div
          className="report-issue-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <section
            className="report-issue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-issue-title"
          >
            {!submitted ? (
              <>
                <header className="report-issue-header">
                  <div>
                    <span className="report-issue-eyebrow">
                      Tiny Titans
                    </span>

                    <h2 id="report-issue-title">
                      Report an Issue
                    </h2>

                    <p>
                      Found something wrong,
                      confusing or genetically
                      suspicious? Tell us.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="report-issue-close"
                    onClick={closeModal}
                    aria-label="Close report form"
                  >
                    ×
                  </button>
                </header>

                <form
                  className="report-issue-form"
                  onSubmit={handleSubmit}
                >
                  <div className="report-issue-field">
                    <label htmlFor="report-title">
                      Issue title
                    </label>

                    <input
                      id="report-title"
                      type="text"
                      value={title}
                      onChange={(event) =>
                        setTitle(
                          event.target.value
                        )
                      }
                      placeholder="e.g. Calculator gives wrong outcome"
                      maxLength={120}
                    />
                  </div>

                  <div className="report-issue-row">
                    <div className="report-issue-field">
                      <label htmlFor="report-category">
                        Category
                      </label>

                      <select
                        id="report-category"
                        value={category}
                        onChange={(event) =>
                          setCategory(
                            event.target.value as ReportIssueCategory
                          )
                        }
                      >
                        {CATEGORY_OPTIONS.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="report-issue-field">
                      <label htmlFor="report-priority">
                        Priority
                      </label>

                      <select
                        id="report-priority"
                        value={priority}
                        onChange={(event) =>
                          setPriority(
                            event.target.value as ReportIssuePriority
                          )
                        }
                      >
                        {PRIORITY_OPTIONS.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="report-issue-field">
                    <label htmlFor="report-description">
                      What happened?
                    </label>

                    <textarea
                      id="report-description"
                      value={description}
                      onChange={(event) =>
                        setDescription(
                          event.target.value
                        )
                      }
                      placeholder="Tell us what you expected and what the app actually did."
                      rows={6}
                      maxLength={2000}
                    />

                    <span className="report-issue-character-count">
                      {description.length}/2000
                    </span>
                  </div>

                  {context && (
                    <div className="report-issue-context">
                      <strong>
                        Report context
                      </strong>

                      <span>
                        {context}
                      </span>
                    </div>
                  )}

                  {error && (
                    <div
                      className="report-issue-error"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <footer className="report-issue-actions">
                    <button
                      type="button"
                      className="report-issue-secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="report-issue-submit"
                    >
                      Submit Report
                    </button>
                  </footer>
                </form>
              </>
            ) : (
              <div className="report-issue-success">
                <div
                  className="report-issue-success-icon"
                  aria-hidden="true"
                >
                  ✓
                </div>

                <h2>
                  Report submitted
                </h2>

                <p>
                  Thanks. Your report has
                  been recorded and can be
                  reviewed alongside the
                  relevant genetics context.
                </p>

                <button
                  type="button"
                  className="report-issue-submit"
                  onClick={closeModal}
                >
                  Done
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}