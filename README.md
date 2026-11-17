# ShopSmart AI — Intelligent Indian E-Commerce Platform

> **Individual College Capstone Project**  
> **Status:** Phase 4 Complete (Real Google Gemini AI Shopping Assistant & Serverless Backend)  
> **Market Standard:** Indian E-Commerce (INR / ₹) with `en-IN` numbering  
> **Tech Stack:** React 18 · Vite 6 · Tailwind CSS 3.4 · React Router 6 · Supabase (PostgreSQL, Auth, RLS) · Netlify Functions · Google Gemini API (`@google/genai` SDK)

---

## 1. Project Overview

**ShopSmart AI** is a modern, premium AI-powered Indian e-commerce shopping web application. Designed to redefine how Indian consumers discover, compare, and purchase products online, ShopSmart AI leverages cutting-edge conversational AI and semantic search configured natively in Indian Rupees (INR - ₹) to offer:

1. **Intelligent Conversational Concierge:** Powered by Google Gemini API via official `@google/genai` SDK, offering multi-turn recommendations within Indian Rupee (₹) budgets.
2. **Anti-Hallucination Quality Gate:** All recommended products are grounded in the active database/catalogue. Every product ID returned by the AI is strictly verified against active inventory before rendering.
3. **Product Comparison Intelligence:** Side-by-side comparison tables/cards comparing price, key specifications, ratings, best-for suitability, and AI verdicts.
4. **Direct Cart Action:** Add recommended items directly to the shopping cart from conversational recommendation cards with 1 click.
5. **Supabase Cloud Backend:** PostgreSQL database with Row Level Security (RLS), Supabase Auth, customer profiles, remote wishlists, customer enquiries, and simulated order management.

---

## 2. Gemini AI Integration Architecture (Phase 4)

### Serverless Function: `netlify/functions/shopping-assistant.mjs`
- **Official SDK:** Integrates `@google/genai` (v2.32+).
- **Security:** `GEMINI_API_KEY` is kept strictly on the backend and is never exposed to client-side bundles.
- **Model Selection:** Controlled via `GEMINI_MODEL` (defaults to `gemini-2.5-flash`, with automatic fallback to `gemini-1.5-flash`).
- **Database Grounding:** Actively queries active products from Supabase `products` table (or local verified Indian catalogue if Supabase is offline/unseeded).
- **Anti-Hallucination Mandate:** The system instruction constrains recommendations strictly to available catalog IDs.
- **Input Security & Rate Limiting:** Enforces maximum message length (1,000 chars), sanitizes conversation history (last 10 turns), and limits client requests (25 requests/min per IP).
- **Resilient Fallback:** If `GEMINI_API_KEY` is not yet configured or Gemini API experiences network timeouts, an intelligent rule-based semantic engine answers immediately without breaking the user experience.

### Local Development Integration: `vite.config.js`
A custom Vite dev server plugin seamlessly routes `/.netlify/functions/*` requests to the exact same ESM handler files (`netlify/functions/*.mjs`). This allows developers to test live Netlify functions in Vite (`npm run dev`) without needing separate CLI tools or proxies.

---

## 3. Verified AI Concierge Test Scenarios

| Test Case | Customer Query | Assistant Behavior & Products |
|---|---|---|
| **1. Out-of-stock / Category boundary** | *"Find me a smartphone under ₹20,000."* | Explains smartphones are currently not stocked; recommends closest smart wearables and audio gear: `NeoGlow AMOLED Smartwatch (₹4,999)`, `EchoPulse ANC Earbuds (₹1,899)`, `GaN Fast Charger (₹799)`. |
| **2. Category & Budget Match** | *"Suggest car cleaning products under ₹1,000."* | Recommends top-rated Indian car detailing essentials: `SoftSpun 800 GSM Microfiber Towels (₹499)`, `3M Dashboard Cleaner (₹349)`, `Godrej aer Luxury Fragrance (₹299)`. |
| **3. Product Comparison** | *"Compare the first two recommended products."* | Returns side-by-side comparison between `AcousticPro Studio Headphones (₹24,999)` and `EchoPulse ANC Earbuds (₹1,899)` with specs, pros, and verdict. |
| **4. Multi-Turn Memory** | *"Which one is better for my budget?"* | Contextual follow-up evaluating daily utility vs price in INR (`EchoPulse Earbuds` vs `GaN Charger`). |
| **5. Ultra-Low Budget Guardrail** | *"Find me a product under ₹10."* | Clarifies catalogue starts at ₹299 (Godrej) and ₹349 (cable); showcases best sub-₹500 deals (`₹299`, `₹349`, `₹399`, `₹499`). |
| **6. High-End Spec Query** | *"Recommend a laptop."* | Recommends `TitanBook Pro M2 Creator Laptop (₹1,25,000)` with 12-core SoC, 16GB RAM, and 18-hour battery, paired with `UrbanTraveller Backpack (₹2,799)`. |

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env` for local execution:

```dotenv
# Application Metadata
VITE_APP_NAME="ShopSmart AI"
VITE_APP_URL="http://localhost:5173"
VITE_APP_ENV="development"

