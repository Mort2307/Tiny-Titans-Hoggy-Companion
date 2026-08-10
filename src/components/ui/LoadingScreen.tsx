type LoadingScreenProps = {
  message?: string;
  fullScreen?: boolean;
};


function LoadingScreen({
  message = "Loading Tiny Titans...",
  fullScreen = true,
}: LoadingScreenProps) {

  return (
    <div
      className={
        fullScreen
          ? "loading-screen loading-screen-full"
          : "loading-screen"
      }
      role="status"
      aria-live="polite"
      aria-label={message}
    >

      <div className="loading-card">

        <div
          className="loading-snake"
          aria-hidden="true"
        >
          🐍
        </div>


        <div className="loading-spinner">
          <span />
          <span />
          <span />
        </div>


        <p className="loading-message">
          {message}
        </p>

      </div>

    </div>
  );
}


export default LoadingScreen;