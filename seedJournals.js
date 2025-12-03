const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Initialize Supabase with Service Role Key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const journals = [
  {
    id: 'future-of-stainless-steel',
    title: 'The Future of Sustainable Kitchen Design',
    excerpt: 'Why stainless steel is becoming the material of choice for eco-conscious homeowners and architects alike.',
    image: 'image1.jpeg',
    category: 'Sustainability',
    date: '2023-10-15',
    featured: true,
    content: `
      <p>In an era where sustainability is no longer just a buzzword but a necessity, the materials we choose for our homes play a pivotal role. Among the myriad of options available for kitchen design, stainless steel is emerging as a clear frontrunner for the eco-conscious homeowner.</p>
      
      <h3>Durability Meets Sustainability</h3>
      <p>The most sustainable product is one that doesn't need to be replaced. Stainless steel kitchens are renowned for their incredible longevity. Unlike timber which can warp, or laminates that can peel, high-grade SUS304 stainless steel is impervious to moisture, heat, and pests. A Solidoro kitchen is designed to last for decades, significantly reducing the waste associated with kitchen renovations.</p>

      <h3>100% Recyclable</h3>
      <p>Stainless steel is one of the most recycled materials on the planet. At the end of its very long life, a stainless steel kitchen can be fully recycled into new steel products, creating a closed-loop lifecycle that minimizes environmental impact.</p>

      <h3>Healthier Living Environments</h3>
      <p>Beyond the planetary benefits, stainless steel offers a healthier home environment. It emits no VOCs (Volatile Organic Compounds) and requires no harsh chemicals for cleaning—warm water and a mild detergent are usually sufficient. Its non-porous surface also means it harbors no bacteria, making it the hygienic choice for food preparation.</p>
    `
  },
  {
    id: 'minimalist-living-sydney',
    title: 'Minimalist Living in Sydney Harbour',
    excerpt: 'A tour of a recently completed project featuring our Baineng collection in a compact waterfront apartment.',
    image: 'image2.jpeg',
    category: 'Projects',
    date: '2023-11-02',
    content: `
      <p>Sydney's harbor-front apartments offer breathtaking views but often come with a challenge: limited space. In this recent project, we were tasked with creating a full-featured chef's kitchen within a compact footprint, without compromising on the open-plan aesthetic that frames the view.</p>

      <h3>The Challenge</h3>
      <p>The client wanted a kitchen that felt "invisible" when not in use but performed like a commercial workspace when entertaining. The existing layout was cramped and dark, with overhead cabinets blocking the natural light.</p>

      <h3>The Solution</h3>
      <p>We utilized the Baineng collection's "Modern Minimalism" series. By using reflective stainless steel surfaces, we were able to bounce natural light deeper into the apartment, making the space feel larger. We opted for a handle-less design to maintain clean lines and integrated all appliances behind stainless steel panels.</p>

      <p>The result is a kitchen that acts as a piece of modern sculpture—beautiful to look at, yet incredibly functional. The durability of the steel is perfect for the salt-air environment, ensuring the finish remains pristine for years.</p>
    `
  },
  {
    id: 'outdoor-kitchen-trends',
    title: '2024 Outdoor Kitchen Trends',
    excerpt: 'From modular units to weather-resistant finishes, here is what to expect in outdoor culinary spaces next year.',
    image: 'image3.jpeg',
    category: 'Design',
    date: '2023-09-28',
    content: `
      <p>As we look towards 2024, the line between indoor and outdoor living continues to blur. The "alfresco" area is no longer just a place for a BBQ; it's becoming a fully equipped second kitchen. Here are the top trends we're seeing for the upcoming year.</p>

      <h3>1. Modular Flexibility</h3>
      <p>Homeowners are moving away from built-in masonry structures in favor of modular stainless steel units. These offer the flexibility to reconfigure the space if needed and are far easier to install. Our Thor collection, with its modular cabinetry, is perfectly positioned for this trend.</p>

      <h3>2. Darker Finishes</h3>
      <p>While classic silver stainless steel is timeless, we are seeing a surge in demand for PVD coated steels in darker tones—gunmetal, black, and bronze. These finishes offer the same durability but with a warmer, more grounded aesthetic that blends beautifully with garden landscapes.</p>

      <h3>3. Professional Grade Appliances</h3>
      <p>The humble charcoal grill is being joined by pizza ovens, teppanyaki plates, and dedicated beverage centers. The outdoor kitchen is becoming a place for serious culinary experimentation.</p>
    `
  },
  {
    id: 'care-guide',
    title: 'The Ultimate Care Guide for Stainless Steel',
    excerpt: 'Keep your kitchen looking pristine with these simple maintenance tips and recommended cleaning solutions.',
    image: 'image4.jpeg',
    category: 'News',
    date: '2023-09-10',
    content: `
      <p>One of the greatest advantages of a stainless steel kitchen is its ease of maintenance. However, "stainless" doesn't mean "stain-proof." To keep your Solidoro kitchen looking showroom-fresh, follow these simple guidelines.</p>

      <h3>Daily Cleaning</h3>
      <p>For everyday cleaning, warm water and a soft cloth are your best friends. If you need a bit more cleaning power, a mild dish detergent works wonders. Always wipe in the direction of the grain (the polish lines) to avoid creating cross-scratches that can dull the finish over time.</p>

      <h3>Dealing with Fingerprints</h3>
      <p>Fingerprints are a common concern. We recommend using a specialized stainless steel cleaner or a small amount of baby oil on a microfiber cloth. This not only removes prints but leaves a microscopic protective layer that repels future marks.</p>

      <h3>What to Avoid</h3>
      <p>Never use steel wool, scouring pads, or abrasive cleaners, as these will scratch the surface. Also, avoid chlorine bleach and chloride-containing cleaners, as they can cause pitting and corrosion if left on the surface.</p>
    `
  },
  {
    id: 'industrial-chic',
    title: 'Industrial Chic: Softening the Look',
    excerpt: 'How to pair stainless steel with warm woods and textiles to create a cozy yet modern industrial aesthetic.',
    image: 'image5.jpeg',
    category: 'Design',
    date: '2023-08-22',
    content: `
      <p>The industrial look is a design classic, but it can sometimes feel a bit cold for a family home. The key to mastering this style is contrast—balancing the cool, hard nature of stainless steel with warm, soft textures.</p>

      <h3>Wood Pairings</h3>
      <p>Wood is the perfect partner for stainless steel. A timber floor, a butcher block island extension, or open wooden shelving can instantly warm up a steel kitchen. The organic grain of the wood contrasts beautifully with the uniform finish of the metal.</p>

      <h3>Textiles and Lighting</h3>
      <p>Don't underestimate the power of soft furnishings. A vintage rug runner, upholstered bar stools, or linen curtains can add softness and sound absorption. Lighting also plays a crucial role; opt for warm white bulbs (2700K-3000K) to avoid the space feeling clinical.</p>

      <h3>Greenery</h3>
      <p>Plants breathe life into any space, but they look particularly striking against a metallic backdrop. The vibrant green of fresh herbs or potted plants pops against the neutral grey of the steel, adding a fresh, organic element to the industrial palette.</p>
    `
  }
];

