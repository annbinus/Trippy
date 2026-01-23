import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Helper function to get activity icons
const getActivityIcon = (type) => {
  const iconMap = {
    restaurant: "🍽️",
    museum: "🏛️", 
    park: "🌳",
    shopping: "🛍️",
    nightlife: "🌃",
    hotel: "🏨",
    activity: "🎯"
  };
  return iconMap[type] || "📍";
};

// Helper function to increment time by 2 hours
const incrementTime = (timeStr) => {
  if (!timeStr) return "9:00 AM";
  
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return timeStr;
  
  let hours = parseInt(match[1]);
  let minutes = parseInt(match[2]);
  const period = match[3]?.toUpperCase() || "AM";
  
  hours += 2;
  
  if (hours > 12) {
    hours -= 12;
    const newPeriod = period === "AM" ? "PM" : "AM";
    return `${hours}:${minutes.toString().padStart(2, "0")} ${newPeriod}`;
  }
  
  return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export default function SavedItineraryPage() {
  const { itineraryId } = useParams();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(null);
  const [dayBoxes, setDayBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);

  useEffect(() => {
    if (!itineraryId) return;

    // Fetch itinerary details
    fetch(`${API_URL}/api/itineraries/${itineraryId}`, {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch itinerary");
        return res.json();
      })
      .then((data) => {
        setItinerary(data);
        
        // Fetch itinerary items
        return fetch(`${API_URL}/api/itinerary-items?itinerary_id=${itineraryId}`, {
          headers: getAuthHeaders()
        });
      })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch itinerary items");
        return res.json();
      })
      .then((items) => {
        // Convert items to day boxes format with individual activities
        const days = items.map((item) => {
          if (item.notes) {
            try {
              const data = JSON.parse(item.notes);
              return {
                title: data.title || `Day ${item.day}`,
                content: data.content || "",
                activities: data.activities || []
              };
            } catch (err) {
              console.error("Failed to parse item notes:", err);
            }
          }
          return {
            title: `Day ${item.day}`,
            content: item.notes || "",
            activities: []
          };
        });
        
        setDayBoxes(days);
      })
      .catch((err) => {
        console.error("Failed to fetch itinerary:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [itineraryId]);

  const updateDayTitle = (index, title) => {
    setDayBoxes(prev => prev.map((day, i) => 
      i === index ? { ...day, title } : day
    ));
  };

  const updateDayContent = (index, content) => {
    setDayBoxes(prev => prev.map((day, i) => 
      i === index ? { ...day, content } : day
    ));
  };

  const handleDragStart = (e, dayIndex, activityIndex) => {
    setDraggedItem({ dayIndex, activityIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e, dayIndex, activityIndex, position) => {
    setDropIndicator({ dayIndex, activityIndex, position });
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropIndicator(null);
    }
  };

  const handleDrop = (e, targetDayIndex, targetActivityIndex, position) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) {
      setDropIndicator(null);
      return;
    }
    
    const { dayIndex: sourceDayIndex, activityIndex: sourceActivityIndex } = draggedItem;
    
    let actualTargetIndex = targetActivityIndex;
    if (position === 'after') {
      actualTargetIndex = targetActivityIndex + 1;
    }
    
    if (sourceDayIndex === targetDayIndex && sourceActivityIndex === actualTargetIndex) {
      setDropIndicator(null);
      setDraggedItem(null);
      return;
    }
    
    if (sourceDayIndex === targetDayIndex && sourceActivityIndex < actualTargetIndex) {
      actualTargetIndex -= 1;
    }

    setDayBoxes(prevDays => {
      const newDays = prevDays.map(day => ({ ...day, activities: [...day.activities] }));
      
      const draggedActivity = newDays[sourceDayIndex].activities[sourceActivityIndex];
      newDays[sourceDayIndex].activities.splice(sourceActivityIndex, 1);
      newDays[targetDayIndex].activities.splice(actualTargetIndex, 0, draggedActivity);
      
      newDays[targetDayIndex].activities = newDays[targetDayIndex].activities.map((activity, index) => {
        if (index === 0) {
          return { ...activity, time: "9:00 AM" };
        }
        const prevActivity = newDays[targetDayIndex].activities[index - 1];
        return { ...activity, time: incrementTime(prevActivity.time) };
      });
      
      if (newDays[sourceDayIndex].activities.length > 0) {
        newDays[sourceDayIndex].activities = newDays[sourceDayIndex].activities.map((activity, index) => {
          if (index === 0) {
            return { ...activity, time: "9:00 AM" };
          }
          const prevActivity = newDays[sourceDayIndex].activities[index - 1];
          return { ...activity, time: incrementTime(prevActivity.time) };
        });
      }
      
      return newDays;
    });
    
    setDropIndicator(null);
    setDraggedItem(null);
  };

  const handleActivityTimeChange = (dayIndex, activityIndex, newTime) => {
    setDayBoxes(prevDays => {
      const newDays = prevDays.map(day => ({ ...day }));
      newDays[dayIndex].activities[activityIndex].time = newTime;
      return newDays;
    });
  };

  const saveChanges = async () => {
    try {
      // Update the itinerary items with new content
      const updatePromises = dayBoxes.map(async (day, index) => {
        const itemId = index + 1; // Assuming sequential day numbers
        const updatedNotes = JSON.stringify({
          title: day.title,
          content: day.content
        });

        return fetch(`${API_URL}/api/itinerary-items/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ notes: updatedNotes })
        });
      });

      await Promise.all(updatePromises);
      alert("Changes saved!");
    } catch (err) {
      console.error("Failed to save changes:", err);
      alert("Failed to save changes");
    }
  };

  if (loading) {
    return (
      <div className="p-2 text-center">
        <p>Loading itinerary...</p>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="p-2 text-center">
        <p>Itinerary not found</p>
        <button onClick={() => navigate("/")} className="mt-1">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="itinerary-page">
      {/* Header */}
      <div className="itinerary-header">
        <div className="header-row">
          <button
            onClick={() => navigate("/home")}
            className="back-btn"
          >
            ← Back to Destinations
          </button>
        </div>
        
        <h1 className="h2-md mb-05">
          {itinerary?.title || "Saved Itinerary"}
        </h1>
      </div>

      {/* Itinerary Content */}
      <div className="panel content-panel">
        <div className="details-header">
          <h2 className="h2-md m-0">
            Itinerary Details
          </h2>
          <div className="flex-row flex-center gap-1">
            <span className="days-badge">
              {dayBoxes.length} Days
            </span>
            <button
              onClick={saveChanges}
              className="save-btn"
            >
              💾 Save Changes
            </button>
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Loading itinerary...</p>
        ) : dayBoxes.length === 0 ? (
          <div className="empty-state-container">
            <p className="loading-text">No itinerary content found</p>
          </div>
        ) : (
          <div className="scroll-container">
            {dayBoxes.map((day, index) => (
              <div key={index} className="day-section">
                <h3 className="day-title">
                  <input
                    value={day.title}
                    onChange={(e) => updateDayTitle(index, e.target.value)}
                    className="day-title-input"
                    placeholder={`Day ${index + 1}`}
                  />
                </h3>
                <div className="day-content-box">
                  {day.activities && day.activities.length > 0 ? (
                    <div className="flex-col gap-05">
                      {day.activities.map((activity, actIndex) => (
                        <div key={actIndex}>
                          <div
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index, actIndex, 'before')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index, actIndex, 'before')}
                            className={`drop-indicator ${dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'before' ? 'drop-indicator-active' : ''}`}
                          />
                          
                          <div 
                            key={`activity-${actIndex}`}
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              handleDragStart(e, index, actIndex);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDragEnter={(e) => {
                              handleDragEnter(e, index, actIndex, 'center');
                            }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => {
                              handleDrop(e, index, actIndex, 'after');
                            }}
                            style={{
                              padding: "1rem",
                              backgroundColor: draggedItem?.dayIndex === index && draggedItem?.activityIndex === actIndex 
                                ? "#f0f0f0" 
                                : dropIndicator && (index !== dropIndicator.dayIndex || actIndex !== dropIndicator.activityIndex)
                                ? "#e5e7eb80"
                                : "#f9fafb",
                              border: draggedItem?.dayIndex === index && draggedItem?.activityIndex === actIndex ? "2px dashed #fb923c" : "1px solid #e5e7eb",
                              borderRadius: "0.5rem",
                              borderLeft: "3px solid #3b82f6",
                              cursor: "grab",
                              opacity: draggedItem?.dayIndex === index && draggedItem?.activityIndex === actIndex 
                                ? 0.5
                                : dropIndicator && (index !== dropIndicator.dayIndex || actIndex !== dropIndicator.activityIndex)
                                ? 0.4
                                : 1,
                              transition: "all 0.15s ease",
                              transform: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'center'
                                ? "scale(1.02)"
                                : "scale(1)",
                              zIndex: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'center'
                                ? 10
                                : 1,
                              marginTop: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'before' ? "1rem" : "0",
                              marginBottom: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'after' ? "1rem" : "0"
                            }}
                          >
                            <div className="activity-header">
                              <span draggable="false" className="drag-handle">⋮⋮</span>
                              <span draggable="false" className="activity-icon">{getActivityIcon(activity.type)}</span>
                              <h4 className="activity-title">
                                {activity.title}
                              </h4>
                              {activity.time && (
                                <input
                                  type="time"
                                  draggable="false"
                                  className="time-input"
                                  value={activity.time.replace(/\s*(AM|PM)/i, "") === "9:00" ? "09:00" : 
                                         activity.time.includes("PM") && !activity.time.includes("12") ? 
                                         String(parseInt(activity.time.split(":")[0]) + 12).padStart(2, "0") + ":" + activity.time.split(":")[1].slice(0, 2) :
                                         activity.time.includes("PM") && activity.time.includes("12") ?
                                         "12:" + activity.time.split(":")[1].slice(0, 2) :
                                         activity.time.split(":")[0].padStart(2, "0") + ":" + activity.time.split(":")[1].slice(0, 2)}
                                  onChange={(e) => {
                                    const timeStr = e.target.value;
                                    const [hours, minutes] = timeStr.split(":");
                                    const hour = parseInt(hours);
                                    const period = hour >= 12 ? "PM" : "AM";
                                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                    handleActivityTimeChange(index, actIndex, `${displayHour}:${minutes} ${period}`);
                                  }}
                                  onDragStart={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                />
                              )}
                            </div>
                            <p draggable="false" className="activity-content">
                              {activity.content}
                            </p>
                          </div>
                          
                          <div
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index, actIndex, 'after')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index, actIndex, 'after')}
                            className={`drop-indicator ${dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'after' ? 'drop-indicator-active' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={day.content}
                      onChange={(e) => updateDayContent(index, e.target.value)}
                      className="day-textarea"
                      placeholder="Add your itinerary details here..."
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}