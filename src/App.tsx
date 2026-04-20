/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Store, 
  MapPin, 
  Map as MapIcon, 
  Search, 
  ShieldCheck, 
  Heart, 
  Handshake, 
  Globe, 
  Mail, 
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Loader2,
  TrendingUp,
  DollarSign,
  BarChart3,
  Briefcase,
  Users,
  Layers,
  ArrowRight,
  LogOut,
  Bookmark,
  BookmarkCheck,
  User as UserIcon
} from 'lucide-react';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query as firestoreQuery, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Types ---
interface BusinessResult {
  name: string;
  location: string;
  description: string;
  sourceUrl: string;
  price?: string;
  revenue?: string;
  cashFlow?: string;
  inventory?: string;
  reasonForSale?: string;
  ebitda?: string;
}

const BUSINESS_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      location: { type: Type.STRING },
      description: { type: Type.STRING },
      sourceUrl: { type: Type.STRING, description: "The direct URL to the business listing on a broker or marketplace site." },
      price: { type: Type.STRING },
      revenue: { type: Type.STRING },
      cashFlow: { type: Type.STRING },
      inventory: { type: Type.STRING },
      reasonForSale: { type: Type.STRING },
      ebitda: { type: Type.STRING }
    },
    required: ["name", "location", "description", "sourceUrl"]
  }
};

// --- Components ---
const BusinessCard: React.FC<{ 
  biz: BusinessResult, 
  type?: "featured" | "listing" | "saved",
  isSaved?: boolean,
  onSaveToggle?: () => void,
  isLoggedIn?: boolean,
  onSignIn?: () => void
}> = ({ biz, type = "listing", isSaved, onSaveToggle, isLoggedIn, onSignIn }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-brand-surface-low relative group/card overflow-hidden"
  >
    {/* Header */}
    <div className="mb-6 flex justify-between items-start gap-4">
      <div className="w-14 h-14 bg-brand-primary/5 rounded-2xl flex items-center justify-center text-brand-primary group-hover/card:bg-brand-primary group-hover/card:text-white transition-colors flex-shrink-0">
        <Store size={28} />
      </div>
      <div className="flex flex-col items-end gap-2">
         <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest ${type === 'featured' ? 'bg-brand-accent text-brand-accent-on' : 'bg-brand-primary/10 text-brand-primary'}`}>
            {type === 'featured' ? 'FEATURED' : type === 'saved' ? 'SAVED DEAL' : 'LISTING'}
         </div>
         <a 
            href={biz.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-brand-text-muted hover:text-brand-primary transition-colors p-2 bg-brand-surface-low rounded-xl"
            title="External Listing Source"
          >
            <ExternalLink size={18} />
          </a>
      </div>
    </div>

    {/* Identity */}
    <div className="space-y-1 mb-6">
      <h3 className="text-2xl font-bold text-brand-text tracking-tight group-hover/card:text-brand-primary transition-colors leading-tight">
        {biz.name}
      </h3>
      <p className="text-brand-text-muted flex items-center gap-2 font-semibold text-sm opacity-70">
        <MapPin size={14} className="text-brand-primary" />
        {biz.location}
      </p>
    </div>

    {/* Pricing Highlight */}
    <div className="mb-8 p-5 bg-brand-surface-low rounded-3xl border border-brand-surface flex justify-between items-center group-hover/card:bg-brand-primary/5 group-hover/card:border-brand-primary/10 transition-all">
      <div>
        <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Asking Price</p>
        <p className="text-2xl font-black text-brand-text tracking-tighter">{biz.price || "TBD"}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Cash Flow</p>
        <p className="text-lg font-bold text-brand-primary tracking-tight">{biz.cashFlow || "Contact"}</p>
      </div>
    </div>

    {/* Helpful Metrics Grid */}
    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="space-y-1 p-3 rounded-2xl bg-brand-surface/20 border border-transparent hover:border-brand-surface transition-colors">
        <div className="flex items-center gap-2 text-brand-text-muted">
          <BarChart3 size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Revenue</span>
        </div>
        <p className="font-bold text-sm text-brand-text">{biz.revenue || "N/A"}</p>
      </div>
      <div className="space-y-1 p-3 rounded-2xl bg-brand-surface/20 border border-transparent hover:border-brand-surface transition-colors">
        <div className="flex items-center gap-2 text-brand-text-muted">
          <Layers size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Inventory</span>
        </div>
        <p className="font-bold text-sm text-brand-text">{biz.inventory || "N/A"}</p>
      </div>
    </div>

    {/* Description / Content */}
    <div className="space-y-4 flex-grow">
      <div>
        <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
          <TrendingUp size={12} className="text-brand-primary" />
          Growth Thesis
        </p>
        <p className="text-brand-text-muted leading-relaxed font-medium text-sm line-clamp-3 italic opacity-90">
          "{biz.description}"
        </p>
      </div>

      {biz.reasonForSale && (
        <div>
          <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Reason for Sale</p>
          <p className="text-xs font-semibold text-brand-text opacity-70 italic line-clamp-1">{biz.reasonForSale}</p>
        </div>
      )}
    </div>

    {/* CTA */}
    <div className="mt-10 pt-6 border-t border-brand-surface flex items-center justify-between group/cta">
      <a 
        href={biz.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-brand-primary font-bold text-sm"
      >
        <span>Secure Deal Details</span>
        <ArrowRight className="group-hover/cta:translate-x-1 transition-transform" size={16} />
      </a>
      
      <button 
        onClick={(e) => { 
          e.preventDefault(); 
          if (isLoggedIn) {
            onSaveToggle?.(); 
          } else {
            onSignIn?.();
          }
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${isSaved ? 'bg-brand-primary text-white shadow-md' : 'bg-brand-surface text-brand-text-muted hover:bg-brand-primary/10'}`}
      >
        {isSaved ? <BookmarkCheck size={16} fill="currentColor" /> : <Bookmark size={16} />}
        <span>{isSaved ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  </motion.div>
);

