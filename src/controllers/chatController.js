const fetch = require('node-fetch');
const supabase = require('../config/supabase');

const BASE_SYSTEM_MESSAGE = `You are the AI assistant for Solidoro, a premium brand specialising in high-end stainless steel furniture and cabinetry.

WEBSITE GUIDE & CONTEXT:
- **Home**: Overview of our collections, design philosophy, and customer testimonials.
- **Showroom**: The complete product catalog. Users can filter by Category (Kitchen, Wardrobe, Wine Cabinet), Style (Freedom, Modern Minimalism, New Chinese), and Series. There is also a search bar.
- **Gallery**: A visual showcase of our installed projects and design inspirations.
- **Journal**: Articles, news, and insights about design trends, sustainability, and our latest projects.
- **About Us**: Our brand story, commitment to craftsmanship, and the benefits of stainless steel.
  **About Solidoro:**
  - **Our Story**: We redefine modern living with full stainless steel kitchens and home solutions. We offer modern luxury that increases property appeal and provides better value than traditional materials. Our systems are designed for fast installation and low maintenance.
  - **The Solidoro Advantage**:
    - **Modern Luxury & Value**: Increases property appeal with premium aesthetics.
    - **Built for Australia**: Waterproof, rust resistant, heat & fire resistant. Designed for the Australian climate.
    - **Uncompromising Strength**: Heavy-duty, anti-scratch surface, long-lasting durability.
    - **Health & Safety**: Hygienic, food-safe, pest and termite proof.
    - **Effortless Living**: Fast installation, low maintenance.
    - **Sustainable Future**: Eco-friendly and sustainable.
  - **Materials & Engineering**:
    - **Materials**: Premium Food-Grade SUS304 Stainless Steel (fire-proof, waterproof, mildew-resistant) and Aerospace-grade Zero-Formaldehyde Honeycomb Aluminium Panels (lightweight, non-deformation, 30-year durability).
    - **Engineering**: Seamless One-Piece Countertops for hygiene. Intelligent Storage Systems. Over 200 custom colours and finishes.
  - **Sustainability**: Stainless steel is 100% recyclable and retains quality indefinitely. Long product life reduces environmental footprint.
  - **Careers**: We are looking for passionate talent (designers, engineers, craftsmen).
- **Service**: Guide user on how to place order. Information about our design, installation, and after-sales services.
  **Our Process:**
  1. **Design & Consultation**: Send us your design drawings or floor plans. We review requirements for feasibility.
  2. **Quotation & Agreement**: We provide a transparent quote. Once approved, we finalize the agreement.
  3. **Prototyping & Production**: We can produce samples for review before full-scale production in our state-of-the-art facilities.
  4. **Global Logistics**: We manage the entire supply chain, from factory loading and ocean freight to customs clearance in Australia.
  5. **Delivery & Installation**: Local logistics handle delivery. We partner with experienced installers in Australia for perfect fitting.
  6. **After-Sales Support**: Comprehensive support and warranty services ensuring long-term satisfaction.

YOUR ROLE:
- Guide users through the website based on their needs.
- Answer questions about our products (Stainless steel cabinetry, styles, durability).
- Be polite, professional, and helpful.
- **KEEP ANSWERS SHORT AND CONCISE.** Avoid long paragraphs unless necessary. Use bullet points for lists.

IMPORTANT:
- If a user asks a question you cannot answer, or if they want specific pricing/quotes that are not available, strictly advise them to use the "Contact Us" button/modal on the website to get in touch with a human representative.
- Do not make up pricing or specific stock availability.`;

exports.handleChat = async (req, res) => {
  try {
    const { messages } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return res.status(500).json({ error: 'AI service configuration error' });
    }

    // Fetch products from Supabase to build context
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('name, code, category, style, description');

    if (productError) {
      console.error('Error fetching products for chat context:', productError);
      // Continue without product context or handle error? 
      // Let's continue but log it.
    }

    let productContext = '';
    if (products && products.length > 0) {
      productContext = products.map(p => 
        `- ${p.name} (${p.code}): ${p.category}, ${p.style}. ${p.description}`
      ).join('\n');
    }

    const fullSystemMessage = {
      role: 'system',
      content: `${BASE_SYSTEM_MESSAGE}\n\nAVAILABLE PRODUCTS:\n${productContext}`
    };

    // Prepare conversation history for context
    // Expecting req.body.messages to be an array of { role: 'user'|'assistant', content: string }
    // But the frontend sends { type: 'bot'|'user', text: string }
    // I should adapt to what the frontend sends or update frontend to send standard format.
    // Let's update frontend to send standard format or handle it here.
    // The frontend code I saw:
    /*
      const apiMessages = [
        fullSystemMessage,
        ...messages.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: userMessage }
      ];
    */
    // I will expect the frontend to send the `messages` array (excluding system message) 
    // and the `userMessage` (current message).
    // Or just the full history including the new user message.
    
    // Let's assume frontend sends `history` (array of {role, content}) and `message` (string).
    // Or just `messages` which is the full history including the latest user message.
    
    // Let's go with `messages` being the full history of { role, content }.
    
    const apiMessages = [
      fullSystemMessage,
      ...messages
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error Response:', response.status, errorText);
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      throw new Error(data.error.message);
    }

    res.json({ 
      status: 'success',
      message: data.choices[0].message.content 
    });

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || "I apologize, but I'm having trouble connecting right now. Please try again later." 
    });
  }
};
