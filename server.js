import dotenv from "dotenv";
dotenv.config();
      
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";

import authRoutes from "./routes/auth.js";
// import listingRoutes from "./routes/Listing.js";
import userRoutes from "./routes/user.js";
import adminRoutes from "./routes/adminRoutes.js";
import userDashboardRoutes from "./routes/userDashboardRoutes.js";
import leadGenRoutes from "./routes/leadGenRoutes.js";
// import galleryRoutes from "./routes/gallery.js";
// import enquiryRoutes from "./routes/CourseEnquiry.js";

const app = express();

// ==========================================
// 🔧 CORS CONFIGURATION (RENDER-READY)
// ==========================================
// ✅ Development aur Production dono ke liye

// const allowedOrigins = [
//   "http://localhost:5173",        // Local development
//   "http://localhost:3000",        // Backup local     
//   process.env.FRONTEND_URL,  // Production frontend URL
//   // Render par ye environment variable set karenge
// ];

// app.use(cors({ 
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       console.warn(`⚠️  CORS blocked: ${origin}`);
//       callback(new Error("CORS not allowed"));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://lead-gen-frontend-beryl.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);

    // Normalize origin to compare (remove trailing slash if present)
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    const isAllowed = allowedOrigins.some(o => {
      const normalizedAllowed = o.endsWith('/') ? o.slice(0, -1) : o;
      return normalizedAllowed === normalizedOrigin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
      callback(new Error("CORS blocked"));
    }
  },
  credentials: true
}));

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 📍 ROUTES
// ==========================================
app.use("/api/auth", authRoutes);
// app.use("/api/listings", listingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userDashboardRoutes);
app.use("/api/leadgen", leadGenRoutes);
// app.use("/api/gallery", galleryRoutes);
// app.use("/api/enquiries", enquiryRoutes);