# Supabase Server & Backend Environment Variables
SUPABASE_URL=https://unectsmgytpitjaxdgru.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_vWkBLjIm-pOLOTfP7Ko3LA_EicHaIxw
SUPABASE_SECRET_KEY=your_secret_key_here
SUPABASE_JWKS_URL=https://unectsmgytpitjaxdgru.supabase.co/auth/v1/.well-known/jwks.json

# Supabase Client-Side Environment Variables (Vite Frontend)
VITE_SUPABASE_URL=https://unectsmgytpitjaxdgru.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vWkBLjIm-pOLOTfP7Ko3LA_EicHaIxw
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_vWkBLjIm-pOLOTfP7Ko3LA_EicHaIxw

# Google Gemini API & AI Shopping Assistant (Backend Netlify Functions)
# Get your API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
```

---

## 5. Directory Structure (Phase 4)

```text
ShopSmart-AI/
│
├── public/
│   └── favicon.svg                  # Brand vector mark
│
├── src/
│   ├── components/
│   │   ├── ai/
│   │   │   └── AIAssistantWidget.jsx # Gemini AI Assistant modal & drawer
│   │   ├── cart/                    # Slide-over cart drawer
│   │   ├── common/                  # Design primitives (Badge, etc.)
│   │   ├── layout/                  # Navbar, Footer
│   │   └── product/                 # Reusable ProductCard
│   ├── context/
│   │   ├── AuthContext.jsx          # Supabase Auth state & profile listener
│   │   ├── CartContext.jsx          # Shopping cart & simulated order placement
│   │   └── WishlistContext.jsx      # Remote Supabase + local wishlist sync
│   ├── data/
│   │   └── mockProducts.js          # Resilient fallback Indian catalogue (27 items)
│   ├── lib/
│   │   ├── constants.js             # Brand constants & INR budget brackets
│   │   ├── supabase.js              # Shared Supabase client configuration
│   │   └── utils.js                 # INR currency formatting (en-IN)
│   ├── pages/
│   │   ├── About.jsx                # Project background & mission
│   │   ├── Cart.jsx                 # Shopping cart & demo checkout modal
│   │   ├── Contact.jsx              # Support enquiry form (writes to Supabase)
│   │   ├── ForgotPassword.jsx       # Password reset request view
│   │   ├── Home.jsx                 # Dynamic homepage
│   │   ├── Login.jsx                # Customer login with Supabase Auth
│   │   ├── NotFound.jsx             # 404 fallback page
│   │   ├── ProductDetail.jsx        # Product gallery & specifications
│   │   ├── Profile.jsx              # Customer profile, orders & inquiries
│   │   ├── Register.jsx             # Registration with Supabase Auth
│   │   ├── ResetPassword.jsx        # Set new password view
│   │   ├── Shop.jsx                 # Dynamic product catalogue & filtering
│   │   └── Wishlist.jsx             # Wishlist management
│   ├── services/
│   │   ├── aiService.js             # Client AI service for /.netlify/functions/shopping-assistant
│   │   ├── authService.js           # Supabase Auth & profile methods
│   │   ├── enquiryService.js        # Contact enquiries Supabase operations
│   │   ├── orderService.js          # Simulated order & items creation
│   │   ├── productService.js        # Dynamic catalogue query with fallback
│   │   └── wishlistService.js       # Supabase wishlist sync & storage
│   ├── App.jsx                      # App router & context providers tree
│   ├── index.css                    # Tailwind CSS directives
│   └── main.jsx                     # Entry DOM mount point
│
├── netlify/
│   └── functions/
│       ├── health.js                # Serverless status probe
│       └── shopping-assistant.mjs   # Official Gemini AI shopping assistant function
│
├── supabase/
│   ├── schema.sql                   # Complete DDL, RLS policies & triggers
│   └── seed.sql                     # 27 Indian products seed insert statements
│
├── .env                             # Local environment variables (not committed)
├── .env.example                     # Environment variables template
├── package.json                     # Dependencies (@google/genai, @supabase/supabase-js, etc.)
├── tailwind.config.js               # Luxury palette configuration
├── vite.config.js                   # Vite 6 config with Netlify Functions dev server emulator
└── README.md                        # Documentation
```

---

## 6. Development & Build Verification

```bash
# Run local development server (with Netlify Functions dev emulator)
npm run dev

# Run production build
npm run build
```
- Dev server is live at: `http://localhost:5173`
- Production build passes with `0 errors`.
