import { useNavigate } from "react-router-dom";
import heroImg from "../assets/hero.jpg";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <img src={heroImg} alt="Travel background" className="hero-img" />
      <div className="hero-overlay" />

      <div className="hero-inner">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="block font-light hero-beige">Time for your</span>
            <span className="block font-semibold hero-beige">next adventure</span>
          </h1>

          <p className="mb-8 text-lg md:text-2xl text-gray-200">
            Your own AI travel planner
          </p>

          <button onClick={() => navigate("/auth")} className="cta-btn">Plan my trip</button>
        </div>
      </div>
    </section>
  );
}