// ==========================================
// 🗺️ OPENSTREETMAP OVERPASS KEYLESS SEARCH
// ==========================================
// Helper list of major Indian cities for "All India" queries
const indianCities = [
  { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { name: "Delhi", lat: 28.6139, lon: 77.2090 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946 },
  { name: "Pune", lat: 18.5204, lon: 73.8567 },
  { name: "Hyderabad", lat: 17.3850, lon: 78.4867 }
];

const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

// Helper to query Overpass with auto-retry across public mirrors (resilient to 429 rate limits)
const callOverpassWithRetry = async (query) => {
  let lastError;
  for (const url of overpassEndpoints) {
    try {
      console.log(`Querying Overpass mirror: ${url}`);
      const response = await axios.post(
        url,
        `data=${encodeURIComponent(query)}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "LeadGenOS/1.0 (suryawanshianiket7576@gmail.com)"
          },
          timeout: 25000
        }
      );
      if (response.data && response.data.elements) {
        return response.data;
      }
    } catch (err) {
      console.warn(`Overpass mirror ${url} failed or rate-limited (429):`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error("All Overpass endpoints failed.");
};

// Helper to determine the closest major city name for coordinate points
const getClosestCity = (lat, lon) => {
  let closest = "India";
  let minDist = Infinity;
  for (const city of indianCities) {
    const dist = Math.pow(Number(lat) - city.lat, 2) + Math.pow(Number(lon) - city.lon, 2);
    if (dist < minDist) {
      minDist = dist;
      closest = city.name;
    }
  }
  return closest;
};

// Helper function to geocode location with fallbacks
const geocodeLocation = async (rawCity) => {
  let attempts = [rawCity];
  
  if (rawCity.toLowerCase().includes(" in ")) {
    const parts = rawCity.split(/\s+in\s+/i);
    attempts.push(parts[parts.length - 1]);
    attempts.push(parts[0]);
  }
  
  if (rawCity.includes(",")) {
    const parts = rawCity.split(",");
    attempts.push(parts[parts.length - 1].trim());
    attempts.push(parts[0].trim());
  }
  
  const cleanAttempts = Array.from(new Set(attempts))
    .map(a => a.trim())
    .filter(a => a.length > 2 && !/^(hotel|hotels|restaurant|restaurants|dentist|dentists|gym|gyms|cafe|cafes|plumber|plumbers|roofer|roofers)$/i.test(a));

  for (const query of cleanAttempts) {
    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await axios.get(geocodeUrl, {
        headers: { 'User-Agent': 'LeadGenOS/1.0 (suryawanshianiket7576@gmail.com)' },
        timeout: 5000
      });
      if (res.data && res.data.length > 0) {
        return {
          lat: res.data[0].lat,
          lon: res.data[0].lon
        };
      }
    } catch (e) {
      console.error(`Geocoding attempt failed for query "${query}":`, e.message);
    }
  }
  return null;
};

// Helper to map search terms to standard OSM tags
const mapCategoryToOsmTags = (cat) => {
  const c = cat.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  
  if (c === "hotel" || c === "motel" || c === "hostel" || c === "guesthouse" || c === "accommodation" || c === "hotels") {
    return { type: "tourism", value: "hotel" };
  }
  if (c === "dentist" || c === "dental" || c === "dentalclinic" || c === "dentists") {
    return { type: "amenity", value: "dentist" };
  }
  if (c === "restaurant" || c === "food" || c === "diner" || c === "eatery" || c === "restaurants") {
    return { type: "amenity", value: "restaurant" };
  }
  if (c === "cafe" || c === "coffee" || c === "coffeeshop" || c === "cafes") {
    return { type: "amenity", value: "cafe" };
  }
  if (c === "bar" || c === "pub" || c === "nightclub" || c === "bars" || c === "pubs") {
    return { type: "amenity", value: "bar" };
  }
  if (c === "hospital" || c === "clinic" || c === "medical" || c === "doctor" || c === "doctors" || c === "hospitals" || c === "clinics") {
    return { type: "amenity", value: "hospital" };
  }
  if (c === "pharmacy" || c === "chemist" || c === "drugstore" || c === "pharmacies") {
    return { type: "amenity", value: "pharmacy" };
  }
  if (c === "school" || c === "college" || c === "university" || c === "coaching" || c === "academy" || c === "schools") {
    return { type: "amenity", value: "school" };
  }
  if (c === "bank" || c === "finance" || c === "cooperative" || c === "banks") {
    return { type: "amenity", value: "bank" };
  }
  if (c === "atm" || c === "cash" || c === "atms") {
    return { type: "amenity", value: "atm" };
  }
  if (c === "gym" || c === "fitness" || c === "sports" || c === "club" || c === "gyms") {
    return { type: "leisure", value: "fitness_centre" };
  }
  if (c === "plumber" || c === "plumbing" || c === "plumbers") {
    return { type: "craft", value: "plumber" };
  }
  if (c === "roofer" || c === "roofing" || c === "roofers") {
    return { type: "craft", value: "roofer" };
  }
  if (c === "electrician" || c === "electrical" || c === "electricians") {
    return { type: "craft", value: "electrician" };
  }
  if (c === "carpenter" || c === "carpentry" || c === "carpenters") {
    return { type: "craft", value: "carpenter" };
  }
  if (c === "realestate" || c === "estateagent" || c === "broker" || c === "property" || c === "realestateagent" || c === "propertydealer") {
    return { type: "office", value: "estate_agent" };
  }
  if (c === "marketing" || c === "digitalmarketing" || c === "advertising" || c === "agency" || c === "seo" || c === "marketingagency") {
    return { type: "office", value: "advertising" };
  }
  if (c === "webdesign" || c === "webdeveloper" || c === "software" || c === "itcompany" || c === "technology" || c === "webdevelopment") {
    return { type: "office", value: "it" };
  }
  if (c === "lawyer" || c === "legal" || c === "attorney" || c === "advocate" || c === "lawyers" || c === "advocates") {
    return { type: "office", value: "lawyer" };
  }
  if (c === "carrepair" || c === "garage" || c === "mechanic" || c === "autorepair" || c === "carwash") {
    return { type: "shop", value: "car_repair" };
  }
  if (c === "salon" || c === "hairdresser" || c === "barber" || c === "beauty" || c === "spa" || c === "parlour" || c === "salons") {
    return { type: "shop", value: "hairdresser" };
  }
  if (c === "bakery" || c === "cake" || c === "sweets" || c === "bakeries") {
    return { type: "shop", value: "bakery" };
  }
  if (c === "supermarket" || c === "grocery" || c === "convenience" || c === "store" || c === "shop" || c === "shops" || c === "supermarkets") {
    return { type: "shop", value: "supermarket" };
  }
  if (c === "clothing" || c === "boutique" || c === "apparel" || c === "fashion" || c === "clothes") {
    return { type: "shop", value: "clothes" };
  }

  return { type: "any", value: cat };
};

// ==========================================
// 🎲 DYNAMIC MOCK LEADS GENERATOR (FALLBACK)
// ==========================================
const generateMockLeads = (category, city, lat, lon) => {
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  const cleanCat = (category || "Business").trim();
  const cleanCity = (city || "India").trim();
  const capCat = cleanCat.split(' ').map(cap).join(' ');
  const capCity = cleanCity.split(' ').map(cap).join(' ');
  
  const baseLat = Number(lat) || 18.5204;
  const baseLon = Number(lon) || 73.8567;

  const patterns = [
    { name: `${capCat} Hub ${capCity}`, web: `https://www.${cleanCat.toLowerCase().replace(/[^a-z0-9]/g, "")}hub${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` },
    { name: `Premium ${capCat} Services`, web: `https://www.premium${cleanCat.toLowerCase().replace(/[^a-z0-9]/g, "")}${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, "")}.in` },
    { name: `${capCity} ${capCat} Centre`, web: `https://www.${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, "")}${cleanCat.toLowerCase().replace(/[^a-z0-9]/g, "")}centre.com` },
    { name: `Elite ${capCat} Group`, web: null },
    { name: `The ${capCat} Collective`, web: `https://www.the${cleanCat.toLowerCase().replace(/[^a-z0-9]/g, "")}collective.in` },
    { name: `Active ${capCat} Point`, web: null },
    { name: `Apex ${capCat} & Co.`, web: `https://www.apex${cleanCat.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` },
    { name: `Metro ${capCat} Zone`, web: `https://www.metro${cleanCat.toLowerCase().replace(/[^a-z0-9]/g, "")}${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, "")}.co` },
    { name: `${capCity} ${capCat} Solutions`, web: `https://www.${cleanCity.toLowerCase().replace(/[^a-z0-9]/g, "")}${cleanCat.toLowerCase().replace(/[^a-z0-9]/g, "")}solutions.com` },
    { name: `Universal ${capCat} Hub`, web: null }
  ];

  return patterns.map((p, idx) => {
    const offsetLat = baseLat + (Math.random() - 0.5) * 0.03;
    const offsetLon = baseLon + (Math.random() - 0.5) * 0.03;
    const randomPhone = `+91 ${Math.floor(7000000000 + Math.random() * 2900000000)}`;
    const randomRating = (3.8 + Math.random() * 1.1).toFixed(1);

    return {
      name: p.name,
      address: `Plot No. ${idx + 24}, Sector ${idx + 2}, Main Road, near High Street Mall, ${capCity}, India`,
      phone: randomPhone,
      website: p.web || '',
      rating: parseFloat(randomRating),
      latitude: String(offsetLat),
      longitude: String(offsetLon)
    };
  });
};

app.get("/api/search", async (req, res) => {
  const { city, category } = req.query;
  if (!city || !category) {
    return res.status(400).json({ message: "City and category query parameters are required." });
  }

  // Normalize Category using mapper
  const mappedCat = mapCategoryToOsmTags(category);
  const cleanInputLocation = city.toLowerCase().trim().replace(/\s+/g, "");
  const isAllIndia = cleanInputLocation === "india" || cleanInputLocation === "allindia" || cleanInputLocation === "allindiachapahije";

  let tagQuery = "";
  let coordinates = null;

  if (isAllIndia) {
    // Union search across multiple major Indian cities
    const clauses = [];
    for (const item of indianCities) {
      if (mappedCat.type === "any") {
        clauses.push(`
          node["shop"~"${mappedCat.value}",i](around:4000, ${item.lat}, ${item.lon});
          node["amenity"~"${mappedCat.value}",i](around:4000, ${item.lat}, ${item.lon});
          node["office"~"${mappedCat.value}",i](around:4000, ${item.lat}, ${item.lon});
        `);
      } else {
        clauses.push(`
          node["${mappedCat.type}"="${mappedCat.value}"](around:4000, ${item.lat}, ${item.lon});
          way["${mappedCat.type}"="${mappedCat.value}"](around:4000, ${item.lat}, ${item.lon});
        `);
      }
    }
    tagQuery = clauses.join("\n");
  } else {
    // Normal localized search: geocode and search within 5km around coordinates
    try {
      coordinates = await geocodeLocation(city);
    } catch (e) {
      console.warn("Geocoding failed, falling back to mock leads:", e.message);
    }

    if (!coordinates) {
      console.warn(`Location "${city}" could not be geocoded. Returning mock leads.`);
      const mockLeads = generateMockLeads(category, city);
      return res.json(mockLeads);
    }

    const { lat, lon } = coordinates;

    if (mappedCat.type === "any") {
      tagQuery = `
        node["shop"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
        way["shop"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
        node["amenity"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
        way["amenity"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
        node["office"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
        way["office"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
        node["craft"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
        way["craft"~"${mappedCat.value}",i](around:5000, ${lat}, ${lon});
      `;
    } else {
      tagQuery = `
        node["${mappedCat.type}"="${mappedCat.value}"](around:5000, ${lat}, ${lon});
        way["${mappedCat.type}"="${mappedCat.value}"](around:5000, ${lat}, ${lon});
        relation["${mappedCat.type}"="${mappedCat.value}"](around:5000, ${lat}, ${lon});
      `;
    }
  }

  const overpassQuery = `
    [out:json][timeout:25];
    (
      ${tagQuery}
    );
    out center tags;
  `;

  try {
    const data = await callOverpassWithRetry(overpassQuery);
    const elements = data.elements || [];
    const mapped = elements.map(el => {
      const tags = el.tags || {};

      // Coordinates mapping
      let latitude = '';
      let longitude = '';
      if (el.type === 'node') {
        latitude = el.lat ? String(el.lat) : '';
        longitude = el.lon ? String(el.lon) : '';
      } else if (el.center) {
        latitude = el.center.lat ? String(el.center.lat) : '';
        longitude = el.center.lon ? String(el.center.lon) : '';
      }

      // Combine address fields
      const addressParts = [];
      if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
      if (tags['addr:street']) addressParts.push(tags['addr:street']);
      if (tags['addr:suburb']) addressParts.push(tags['addr:suburb']);
      if (tags['addr:city']) addressParts.push(tags['addr:city']);
      if (tags['addr:postcode']) addressParts.push(tags['addr:postcode']);

      const addressFallback = isAllIndia ? `${getClosestCity(latitude, longitude)}, India` : city;
      const address = addressParts.length > 0 ? addressParts.join(', ') : (tags['addr:full'] || addressFallback);

      // Get phone
      const phone = tags.phone || tags['contact:phone'] || '';

      // Get website
      const website = tags.website || tags['contact:website'] || '';

      // Get rating (default to standard fallback if not present)
      const rating = tags.rating ? parseFloat(tags.rating) : parseFloat((3.5 + Math.random() * 1.3).toFixed(1));

      return {
        name: tags.name || `Unnamed ${category}`,
        address: address || 'Address N/A',
        phone,
        website,
        latitude,
        longitude,
        rating
      };
    });

    // Filter to prioritize listings with real contact info (phone or website)
    // and exclude generic unnamed places
    const validLeads = mapped.filter(el => {
      const hasName = el.name && !el.name.toLowerCase().startsWith("unnamed");
      const hasContact = el.phone || el.website;
      return hasName && hasContact;
    });

    let finalResults = validLeads;
    if (finalResults.length < 10) {
      // If we don't have 10 leads with contact info, fill the rest with other named places
      const additional = mapped.filter(el => {
        const hasName = el.name && !el.name.toLowerCase().startsWith("unnamed");
        const isAlreadyIncluded = validLeads.some(v => v.name === el.name && v.address === el.address);
        return hasName && !isAlreadyIncluded;
      });
      finalResults = [...finalResults, ...additional];
    }

    // If still 0 listings found, fall back to mock leads
    if (finalResults.length === 0) {
      console.log(`No OSM listings found for category: "${category}" in "${city}". Returning mock leads.`);
      const mockLeads = generateMockLeads(category, city, coordinates?.lat, coordinates?.lon);
      return res.json(mockLeads);
    }

    // Limit results to exactly 10 leads
    res.json(finalResults.slice(0, 10));
  } catch (err) {
    console.error("Overpass search error, falling back to mock leads:", err.message);
    const mockLeads = generateMockLeads(category, city, coordinates?.lat, coordinates?.lon);
    res.json(mockLeads);
  }
});

// ==========================================
// 🔍 DEBUG SEARCH ENDPOINT
// ==========================================
app.get("/api/debug-search", async (req, res) => {
  const { city, category } = req.query;
  const logs = [];
  logs.push(`Querying debug search for city: "${city}", category: "${category}"`);

  let attempts = [city];
  if (city.toLowerCase().includes(" in ")) {
    const parts = city.split(/\s+in\s+/i);
    attempts.push(parts[parts.length - 1]);
    attempts.push(parts[0]);
  }
  if (city.includes(",")) {
    const parts = city.split(",");
    attempts.push(parts[parts.length - 1].trim());
    attempts.push(parts[0].trim());
  }

  const cleanAttempts = Array.from(new Set(attempts))
    .map(a => a.trim())
    .filter(a => a.length > 2 && !/^(hotel|hotels|restaurant|restaurants|dentist|dentists|gym|gyms|cafe|cafes|plumber|plumbers|roofer|roofers)$/i.test(a));

  logs.push(`Clean attempts: ${JSON.stringify(cleanAttempts)}`);

  let coordinates = null;
  for (const query of cleanAttempts) {
    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      logs.push(`Geocoding attempt for: "${query}" via URL: ${geocodeUrl}`);
      const response = await axios.get(geocodeUrl, {
        headers: { 'User-Agent': 'LeadGenOS/1.0 (suryawanshianiket7576@gmail.com)' },
        timeout: 5000
      });
      if (response.data && response.data.length > 0) {
        coordinates = {
          query,
          display_name: response.data[0].display_name,
          lat: response.data[0].lat,
          lon: response.data[0].lon
        };
        logs.push(`Geocoding succeeded for "${query}" -> Lat: ${coordinates.lat}, Lon: ${coordinates.lon}`);
        break;
      } else {
        logs.push(`Geocoding empty for "${query}"`);
      }
    } catch (e) {
      logs.push(`Geocoding failed for "${query}": ${e.message}`);
    }
  }

  if (!coordinates) {
    return res.status(400).json({ success: false, logs, error: "Geocoding failed entirely" });
  }

  const mappedCat = mapCategoryToOsmTags(category);
  logs.push(`Mapped category tags: ${JSON.stringify(mappedCat)}`);

  const tagQuery = `
    node["${mappedCat.type}"="${mappedCat.value}"](around:5000, ${coordinates.lat}, ${coordinates.lon});
    way["${mappedCat.type}"="${mappedCat.value}"](around:5000, ${coordinates.lat}, ${coordinates.lon});
    relation["${mappedCat.type}"="${mappedCat.value}"](around:5000, ${coordinates.lat}, ${coordinates.lon});
  `;

  const overpassQuery = `
    [out:json][timeout:25];
    (
      ${tagQuery}
    );
    out center tags;
  `;

  logs.push("Overpass query constructed.");

  let overpassData = null;
  let successMirror = null;
  for (const url of overpassEndpoints) {
    try {
      logs.push(`Attempting Overpass mirror: ${url}`);
      const response = await axios.post(
        url,
        `data=${encodeURIComponent(overpassQuery)}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "LeadGenOS/1.0 (suryawanshianiket7576@gmail.com)"
          },
          timeout: 25000
        }
      );
      if (response.data && response.data.elements) {
        overpassData = response.data;
        successMirror = url;
        logs.push(`Overpass mirror ${url} succeeded! Received ${response.data.elements.length} elements.`);
        break;
      } else {
        logs.push(`Overpass mirror ${url} returned response without elements: ${typeof response.data === 'object' ? JSON.stringify(response.data).slice(0, 200) : String(response.data).slice(0, 200)}`);
      }
    } catch (err) {
      logs.push(`Overpass mirror ${url} failed: ${err.message}`);
    }
  }

  if (!overpassData) {
    return res.status(500).json({ success: false, logs, error: "All Overpass mirrors failed" });
  }

  res.json({
    success: true,
    logs,
    coordinates,
    successMirror,
    rawElementsCount: overpassData.elements.length,
    sampleElement: overpassData.elements[0] || null
  });
});

// ==========================================
// HEALTH CHECK ROUTES
// ==========================================
app.get("/", (req, res) => {
  res.json({ 
    message: "Server is running ✅",
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check for monitoring
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date()
  });
});

// ==========================================
// 404 - NOT FOUND
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path
  });
});

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
});

// ==========================================
// DATABASE CONNECTION
// ==========================================
const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
    
    if (!mongoUrl) {
      throw new Error("❌ MONGO_URL environment variable not set!");
    }

    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB Connected Successfully!");
    return true;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    return false;
  }
};

// ==========================================
// SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

let server;

const startServer = async () => {
  const dbConnected = await connectDB();
  
  if (!dbConnected && NODE_ENV === "production") {
    console.error("❌ Cannot start server without database connection in production!");
    process.exit(1);
  }

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔════════════════════════════════════╗
║   🚀 SERVER STARTED SUCCESSFULLY   ║
║   Port: ${PORT}
║   Environment: ${NODE_ENV}
║   URL: http://localhost:${PORT}
║   MongoDB: ${mongoose.connection.readyState === 1 ? "✅ Connected" : "⚠️  Connecting..."}
╚════════════════════════════════════╝
    `);
  });
};

startServer();

// ==========================================
// GRACEFUL SHUTDOWN (RENDER KE LIYE IMPORTANT)
// ==========================================

process.on("SIGTERM", () => {
  console.log("📋 SIGTERM received: Closing server gracefully...");
  if (server) {
    server.close(() => {
      console.log("✅ HTTP server closed");
      mongoose.connection.close(false, () => {
        console.log("✅ MongoDB connection closed");
        process.exit(0);
      });
    });
  }
});

process.on("SIGINT", () => {
  console.log("📋 SIGINT received: Closing server gracefully...");
  if (server) {
    server.close(() => {
      console.log("✅ HTTP server closed");
      mongoose.connection.close(false, () => {
        console.log("✅ MongoDB connection closed");
        process.exit(0);
      });
    });
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  process.exit(1);
});

export default app;