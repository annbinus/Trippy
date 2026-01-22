export default function AdventureBar({ onGenerate }) {
  return (
    <div className="adventure-bar full-bleed">
      {/* Title */}
      <h1 className="adventure-title">Plan Your Adventure</h1>

      {/* Subtitle */}
      <p className="adventure-subtitle">Generate a personalized travel plan powered by AI</p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button onClick={onGenerate} className="adventure-btn btn-dark-strong">Generate Trip Plan</button>
      </div>
    </div>
  );
}
