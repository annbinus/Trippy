import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
    fetch(`http://localhost:5001/api/itineraries/${itineraryId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch itinerary");
        return res.json();
      })
      .then((data) => {
        setItinerary(data);
        
        // Fetch itinerary items
        return fetch(`http://localhost:5001/api/itinerary-items?itinerary_id=${itineraryId}`);
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
    console.log("🎯 DRAG START:", { dayIndex, activityIndex });
    setDraggedItem({ dayIndex, activityIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    console.log("🔄 DRAG OVER");
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e, dayIndex, activityIndex, position) => {
    console.log("➡️ DRAG ENTER:", { dayIndex, activityIndex, position });
    setDropIndicator({ dayIndex, activityIndex, position });
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropIndicator(null);
    }
  };

  const handleDrop = (e, targetDayIndex, targetActivityIndex, position) => {
    console.log("💧 DROP:", { targetDayIndex, targetActivityIndex, position, draggedItem });
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) {
      console.log("⚠️ No draggedItem, returning");
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

        return fetch(`http://localhost:5001/api/itinerary-items/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading itinerary...</p>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Itinerary not found</p>
        <button onClick={() => navigate("/")} style={{ marginTop: "1rem" }}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
          <button
            onClick={() => navigate("/home")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              border: "1px solid #ddd",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            ← Back to Destinations
          </button>
        </div>
        
        <h1 className="h2-md" style={{ marginBottom: "0.5rem" }}>
          {itinerary?.title || "Saved Itinerary"}
        </h1>
      </div>

      {/* Itinerary Content */}
      <div className="panel" style={{ backgroundColor: "#ffffff", padding: "2rem", borderRadius: "0.75rem", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 className="h2-md" style={{ margin: 0 }}>
            Itinerary Details
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{
              background: "linear-gradient(135deg, #fb923c, #f97316)",
              color: "white",
              padding: "0.4rem 1rem",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 600
            }}>
              {dayBoxes.length} Days
            </span>
            <button
              onClick={saveChanges}
              style={{
                background: "#fb923c",
                color: "white",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              💾 Save Changes
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>Loading itinerary...</p>
        ) : dayBoxes.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "#666", fontStyle: "italic" }}>No itinerary content found</p>
          </div>
        ) : (
          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {dayBoxes.map((day, index) => (
              <div key={index} style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    color: "#fb923c",
                    borderBottom: "2px solid #fb923c",
                    paddingBottom: "0.5rem",
                  }}
                >
                  <input
                    value={day.title}
                    onChange={(e) => updateDayTitle(index, e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: "#fb923c",
                      outline: "none",
                      width: "100%"
                    }}
                    placeholder={`Day ${index + 1}`}
                  />
                </h3>
                <div style={{
                  padding: "1rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderLeft: "4px solid #fb923c",
                  borderRadius: "0.5rem",
                }}>
                  {day.activities && day.activities.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {day.activities.map((activity, actIndex) => (
                        <div key={actIndex}>
                          <div
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index, actIndex, 'before')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index, actIndex, 'before')}
                            style={{
                              height: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'before' ? "4px" : "0px",
                              backgroundColor: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'before' ? "#fb923c" : "transparent",
                              transition: "all 0.2s ease",
                              marginBottom: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'before' ? "0.75rem" : "0px",
                              borderRadius: "2px",
                              boxShadow: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'before' ? "0 0 0 2px #fb923c40" : "none"
                            }}
                          />
                          
                          <div 
                            key={`activity-${actIndex}`}
                            draggable="true"
                            onDragStart={(e) => {
                              console.log("🎯 DRAG START on activity card", index, actIndex);
                              e.dataTransfer.effectAllowed = "move";
                              handleDragStart(e, index, actIndex);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDragEnter={(e) => {
                              console.log("➡️ DRAG ENTER on activity card");
                              handleDragEnter(e, index, actIndex, 'center');
                            }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => {
                              console.log("💧 DROP on activity card");
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
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.5rem"
                            }}>
                              <span draggable="false" style={{ fontSize: "1.2rem", cursor: "grab", userSelect: "none" }}>⋮⋮</span>
                              <span draggable="false" style={{ userSelect: "none" }}>{getActivityIcon(activity.type)}</span>
                              <h4 style={{
                                fontSize: "1rem",
                                fontWeight: "600",
                                color: "#1f2937",
                                margin: "0"
                              }}>
                                {activity.title}
                              </h4>
                              {activity.time && (
                                <input
                                  type="time"
                                  draggable="false"
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
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "#6b7280",
                                    marginLeft: "auto",
                                    padding: "0.25rem 0.5rem",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "0.25rem",
                                    cursor: "pointer",
                                    userSelect: "none"
                                  }}
                                />
                              )}
                            </div>
                            <p draggable="false" style={{
                              fontSize: "0.875rem",
                              color: "#4b5563",
                              margin: "0",
                              lineHeight: "1.4"
                            }}>
                              {activity.content}
                            </p>
                          </div>
                          
                          <div
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index, actIndex, 'after')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index, actIndex, 'after')}
                            style={{
                              height: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'after' ? "4px" : "0px",
                              backgroundColor: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'after' ? "#fb923c" : "transparent",
                              transition: "all 0.2s ease",
                              marginTop: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'after' ? "0.75rem" : "0px",
                              borderRadius: "2px",
                              boxShadow: dropIndicator?.dayIndex === index && dropIndicator?.activityIndex === actIndex && dropIndicator?.position === 'after' ? "0 0 0 2px #fb923c40" : "none"
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={day.content}
                      onChange={(e) => updateDayContent(index, e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: "150px",
                        background: "transparent",
                        border: "none",
                        fontSize: "1rem",
                        lineHeight: "1.5",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit"
                      }}
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