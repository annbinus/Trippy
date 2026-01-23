import { useAuth } from "../../contexts/AuthContext";

export default function AdventureBar({ onGenerate }) {
  const { user } = useAuth();
  
  return (
    <div className="adventure-bar full-bleed">
      {/* Title */}
      <h1 className="adventure-title">
        {user?.name ? `Hi ${user.name}! Ready to explore?` : "Plan Your Adventure"}
      </h1>

      {/* Subtitle */}
      <p className="adventure-subtitle">
        {user?.name 
          ? "Plan your adventure" 
          : "Generate a personalized travel plan powered by AI"}
      </p>

      {/* Buttons */}
      <div className="adventure-btn-container">
        <button onClick={onGenerate} className="adventure-btn btn-dark-strong">Generate Trip Plan</button>
      </div>
    </div>
  );
}
