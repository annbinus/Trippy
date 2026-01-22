import express from "express";
import pool from "../db.js";

// Import activity parsing functions
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

const router = express.Router();

// GET itinerary with all destinations that have items in it
router.get("/:itineraryId/destinations", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    // Return all destinations, marking which ones are part of this itinerary
    // This lets the frontend show every destination and highlight those already in the itinerary
    const { rows: destinations } = await pool.query(
      `SELECT
        d.id,
        d.name,
        d.description,
        d.latitude,
        d.longitude,
        d.image_url,
        d.created_at,
        CASE WHEN EXISTS (
          SELECT 1 FROM itinerary_items ii WHERE ii.destination_id = d.id AND ii.itinerary_id = $1
        ) THEN true ELSE false END as in_itinerary
      FROM destinations d
      ORDER BY d.name ASC`,
      [itineraryId]
    );

    res.json(destinations);
  } catch (err) {
    console.error("GET /api/itineraries/:id/destinations error:", err);
    res.status(500).json({ error: "Failed to fetch destinations" });
  }
});

// GET itinerary details
router.get("/:itineraryId", async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const { rows } = await pool.query(
      "SELECT * FROM itineraries WHERE id = $1",
      [itineraryId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Itinerary not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/itineraries/:id error:", err);
    res.status(500).json({ error: "Failed to fetch itinerary" });
  }
});

// Helper function to geocode a destination using Mapbox
async function geocodeDestination(destinationName) {
  if (!destinationName) {
    console.warn("No destination name provided for geocoding");
    return { latitude: 40.7128, longitude: -74.0060 };
  }

  try {
    const mapboxToken = "pk.eyJ1IjoiYW5uYmludXMiLCJhIjoiY21rNHB3c2wxMDIxYjNlb3BzZnAyeHdqdiJ9.JBPzH4oT7DjWIMJaCjCuBw";
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destinationName)}.json?access_token=${mapboxToken}&limit=1`;
    
    console.log(`Geocoding destination: "${destinationName}"`);
    const geocodeRes = await fetch(url);
    
    if (!geocodeRes.ok) {
      console.warn(`Geocoding failed with status ${geocodeRes.status} for "${destinationName}"`);
      return { latitude: 40.7128, longitude: -74.0060 };
    }
    
    const geocodeData = await geocodeRes.json();
    console.log(`Geocoding response for "${destinationName}":`, JSON.stringify(geocodeData, null, 2));
    
    if (geocodeData.features && geocodeData.features.length > 0) {
      const [lng, lat] = geocodeData.features[0].center;
      console.log(`✓ Successfully geocoded "${destinationName}" to (${lat}, ${lng})`);
      return { latitude: lat, longitude: lng };
    } else {
      console.warn(`No features found for "${destinationName}"`);
      return { latitude: 40.7128, longitude: -74.0060 };
    }
  } catch (err) {
    console.error(`Error geocoding "${destinationName}":`, err);
    return { latitude: 40.7128, longitude: -74.0060 };
  }
}

// POST - Create a new itinerary with day items
router.post("/", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { title, destinations, preferences, days, itinerary } = req.body;
    
    console.log("POST /api/itineraries received payload:");
    console.log("Title:", title);
    console.log("Destinations:", destinations);
    console.log("Itinerary array:", JSON.stringify(itinerary, null, 2));

    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
      return res.status(400).json({ error: "Itinerary items are required" });
    }

    await client.query('BEGIN');

    // Geocode the first destination to get coordinates
    let latitude = 40.7128; // Default NYC
    let longitude = -74.0060;
    
    if (destinations && destinations.length > 0) {
      const coords = await geocodeDestination(destinations[0]);
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    // Create the itinerary with coordinates stored in the title or a metadata approach
    // Since we don't have a coordinates column, we'll store them in a JSON metadata field or update schema
    // For now, we'll store them and pass them back in the response
    const itineraryTitle = title || `Trip to ${destinations?.join(", ") || "Unknown"}`;
    const { rows: [newItinerary] } = await client.query(
      `INSERT INTO itineraries (title)
       VALUES ($1)
       RETURNING *`,
      [itineraryTitle]
    );

    // Create itinerary items (one per day) using existing schema
    // Store day title, content, and coordinates in notes field as JSON
    const itemPromises = itinerary.map((day, index) =>
      client.query(
        `INSERT INTO itinerary_items (itinerary_id, day, position, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          newItinerary.id,
          index + 1,
          index,
          JSON.stringify({
            title: day.title || `Day ${index + 1}`,
            content: day.content || "",
            destinations: destinations || [],
            preferences: preferences || [],
            coordinates: { latitude, longitude }
          })
        ]
      )
    );

    const itemResults = await Promise.all(itemPromises);
    const items = itemResults.map(r => r.rows[0]);

    // Automatically extract activities and group them under each day
    let extractedCount = 0;
    for (const item of items) {
      if (item.notes) {
        try {
          const dayData = JSON.parse(item.notes);
          console.log("Processing day data:", JSON.stringify(dayData, null, 2));
          
          if (dayData.content) {
            console.log("Day content to parse:", dayData.content);
            // Parse activities from content
            const activities = parseActivitiesFromDayContent(dayData.content);
            console.log("Extracted activities:", JSON.stringify(activities, null, 2));
            
            if (activities.length > 0) {
              // Create activities array with proper structure
              const structuredActivities = activities.map(activity => ({
                title: activity.location,
                content: activity.description,
                type: activity.type,
                time: activity.time
              }));
              
              // Update the day item to include the activities array while preserving coordinates and destinations
              const updatedNotes = JSON.stringify({
                title: dayData.title,
                content: dayData.content,
                destinations: dayData.destinations,
                preferences: dayData.preferences,
                coordinates: dayData.coordinates,
                activities: structuredActivities
              });
              
              // Update the existing day item with activities
              await client.query(
                "UPDATE itinerary_items SET notes = $1 WHERE id = $2",
                [updatedNotes, item.id]
              );
              
              extractedCount += activities.length;
            }
          }
        } catch (parseError) {
          console.warn('Could not parse item notes:', parseError);
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      itinerary: newItinerary,
      extractedActivities: extractedCount,
      message: `Itinerary saved with ${extractedCount} individual activities organized under ${items.length} days!`
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("POST /api/itineraries error:", err);
    res.status(500).json({ error: "Failed to save itinerary" });
  } finally {
    client.release();
  }
});

// GET all itineraries (for listing)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM itineraries ORDER BY created_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/itineraries error:", err);
    res.status(500).json({ error: "Failed to fetch itineraries" });
  }
});

// DELETE an itinerary and its items
router.delete("/:itineraryId", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { itineraryId } = req.params;

    await client.query('BEGIN');

    // Delete itinerary items first (foreign key constraint)
    await client.query(
      'DELETE FROM itinerary_items WHERE itinerary_id = $1',
      [itineraryId]
    );

    // Delete the itinerary
    const { rows } = await client.query(
      'DELETE FROM itineraries WHERE id = $1 RETURNING *',
      [itineraryId]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Itinerary not found" });
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: "Itinerary deleted successfully",
      deleted: rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DELETE /api/itineraries/:id error:", err);
    res.status(500).json({ error: "Failed to delete itinerary" });
  } finally {
    client.release();
  }
});

export default router;