// --- Business Data ---
// We'll initialize with empty and fetch featured listings via Search Grounding on mount
const INITIAL_TRENDING: BusinessResult[] = [];

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<BusinessResult[] | null>(null);
  const [featuredListings, setFeaturedListings] = useState<BusinessResult[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [savedListings, setSavedListings] = useState<BusinessResult[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for saved listings
  useEffect(() => {
    if (!user) {
      setSavedListings([]);
      return;
    }

    const q = firestoreQuery(
      collection(db, 'saved_listings'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const saved = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as BusinessResult & { id: string }));
      setSavedListings(saved);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleSave = async (biz: BusinessResult) => {
    if (!user) return;

    const existing = savedListings.find(s => s.sourceUrl === biz.sourceUrl);
    if (existing) {
      const listingId = (existing as any).id;
      if (listingId) {
        await deleteDoc(doc(db, 'saved_listings', listingId));
      }
    } else {
      await addDoc(collection(db, 'saved_listings'), {
        ...biz,
        userId: user.uid,
        savedAt: serverTimestamp()
      });
    }
  };

  const isSaved = (biz: BusinessResult) => {
    return savedListings.some(s => s.sourceUrl === biz.sourceUrl);
  };

  // ZIP Code Lookup logic
  useEffect(() => {
    if (zip.length === 5) {
      const lookupZip = async () => {
        try {
          const userId = (import.meta as any).env.VITE_USPS_USER_ID;
          
          if (userId) {
            // Official USPS API Implementation
            const url = `https://secure.shippingapis.com/ShippingAPI.dll?API=CityStateLookup&XML=` + 
                        encodeURIComponent(`<CityStateLookupRequest USERID="${userId}"><ZipCode ID="0"><Zip5>${zip}</Zip5></ZipCode></CityStateLookupRequest>`);
            
            const response = await fetch(url);
            const text = await response.text();
            
            // Basic XML parsing for USPS response
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const cityEl = xmlDoc.getElementsByTagName("City")[0];
            const stateEl = xmlDoc.getElementsByTagName("State")[0];
            
            if (cityEl && stateEl) {
              setCity(cityEl.textContent || "");
              setState(stateEl.textContent || "");
              return;
            }
          }

          // Fallback to Zippopotam.us (Free, No Key) if USPS ID is missing or fails
          const resp = await fetch(`https://api.zippopotam.us/us/${zip}`);
          if (resp.ok) {
            const data = await resp.json();
            const place = data.places[0];
            setCity(place['place name']);
            setState(place['state abbreviation']);
          }
        } catch (err) {
          console.error("ZIP lookup failed:", err);
        }
      };
      lookupZip();
    }
  }, [zip]);

  // Fetch featured listings on mount
  React.useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const featuredPrompt = `Find 3 real current "businesses for sale" listings in the United States. 
        Focus on actual, verifiable search results for unique niches like "coffee shops", "boutique hotels", or "specialty bakeries".
        
        CRITICAL: Only provide listings you find via live search. Return an empty array if none are found.`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: featuredPrompt,
          config: {
            systemInstruction: "You are a specialized business analyst. You ONLY return data found in live search results. If you cannot find real listings, return []. Do not invent data.",
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: BUSINESS_SCHEMA
          }
        });

        const parsed = JSON.parse(response.text || "[]");
        setFeaturedListings(parsed.slice(0, 3));
      } catch (err) {
        console.error("Failed to fetch featured:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query && !city) return;

    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const searchPrompt = `Perform a live search for "${query}" currently for sale in ${city}${state ? ', ' + state : ''}. 
      
      CRITICAL: You are a business broker researcher. You MUST only return businesses that you find real, active search result listings for. 
      If you do NOT find a specific business for sale, return an empty array. Do NOT invent businesses.
      
      For each business found, extract:
      - Official Business Name
      - Location (Neighborhood/City)
      - Asking Price (Must be from the listing)
      - Revenue/Cash Flow (If explicitly mentioned)
      - A growth-focused description based on the listing content.
      - THE ACTUAL SOURCE URL (Verify it is a real listing page like BizBuySell, LoopNet, or a direct broker site).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: searchPrompt,
        config: {
          systemInstruction: "You are a professional business listing researcher. You strictly only provide data found in real-world search results. You never hallucinate business names, prices, or URLs. If no listings are found for the specific query and location, return an empty JSON array [].",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: BUSINESS_SCHEMA
        }
      });

      const parsedResults = JSON.parse(response.text || "[]");
      setResults(parsedResults.slice(0, 6)); 
    } catch (err) {
      console.error("Search failed:", err);
      setError("Market data temporarily unavailable. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-brand-primary/10 selection:text-brand-primary">
      {/* --- Header --- */}
      <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-md shadow-[0_12px_40px_rgba(52,50,43,0.06)]">
        <nav className="flex justify-between items-center w-full px-6 py-4 md:px-8 md:py-6 max-w-7xl mx-auto">
          <div 
            className="text-xl md:text-2xl font-bold text-brand-text tracking-tight cursor-pointer"
            onClick={() => setResults(null)}
          >
            ZeeZoo-Biz
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowSavedOnly(!showSavedOnly)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${showSavedOnly ? 'bg-brand-primary text-white' : 'bg-brand-surface-low text-brand-text hover:bg-brand-primary/10'}`}
                >
                  <Bookmark size={18} fill={showSavedOnly ? 'currentColor' : 'none'} />
                  {showSavedOnly ? 'Back to Search' : 'My Saved'}
                </button>
                <div className="flex items-center gap-3 bg-brand-surface-low px-3 py-1.5 rounded-full border border-brand-surface">
                   {user.photoURL ? (
                     <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="profile" />
                   ) : (
                     <div className="w-8 h-8 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary text-xs font-bold">
                       {user.email?.[0].toUpperCase()}
                     </div>
                   )}
                   <button onClick={logout} className="text-brand-text-muted hover:text-red-500 transition-colors" title="Sign Out">
                      <LogOut size={18} />
                   </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="bg-brand-primary text-white px-6 py-2.5 rounded-full font-semibold active:scale-95 transition-all hover:bg-brand-primary/90 shadow-md flex items-center gap-2"
              >
                <UserIcon size={18} />
                Sign In
              </button>
            )}
            <div className="text-xs font-bold tracking-widest text-brand-text-muted uppercase opacity-50 hidden md:block">
              Business Search Engine v1.0
            </div>
          </div>
        </nav>

        {/* Mobile Menu removed for simplicity */}
      </header>

      <main>
        {/* --- Hero Section --- */}
        <section className={`relative transition-all duration-700 ${results ? 'pt-8 pb-12' : 'pt-16 pb-24 md:pt-24 md:pb-32'} px-6 overflow-hidden`}>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <AnimatePresence mode="wait">
              {!results && (
                <motion.div
                  key="hero-text"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <h1 className="text-6xl md:text-9xl font-extrabold text-brand-text tracking-tighter mb-8 leading-[0.85]">
                    Acquire. <br className="hidden md:block" />
                    Scale. Grow<span className="text-brand-primary">.</span>
                  </h1>
                  <p className="text-lg md:text-2xl text-brand-text-muted mb-12 max-w-2xl mx-auto leading-relaxed font-semibold opacity-60">
                    ZeeZoo-Biz connects entrepreneurs with real businesses for sale. Use the search below to scan live marketplace data.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar */}
            <motion.form 
              layout
              onSubmit={handleSearch}
              className="bg-brand-surface-low p-2 md:p-3 rounded-3xl md:rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/50 max-w-4xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-2"
            >
              <div className="flex-1 px-5 py-3 gap-3 bg-white rounded-2xl md:rounded-l-full group transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-primary flex items-center">
                <Store className="text-brand-text-muted/60 group-focus-within:text-brand-primary transition-colors flex-shrink-0" size={20} />
                <input 
                  className="w-full bg-transparent border-none focus:ring-0 text-brand-text placeholder:text-brand-text-muted/50 py-1 font-medium"
                  placeholder="What kind of business?" 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="w-px h-8 bg-brand-text-muted/10 hidden md:block"></div>
              <div className="flex-[0.4] px-5 py-3 gap-3 bg-white rounded-2xl md:rounded-none group transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-primary flex items-center">
                <MapPin className="text-brand-text-muted/60 group-focus-within:text-brand-primary transition-colors flex-shrink-0" size={18} />
                <input 
                  className="w-full bg-transparent border-none focus:ring-0 text-brand-text placeholder:text-brand-text-muted/50 py-1 font-medium"
                  placeholder="ZIP" 
                  type="text"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                />
              </div>
              <div className="w-px h-8 bg-brand-text-muted/10 hidden md:block"></div>
              <div className="flex-[0.6] px-5 py-3 gap-3 bg-white rounded-2xl md:rounded-none group transition-all duration-300 focus-within:ring-2 focus-within:ring-brand-primary flex items-center">
                <div className="flex flex-col w-full">
                  <input 
                    className="w-full bg-transparent border-none focus:ring-0 text-brand-text placeholder:text-brand-text-muted/50 py-0 font-bold text-sm"
                    placeholder="City" 
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <input 
                    className="w-full bg-transparent border-none focus:ring-0 text-brand-text-muted placeholder:text-brand-text-muted/30 py-0 font-medium text-[10px] uppercase tracking-wider"
                    placeholder="State" 
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={isSearching}
                className="bg-brand-primary text-white px-12 py-4 rounded-2xl md:rounded-full font-bold text-lg active:scale-95 transition-all shadow-lg hover:shadow-brand-primary/20 hover:bg-brand-primary/95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSearching ? <Loader2 className="animate-spin" size={22} /> : <Search size={22} strokeWidth={2.5} />}
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </motion.form>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-red-500 mt-4 font-medium"
              >
                {error}
              </motion.p>
            )}
          </div>
        </section>

        {/* --- Dynamic Content Area --- */}
        <section className="bg-brand-surface py-20 px-6 rounded-t-[3rem] md:rounded-t-[5rem] min-h-[600px]">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {showSavedOnly ? (
                <motion.div 
                  key="saved-view"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-12"
                >
                  <div className="mb-16 px-2">
                    <h2 className="text-4xl md:text-6xl font-extrabold text-brand-text mb-4 tracking-tighter leading-none">Your Saved Deals<span className="text-brand-primary">.</span></h2>
                    <p className="text-brand-text-muted text-lg font-medium opacity-80">
                      Opportunities you've bookmarked for further due diligence.
                    </p>
                  </div>

                  {savedListings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {savedListings.map((biz, idx) => (
                        <BusinessCard 
                          key={idx} 
                          biz={biz} 
                          type="saved" 
                          isSaved={true}
                          onSaveToggle={() => toggleSave(biz)}
                          isLoggedIn={!!user}
                          onSignIn={signInWithGoogle}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 border-2 border-dashed border-brand-surface rounded-[3rem]">
                      <div className="mb-6 inline-flex w-24 h-24 bg-brand-surface-low rounded-full items-center justify-center text-brand-text-muted/20">
                        <Bookmark size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-brand-text mb-2">No saved listings yet</h3>
                      <p className="text-brand-text-muted font-medium mb-8">Start exploring the marketplace and save deals you like.</p>
                      <button 
                        onClick={() => setShowSavedOnly(false)}
                        className="bg-brand-primary text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-brand-primary/20 transition-all hover:-translate-y-1"
                      >
                        Find Businesses
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : results ? (
                <motion.div 
                  key="search-results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16 px-2">
                    <div>
                      <h2 className="text-4xl md:text-6xl font-extrabold text-brand-text mb-4 tracking-tighter leading-none">Market Results<span className="text-brand-primary">.</span></h2>
                      <p className="text-brand-text-muted text-lg font-medium opacity-80">
                        Showing listings for <span className="text-brand-primary font-bold">"{query}"</span> in {city}{state ? `, ${state}` : ''}
                      </p>
                    </div>
                    <button 
                      onClick={() => setResults(null)}
                      className="px-8 py-3 bg-brand-surface-low text-brand-text font-bold rounded-2xl border border-brand-surface hover:bg-brand-primary hover:text-white transition-all shadow-sm flex items-center gap-2 group"
                    >
                      Search Again
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {results.map((biz, idx) => (
                      <BusinessCard 
                        key={idx} 
                        biz={biz} 
                        type="listing" 
                        isSaved={isSaved(biz)}
                        onSaveToggle={() => toggleSave(biz)}
                        isLoggedIn={!!user}
                        onSignIn={signInWithGoogle}
                      />
                    ))}
                  </div>
                  
                  {results.length === 0 && (
                    <div className="text-center py-20">
                      <div className="mb-6 inline-flex w-20 h-20 bg-brand-surface-low rounded-full items-center justify-center text-brand-text-muted/40">
                        <Search size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-brand-text mb-2">No businesses found</h3>
                      <p className="text-brand-text-muted font-medium">Try broadening your search criteria or checking for typos.</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="trending-default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-16 px-2">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-brand-text mb-4 tracking-tight">Featured Listings<span className="text-brand-primary">.</span></h2>
                    <p className="text-brand-text-muted text-lg font-medium opacity-80">Hand-picked acquisition opportunities available right now.</p>
                  </div>

                  {isInitialLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-brand-text-muted">
                        <Loader2 className="animate-spin text-brand-primary" size={40} />
                        <p className="font-bold tracking-widest text-xs">SCANNING MARKETPLACE...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
                      {featuredListings.map((biz, idx) => (
                        <BusinessCard 
                          key={idx} 
                          biz={biz} 
                          type="featured" 
                          isSaved={isSaved(biz)}
                          onSaveToggle={() => toggleSave(biz)}
                          isLoggedIn={!!user}
                          onSignIn={signInWithGoogle}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* --- Values Section --- */}
        {!results && (
          <section className="py-24 md:py-40 px-6 bg-brand-bg relative overflow-hidden border-t border-brand-surface">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 md:gap-24">
              <div className="flex-1 space-y-10 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-5 py-2.5 rounded-full font-bold text-sm tracking-wide">
                  <ShieldCheck size={18} />
                  TRUSTED ACQUISITION ENGINE
                </div>
                <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-brand-text leading-[0.95]">
                  Search validated <br />business data<span className="text-brand-primary">.</span>
                </h2>
                <p className="text-xl text-brand-text-muted leading-relaxed font-medium">
                  ZeeZoo-Biz simplifies the search for your next investment by consolidating live listings from across the web into one professional interface.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-white border-t border-brand-surface w-full px-8 py-10 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-bold text-brand-text tracking-tight">ZeeZoo-Biz</div>
          <p className="text-brand-text-muted text-sm font-medium opacity-60">
            © {new Date().getFullYear()} ZeeZoo-Biz. Real-world business acquisition search.
          </p>
        </div>
      </footer>
    </div>
  );
}
