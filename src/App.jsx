import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Hero from "./components/Hero";
import Auth from "./components/Auth/Auth";
import Home from "./components/Home/Home";
import GenerateItinerary from "./components/Home/GenerateItinerary";
import ItineraryPage from "./components/Home/ItineraryPage";
import SavedItineraryPage from "./components/Home/SavedItineraryPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/home" element={<Home />} />
        <Route path="/itinerary/:itineraryId" element={<ItineraryPage />} />
        <Route path="/saved-itinerary/:itineraryId" element={<SavedItineraryPage />} />
        <Route path="/generate" element={<GenerateItinerary />} />
      </Routes>
      <Analytics />
    </Router>
  );
}

export default App;
