// server/routes/destinations.js (or wherever you handle API routes)
import express from "express";
import pool from "../db.js"; // your PostgreSQL pool connection

const router = express.Router();

// GET all destinations
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM destinations ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const {
    name,
    description = null,
    latitude = null,
    longitude = null,
    image_url = null,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO destinations
       (name, description, latitude, longitude, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, latitude, longitude, image_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /destinations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /extract-activities - Replace day content with individual activity items
router.post("/extract-activities", async (req, res) => {
  const { itineraryId } = req.body;

  if (!itineraryId) {
    return res.status(400).json({ error: "Itinerary ID is required" });
  }

  try {
    // Get itinerary items
    const itemsResult = await pool.query(
      "SELECT * FROM itinerary_items WHERE itinerary_id = $1 ORDER BY day, position",
      [itineraryId]
    );

    const items = itemsResult.rows;
    let extractedCount = 0;

    for (const item of items) {
      if (item.notes) {
        try {
          const dayData = JSON.parse(item.notes);
          if (dayData.content) {
            // Parse activities from content
            const activities = parseActivitiesFromDayContent(dayData.content);
            
            if (activities.length > 0) {
              // Delete the current day item
              await pool.query(
                "DELETE FROM itinerary_items WHERE id = $1",
                [item.id]
              );

              // Create individual items for each activity
              for (let i = 0; i < activities.length; i++) {
                const activity = activities[i];
                const activityTitle = activity.location;
                const activityDescription = `${activity.time ? activity.time + ' - ' : ''}${activity.description}`;
                
                await pool.query(
                  `INSERT INTO itinerary_items (itinerary_id, destination_id, day, position, notes)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [
                    itineraryId,
                    null,
                    item.day,
                    i + 1, // Position starts from 1
                    JSON.stringify({
                      title: activityTitle,
                      content: activityDescription
                    })
                  ]
                );
                
                extractedCount++;
              }
            }
          }
        } catch (parseError) {
          console.warn('Could not parse item notes:', parseError);
        }
      }
    }

    res.json({ 
      message: `Extracted ${extractedCount} individual activities. Each activity is now a separate item in the itinerary!`,
      extractedCount 
    });

  } catch (err) {
    console.error("Extract activities error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to parse activities (duplicate of frontend function)
function parseActivitiesFromDayContent(content) {
  const activities = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed !== '-' && !trimmed.startsWith('-')) {
      const timeMatch = trimmed.match(/^(\d{1,2}:\d{2}\s*(AM|PM)?)\s*-\s*(.+)/i);
      if (timeMatch) {
        const time = timeMatch[1];
        const activity = timeMatch[3];
        
        const colonIndex = activity.indexOf(':');
        if (colonIndex > -1) {
          const location = activity.substring(0, colonIndex).trim();
          const description = activity.substring(colonIndex + 1).trim();
          
          activities.push({
            time,
            location,
            description,
            type: inferActivityType(location, description)
          });
        } else {
          activities.push({
            time,
            location: activity,
            description: '',
            type: inferActivityType(activity, '')
          });
        }
      } else if (trimmed.startsWith('-')) {
        const activityText = trimmed.substring(1).trim();
        const colonIndex = activityText.indexOf(':');
        if (colonIndex > -1) {
          const location = activityText.substring(0, colonIndex).trim();
          const description = activityText.substring(colonIndex + 1).trim();
          
          activities.push({
            time: '',
            location,
            description,
            type: inferActivityType(location, description)
          });
        }
      }
    }
  }
  
  return activities;
}

function inferActivityType(location, description) {
  const text = (location + ' ' + description).toLowerCase();
  
  if (text.includes('restaurant') || text.includes('lunch') || text.includes('dinner') || text.includes('food') || text.includes('cuisine') || text.includes('market')) {
    return 'restaurant';
  } else if (text.includes('museum') || text.includes('temple') || text.includes('shrine') || text.includes('pavilion') || text.includes('art')) {
    return 'museum';
  } else if (text.includes('park') || text.includes('garden') || text.includes('nature') || text.includes('scenic')) {
    return 'park';
  } else if (text.includes('shopping') || text.includes('market') || text.includes('boutique') || text.includes('store')) {
    return 'shopping';
  } else if (text.includes('nightlife') || text.includes('bar') || text.includes('club') || text.includes('lounge')) {
    return 'nightlife';
  } else if (text.includes('hotel') || text.includes('accommodation') || text.includes('stay')) {
    return 'hotel';
  } else {
    return 'activity';
  }
}

function getImageForActivityType(type) {
  const imageMap = {
    restaurant: '/assets/pic1.webp',
    museum: '/assets/pic2.avif',
    park: '/assets/pic3.avif',
    shopping: '/assets/pic4.jpg',
    nightlife: '/assets/pic1.webp',
    hotel: '/assets/pic2.avif',
    activity: '/assets/pic3.avif'
  };
  return imageMap[type] || '/assets/pic1.webp';
}

// DELETE a destination
router.delete("/:destinationId", async (req, res) => {
  try {
    const { destinationId } = req.params;

    const { rows } = await pool.query(
      'DELETE FROM destinations WHERE id = $1 RETURNING *',
      [destinationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Destination not found" });
    }

    res.json({ 
      success: true, 
      message: "Destination deleted successfully",
      deleted: rows[0]
    });

  } catch (err) {
    console.error("DELETE /api/destinations/:id error:", err);
    res.status(500).json({ error: "Failed to delete destination" });
  }
});

export default router;