const BUCKET_NAME = 'journals';

async function uploadImageFromFile(localPath, fileName) {
  try {
    const fullPath = path.join(__dirname, localPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`File not found: ${fullPath}`);
        return null;
    }
    const fileBuffer = fs.readFileSync(fullPath);
    // Simple mime type detection based on extension
    const ext = path.extname(localPath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.webp') contentType = 'image/webp';

    const { error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error(`Error uploading image for ${fileName}:`, error);
    return null;
  }
}

async function seedJournals() {
  console.log('Starting journal seed...');

  for (const journal of journals) {
    try {
      console.log(`Processing: ${journal.title}`);
      
      let imageUrl = null;
      
      if (journal.image) {
        const fileExt = path.extname(journal.image);
        const fileName = `${journal.id}_${Date.now()}${fileExt}`;
        const uploadedUrl = await uploadImageFromFile(journal.image, fileName);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      // Insert into database
      const { error } = await supabase
        .from('journals')
        .insert([
          {
            title: journal.title,
            excerpt: journal.excerpt,
            category: journal.category,
            date: new Date(journal.date),
            content: journal.content,
            image: imageUrl,
            featured: journal.featured || false,
          }
        ]);

      if (error) {
        console.error(`Failed to insert ${journal.title}:`, error.message);
      } else {
        console.log(`Successfully inserted: ${journal.title}`);
      }

    } catch (err) {
      console.error(`Error processing ${journal.title}:`, err);
    }
  }

  console.log('Seeding complete.');
}

seedJournals();
