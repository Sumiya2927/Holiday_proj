// High-resolution photography mappings for all hotels and attractions in the catalog
const HOTEL_IMAGES = {
  // Catalog image keys
  'images/hotels/HOTEL-TWIN-1.jpg': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-TWIN-2.jpg': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-BUSINESS-1.jpg': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-BUSINESS-2.jpg': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-FAMILY-1.jpg': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-LUXURY-1.jpg': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-LUXURY-2.jpg': 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-CAPSULE-1.jpg': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-RYOKAN-1.jpg': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'images/hotels/HOTEL-RYOKAN-2.jpg': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
};

const ATTRACTION_IMAGES = {
  // Tokyo
  'teamLab Planets TOKYO': 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?auto=format&fit=crop&w=800&q=80',
  'Tokyo Disneyland': 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=800&q=80',
  'Tokyo Toy Museum': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
  'Senso-ji': 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80',
  'Tokyo National Museum': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  'Edo Craft Museum': 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=800&q=80',
  'Tokyo Skytree': 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
  'Ueno Park': 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=80',
  'Ameyoko Market': 'https://images.unsplash.com/photo-1554797589-7241abc22097?auto=format&fit=crop&w=800&q=80',
  'Meiji Jingu': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'Shibuya Crossing': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'Tokyo Tower': 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80',
  'Tsukiji Outer Market': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'Shinjuku Gyoen': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  'Odaiba Seaside Park': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',

  // Kyoto
  'Kiyomizu-dera': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
  'Fushimi Inari Taisha': 'https://images.unsplash.com/photo-1478436127897-769e00d0c715?auto=format&fit=crop&w=800&q=80',
  'Kinkaku-ji': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'Arashiyama Bamboo Grove': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80',
  'Nishiki Market': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'Gion District': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
  "Philosopher's Path": 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=80',
  'Kyoto Railway Museum': 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=80',
  'Nijo Castle': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  'Sanjusangen-do': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'Kyoto Aquarium': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  'Kyoto Imperial Palace': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',

  // Osaka
  'Dotonbori': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
  'Kuromon Ichiba Market': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'Osaka Castle': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  'Universal Studios Japan': 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=800&q=80',
  'Osaka Aquarium Kaiyukan': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  'Umeda Sky Building': 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
  'Shinsekai': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
  'Sumiyoshi Taisha': 'https://images.unsplash.com/photo-1478436127897-769e00d0c715?auto=format&fit=crop&w=800&q=80',
  'Osaka Science Museum': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',

  // Nara
  'Nara Park': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'Todai-ji': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',

  // Dubai
  'Burj Khalifa At the Top': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
  'Dubai Aquarium and Underwater Zoo': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  'Dubai Frame': 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80',
  'Museum of the Future': 'https://images.unsplash.com/photo-1647424825116-fbf8b9415fc5?auto=format&fit=crop&w=800&q=80',
  'Al Fahidi Historical District': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
  'Dubai Gold Souk': 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=80',
  'Jumeirah Public Beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'Dubai Miracle Garden': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
  'Global Village': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
  'Etihad Museum': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
  'Ski Dubai': 'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=800&q=80',

  // Abu Dhabi
  'Sheikh Zayed Grand Mosque': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
  'Louvre Abu Dhabi': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  'Wahat Al Karama': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
  'Qasr Al Watan': 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80',
  'Corniche Beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'Heritage Village': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
  'Eastern Mangroves Kayak Tour': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
};

export function getPhotoUrl(src, nameOrAlt = '') {
  if (!src && !nameOrAlt) return '';

  // Already a full remote URL
  if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
    return src;
  }

  // Exact match from attraction name
  if (nameOrAlt && ATTRACTION_IMAGES[nameOrAlt]) {
    return ATTRACTION_IMAGES[nameOrAlt];
  }

  // Exact match from catalog relative path
  if (src && HOTEL_IMAGES[src]) {
    return HOTEL_IMAGES[src];
  }

  // Fuzzy match on attraction name
  if (nameOrAlt) {
    const matchedAttraction = Object.keys(ATTRACTION_IMAGES).find(k =>
      nameOrAlt.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(nameOrAlt.toLowerCase())
    );
    if (matchedAttraction) return ATTRACTION_IMAGES[matchedAttraction];
  }

  // City-based fallbacks for hotels or attractions
  const lower = (String(src) + ' ' + String(nameOrAlt)).toLowerCase();
  if (lower.includes('kyoto') || lower.includes('ryokan') || lower.includes('gion')) {
    return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('tokyo') || lower.includes('ginza') || lower.includes('shinjuku') || lower.includes('shibuya')) {
    return 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('osaka') || lower.includes('dotonbori') || lower.includes('namba')) {
    return 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('dubai') || lower.includes('burj')) {
    return 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('abu dhabi') || lower.includes('corniche')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  }

  // Default travel photo fallback
  return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80';
}

