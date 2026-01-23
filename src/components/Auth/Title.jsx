import palmIcon from "../../assets/palmtree.png";

export default function Title({ view }) {
  const isAuthView = view !== "landing";

  return (
    <div className={`auth-title ${isAuthView ? 'auth-title-top-auth' : 'auth-title-top-landing'}`}>
      <img src={palmIcon} alt="Palm" className="auth-image" />

      <h1 className="auth-title-large fw-light">Plan. Explore.</h1>
      <h1 className="auth-title-large fw-bold">Enjoy.</h1>
    </div>
  );
}
