import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = "http://localhost:8000"

const RESTAURANT_ITEMS = {
  "R001": ["I001","I002","I003","I011","I012","I009","I007"],
  "R002": ["I001","I006","I005","I009","I013","I007"],
  "R003": ["I004","I002","I011","I008","I009","I010"],
  "R004": ["I003","I002","I012","I013","I015","I010"],
  "R005": ["I004","I001","I011","I009","I007","I014"],
}

const RESTAURANT_NAMES = {
  "R001": "Spice Garden",
  "R002": "Biryani House",
  "R003": "Royal Darbar",
  "R004": "Desi Tadka",
  "R005": "Punjab Grill",
}

const ALL_ITEMS = [
  { item_id:"I001", name:"Biryani",              category:"main",    price:220, veg:false, img:"https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300&q=80" },
  { item_id:"I002", name:"Paneer Butter Masala", category:"main",    price:190, veg:true,  img:"https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&q=80" },
  { item_id:"I003", name:"Dal Makhani",          category:"main",    price:160, veg:true,  img:"https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&q=80" },
  { item_id:"I004", name:"Butter Chicken",       category:"main",    price:240, veg:false, img:"https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300&q=80" },
  { item_id:"I011", name:"Butter Naan",          category:"bread",   price:35,  veg:true,  img:"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&q=80" },
  { item_id:"I012", name:"Tandoori Roti",        category:"bread",   price:25,  veg:true,  img:"https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&q=80" },
  { item_id:"I005", name:"Raita",                category:"addon",   price:40,  veg:true,  img:"https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&q=80" },
  { item_id:"I006", name:"Salaan",               category:"addon",   price:50,  veg:true,  img:"https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=80" },
  { item_id:"I013", name:"Papad",                category:"addon",   price:20,  veg:true,  img:"https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300&q=80" },
  { item_id:"I009", name:"Lassi",                category:"drink",   price:60,  veg:true,  img:"https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=300&q=80" },
  { item_id:"I010", name:"Coke",                 category:"drink",   price:40,  veg:true,  img:"https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&q=80" },
  { item_id:"I007", name:"Gulab Jamun",          category:"dessert", price:60,  veg:true,  img:"https://images.unsplash.com/photo-1601303516534-bf5d05555d5f?w=300&q=80" },
  { item_id:"I008", name:"Rasmalai",             category:"dessert", price:70,  veg:true,  img:"https://images.unsplash.com/photo-1627662168223-7df99068099a?w=300&q=80" },
  { item_id:"I015", name:"Kheer",                category:"dessert", price:55,  veg:true,  img:"https://images.unsplash.com/photo-1571167366136-b57e07161edd?w=300&q=80" },
  { item_id:"I014", name:"Green Salad",          category:"addon",   price:45,  veg:true,  img:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80" },
]

const CATEGORY_EMOJI = { main:"🍛", addon:"🥗", bread:"🫓", drink:"🥤", dessert:"🍮", all:"✨" }
const CATEGORY_COLOR = {
  main:    { bg:"rgba(251,146,60,0.2)",  text:"#fb923c" },
  addon:   { bg:"rgba(74,222,128,0.2)",  text:"#4ade80" },
  bread:   { bg:"rgba(250,204,21,0.2)",  text:"#facc15" },
  drink:   { bg:"rgba(56,189,248,0.2)",  text:"#38bdf8" },
  dessert: { bg:"rgba(244,114,182,0.2)", text:"#f472b6" },
}
const MEAL_TIMES = ["breakfast","lunch","dinner","late_night"]
const USERS      = ["U0001","U0002","U0003","U0004","U0005"]
const CATEGORIES = ["all","main","bread","addon","drink","dessert"]
const MEAL_CATEGORIES = {
  breakfast: ["main","bread","drink"],
  lunch:     ["main","bread","addon","drink","dessert"],
  dinner:    ["main","bread","addon","drink","dessert"],
  late_night:["main","drink","dessert"],
}

function getMealProgress(cart, mealTime) {
  const needed  = MEAL_CATEGORIES[mealTime] || []
  const covered = new Set(cart.map(i => i.category))
  return needed.map(cat => ({ cat, done: covered.has(cat) }))
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current === value) return
    const diff = value - prev.current
    const steps = 20
    let step = 0
    const timer = setInterval(() => {
      step++
      setDisplay(Math.round(prev.current + (diff * step) / steps))
      if (step >= steps) { clearInterval(timer); prev.current = value }
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <span>{display}</span>
}

function ScoreBar({ score }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { setTimeout(() => setWidth(score * 100), 100) }, [score])
  const color = score > 0.6 ? "#4ade80" : score > 0.3 ? "#fbbf24" : "#f87171"
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.1)" }}>
      <div className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width:`${width}%`, background:color }} />
    </div>
  )
}

function FoodImage({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError]   = useState(false)
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse" style={{ background:"rgba(255,255,255,0.05)" }} />
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-3xl"
          style={{ background:"rgba(255,255,255,0.05)" }}>
          🍽️
        </div>
      ) : (
        <img src={src} alt={alt}
          className="w-full h-full object-cover transition-all duration-500"
          style={{ opacity: loaded ? 1 : 0, transform: loaded ? "scale(1)" : "scale(1.05)" }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)} />
      )}
    </div>
  )
}

export default function App() {
  const [userId, setUserId]           = useState("U0001")
  const [mealTime, setMealTime]       = useState("dinner")
  const [restaurant, setRestaurant]   = useState("R001")
  const [crossSell, setCrossSell]     = useState(false)
  const [cart, setCart]               = useState([])
  const [recs, setRecs]               = useState([])
  const [latency, setLatency]         = useState(null)
  const [loading, setLoading]         = useState(false)
  const [metrics, setMetrics]         = useState(null)
  const [showMetrics, setShowMetrics] = useState(false)
  const [filterCat, setFilterCat]     = useState("all")
  const [search, setSearch]           = useState("")
  const [accepted, setAccepted]       = useState(0)
  const [offered, setOffered]         = useState(0)
  const [newRecIds, setNewRecIds]     = useState([])
  const [toast, setToast]             = useState(null)
  const searchRef = useRef(null)

  const cartTotal   = cart.reduce((s,i) => s + i.price, 0)
  const savings     = Math.round(cartTotal * 0.08)
  const acceptRate  = offered > 0 ? Math.round((accepted / offered) * 100) : 0
  const progress    = getMealProgress(cart, mealTime)
  const progressPct = progress.length > 0
    ? Math.round((progress.filter(p => p.done).length / progress.length) * 100) : 0

  const restaurantItemIds = RESTAURANT_ITEMS[restaurant] || []
  const menuItems = ALL_ITEMS.filter(i => restaurantItemIds.includes(i.item_id))

  // Combined search + category filter
  const filteredMenu = menuItems.filter(i => {
    const matchCat    = filterCat === "all" || i.category === filterCat
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
                        i.category.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const filteredRecs = crossSell
    ? recs
    : recs.filter(r => restaurantItemIds.includes(r.item_id))

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const fetchRecs = async (currentCart, _rest = restaurant, meal = mealTime) => {
    if (currentCart.length === 0) { setRecs([]); return }
    setLoading(true)
    try {
      const res = await axios.post(`${API}/recommend`, {
        user_id:    userId,
        cart_items: currentCart.map(i => i.item_id),
        meal_time:  meal,
        top_n:      8,
      })
      const newRecs = res.data.recommendations
      setNewRecIds(newRecs.map(r => r.item_id))
      setTimeout(() => setNewRecIds([]), 800)
      setRecs(newRecs)
      setLatency(res.data.latency_ms)
      setOffered(o => o + newRecs.length)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const addToCart = async (item, fromRec = false) => {
    if (cart.find(c => c.item_id === item.item_id)) return
    if (fromRec) setAccepted(a => a + 1)
    const newCart = [...cart, item]
    setCart(newCart)
    showToast(`${item.name} added!`)
    await fetchRecs(newCart)
  }

  const removeFromCart = async (item_id) => {
    const newCart = cart.filter(c => c.item_id !== item_id)
    setCart(newCart)
    await fetchRecs(newCart)
  }

  const handleRestaurantChange = (r) => {
    setRestaurant(r)
    setCart([])
    setRecs([])
    setFilterCat("all")
    setSearch("")
  }

  const handleMealTimeChange = (m) => {
    setMealTime(m)
    fetchRecs(cart, restaurant, m)
  }

  const loadMetrics = async () => {
    try {
      const res = await axios.get(`${API}/metrics`)
      setMetrics(res.data)
      setShowMetrics(true)
    } catch(e) { console.error(e) }
  }

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#0f0f0f 0%,#1a1a2e 50%,#16213e 100%)" }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-2 rounded-full shadow-2xl text-sm font-bold"
          style={{ background:"linear-gradient(90deg,#e23744,#ff6b6b)", zIndex:9999 }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between sticky top-0 z-40"
        style={{ background:"rgba(15,15,15,0.85)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-black text-white tracking-tight">zomato</div>
          <div className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background:"linear-gradient(90deg,#e23744,#ff6b6b)", color:"#fff" }}>
            CSAO Rail · AI Powered
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select value={restaurant} onChange={e => handleRestaurantChange(e.target.value)}
            className="text-sm rounded-xl px-3 py-2 font-medium border-0 outline-none cursor-pointer"
            style={{ background:"rgba(255,255,255,0.1)", color:"#fff" }}>
            {Object.entries(RESTAURANT_NAMES).map(([id,name]) => (
              <option key={id} value={id} style={{ background:"#1a1a2e" }}>{name}</option>
            ))}
          </select>
          <select value={userId} onChange={e => { setUserId(e.target.value); setCart([]); setRecs([]) }}
            className="text-sm rounded-xl px-3 py-2 font-medium border-0 outline-none cursor-pointer"
            style={{ background:"rgba(255,255,255,0.1)", color:"#fff" }}>
            {USERS.map(u => <option key={u} style={{ background:"#1a1a2e" }}>{u}</option>)}
          </select>
          <select value={mealTime} onChange={e => handleMealTimeChange(e.target.value)}
            className="text-sm rounded-xl px-3 py-2 font-medium border-0 outline-none cursor-pointer"
            style={{ background:"rgba(255,255,255,0.1)", color:"#fff" }}>
            {MEAL_TIMES.map(m => <option key={m} style={{ background:"#1a1a2e" }}>{m}</option>)}
          </select>
          <button onClick={() => setCrossSell(c => !c)}
            className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:scale-105"
            style={{
              background: crossSell ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)",
              color: crossSell ? "#a78bfa" : "rgba(255,255,255,0.5)",
              border: crossSell ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.1)"
            }}>
            {crossSell ? "🔀 Cross-sell ON" : "🏪 Same Restaurant"}
          </button>
          <button onClick={loadMetrics}
            className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105"
            style={{ background:"linear-gradient(90deg,#e23744,#ff6b6b)", color:"#fff" }}>
            📊 Metrics
          </button>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="px-8 py-3 flex items-center gap-8 overflow-x-auto"
        style={{ background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.05)", scrollbarWidth:"none" }}>
        {[
          { label:"Cart Value",      value:`₹${cartTotal}`,                         icon:"💰" },
          { label:"You Save",        value:`₹${savings}`,                           icon:"🏷️" },
          { label:"Latency",         value:latency ? `${latency}ms` : "--",         icon:"⚡" },
          { label:"Acceptance Rate", value:`${acceptRate}%`,                        icon:"✅" },
          { label:"Meal Complete",   value:`${progressPct}%`,                       icon:"🍽️" },
          { label:"Restaurant",      value:RESTAURANT_NAMES[restaurant],            icon:"🏪" },
          { label:"Mode",            value:crossSell ? "Cross-sell" : "Same Rest.", icon:"🔀" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 shrink-0">
            <span className="text-sm">{s.icon}</span>
            <span className="font-bold text-white text-sm">{s.value}</span>
            <span className="text-xs" style={{ color:"rgba(255,255,255,0.35)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="px-8 py-6 grid grid-cols-12 gap-6">

        {/* ── Menu ── */}
        <div className="col-span-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-lg">🍽️ Menu</h2>
              <div className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.4)" }}>
                {RESTAURANT_NAMES[restaurant]} · {filteredMenu.length} items
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color:"rgba(255,255,255,0.35)" }}>🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search food or category..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border-0"
              style={{
                background:"rgba(255,255,255,0.08)",
                color:"#fff",
                border:"1px solid rgba(255,255,255,0.1)",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color:"rgba(255,255,255,0.4)" }}>✕</button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105 shrink-0"
                style={{
                  background: filterCat === cat ? "linear-gradient(90deg,#e23744,#ff6b6b)" : "rgba(255,255,255,0.08)",
                  color: filterCat === cat ? "#fff" : "rgba(255,255,255,0.5)",
                }}>
                {CATEGORY_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>

          {/* Menu Items — image cards with horizontal scroll per category */}
          <div className="max-h-[65vh] overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth:"none" }}>
            {filteredMenu.length === 0 ? (
              <div className="rounded-2xl p-8 text-center"
                style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.1)" }}>
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-sm" style={{ color:"rgba(255,255,255,0.3)" }}>No items found</div>
                <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.2)" }}>
                  Try a different search or category
                </div>
              </div>
            ) : filteredMenu.map(item => {
              const inCart = !!cart.find(c => c.item_id === item.item_id)
              const cc     = CATEGORY_COLOR[item.category]
              return (
                <div key={item.item_id}
                  className="rounded-2xl overflow-hidden flex transition-all hover:scale-[1.01]"
                  style={{
                    background: inCart ? "rgba(226,55,68,0.12)" : "rgba(255,255,255,0.05)",
                    border: inCart ? "1px solid rgba(226,55,68,0.35)" : "1px solid rgba(255,255,255,0.08)",
                    height:"80px"
                  }}>
                  {/* Food Image */}
                  <FoodImage src={item.img} alt={item.name} className="w-20 shrink-0" />

                  {/* Info */}
                  <div className="flex items-center justify-between flex-1 px-3">
                    <div>
                      <div className="text-white font-semibold text-sm">{item.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold" style={{ color:"rgba(255,255,255,0.6)" }}>₹{item.price}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background:cc.bg, color:cc.text }}>{item.category}</span>
                        <span className="text-xs">{item.veg ? "🟢" : "🔴"}</span>
                      </div>
                    </div>
                    <button onClick={() => addToCart(item)} disabled={inCart}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-105 shrink-0"
                      style={{
                        background: inCart ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg,#e23744,#ff6b6b)",
                        color:"#fff",
                        opacity: inCart ? 0.6 : 1
                      }}>
                      {inCart ? "✓" : "Add"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Cart ── */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">
              🛒 Cart
              {cart.length > 0 && (
                <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ background:"#e23744" }}>
                  {cart.length}
                </span>
              )}
            </h2>
            {cart.length > 0 && (
              <button onClick={() => { setCart([]); setRecs([]) }}
                className="text-xs px-3 py-1 rounded-full transition-all hover:scale-105"
                style={{ background:"rgba(226,55,68,0.2)", color:"#ff6b6b" }}>
                Clear
              </button>
            )}
          </div>

          {/* Meal Completion Progress */}
          {cart.length > 0 && (
            <div className="rounded-2xl p-4 mb-4"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">Meal Completion</span>
                <span className="text-xs font-bold"
                  style={{ color:progressPct === 100 ? "#4ade80" : "#e23744" }}>
                  {progressPct}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width:`${progressPct}%`,
                    background: progressPct === 100
                      ? "linear-gradient(90deg,#4ade80,#22c55e)"
                      : "linear-gradient(90deg,#e23744,#ff6b6b)"
                  }} />
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {progress.map(p => (
                  <span key={p.cat} className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      background: p.done ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)",
                      color: p.done ? "#4ade80" : "rgba(255,255,255,0.4)"
                    }}>
                    {p.done ? "✓" : "○"} {p.cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.1)" }}>
              <div className="text-4xl mb-2">🛒</div>
              <div className="text-sm" style={{ color:"rgba(255,255,255,0.3)" }}>Your cart is empty</div>
              <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.2)" }}>
                Add items to get AI recommendations
              </div>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden"
              style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
              {cart.map((item, idx) => (
                <div key={item.item_id}
                  className="flex items-center gap-3 px-3 py-2"
                  style={{
                    background: idx % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                    borderBottom:"1px solid rgba(255,255,255,0.05)"
                  }}>
                  <FoodImage src={item.img} alt={item.name} className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>₹{item.price}</div>
                  </div>
                  <button onClick={() => removeFromCart(item.item_id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110"
                    style={{ background:"rgba(226,55,68,0.2)", color:"#ff6b6b" }}>
                    ×
                  </button>
                </div>
              ))}
              <div className="px-4 py-3" style={{ background:"rgba(255,255,255,0.06)" }}>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-white font-bold text-lg">
                    ₹<AnimatedNumber value={cartTotal} />
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color:"#4ade80" }}>
                  🏷️ You save ₹{savings} with combo
                </div>
              </div>
            </div>
          )}

          {/* Live Acceptance Rate */}
          {offered > 0 && (
            <div className="mt-4 rounded-2xl p-4"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-xs font-bold text-white mb-2">Live Acceptance Rate</div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black"
                  style={{ color: acceptRate > 50 ? "#4ade80" : "#e23744" }}>
                  {acceptRate}%
                </span>
                <span className="text-xs mb-1" style={{ color:"rgba(255,255,255,0.4)" }}>
                  {accepted}/{offered} accepted
                </span>
              </div>
              <div className="w-full h-2 rounded-full mt-2 overflow-hidden"
                style={{ background:"rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${acceptRate}%`, background:"linear-gradient(90deg,#e23744,#4ade80)" }} />
              </div>
            </div>
          )}
        </div>

        {/* ── CSAO Rail ── */}
        <div className="col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-lg">✨ CSAO Rail</h2>
              <div className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.4)" }}>
                {crossSell ? "Cross-sell mode — all restaurants" : `Same restaurant — ${RESTAURANT_NAMES[restaurant]}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:"#e23744" }} />
                  <span className="text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>Updating...</span>
                </div>
              )}
              {latency && !loading && (
                <span className="text-xs px-3 py-1 rounded-full font-bold"
                  style={{ background:"rgba(74,222,128,0.15)", color:"#4ade80" }}>
                  ⚡ {latency}ms
                </span>
              )}
            </div>
          </div>

          {filteredRecs.length === 0 ? (
            <div className="rounded-2xl p-12 text-center"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.1)" }}>
              <div className="text-5xl mb-3">✨</div>
              <div className="text-sm" style={{ color:"rgba(255,255,255,0.3)" }}>
                {cart.length === 0 ? "Add items to your cart" : "No recommendations available"}
              </div>
              <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.2)" }}>
                {cart.length === 0 ? "Our AI will suggest perfect add-ons" : "Try switching to Cross-sell mode"}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[75vh] overflow-y-auto pr-1" style={{ scrollbarWidth:"none" }}>
              {filteredRecs.map((rec, idx) => {
                const inCart  = !!cart.find(c => c.item_id === rec.item_id)
                const isNew   = newRecIds.includes(rec.item_id)
                const pct     = Math.round(rec.score * 100)
                const recItem = ALL_ITEMS.find(i => i.item_id === rec.item_id)
                const cc      = CATEGORY_COLOR[rec.category] || { bg:"rgba(255,255,255,0.1)", text:"#fff" }
                return (
                  <div key={rec.item_id}
                    className="rounded-2xl overflow-hidden transition-all hover:scale-[1.03]"
                    style={{
                      background: inCart ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.05)",
                      border: inCart
                        ? "1px solid rgba(74,222,128,0.3)"
                        : isNew
                        ? "1px solid rgba(226,55,68,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                      transitionDelay:`${idx * 40}ms`
                    }}>
                    {/* Food Image */}
                    <div className="relative">
                      <FoodImage
                        src={recItem?.img}
                        alt={rec.name}
                        className="w-full h-28"
                      />
                      {/* Score badge */}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-black"
                        style={{
                          background:"rgba(0,0,0,0.7)",
                          color: pct > 60 ? "#4ade80" : pct > 30 ? "#fbbf24" : "#f87171"
                        }}>
                        {pct}%
                      </div>
                      {/* Rank badge */}
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                        style={{ background:"rgba(226,55,68,0.9)", color:"#fff" }}>
                        {idx + 1}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="text-white font-semibold text-sm mb-1 truncate">{rec.name}</div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-bold" style={{ color:"rgba(255,255,255,0.6)" }}>₹{rec.price}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background:cc.bg, color:cc.text }}>{rec.category}</span>
                      </div>
                      <ScoreBar score={rec.score} />
                      <button onClick={() => addToCart({ ...rec, img: recItem?.img, veg: recItem?.veg }, true)}
                        disabled={inCart}
                        className="mt-2 w-full text-xs font-bold py-1.5 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                        style={{
                          background: inCart ? "rgba(74,222,128,0.2)" : "linear-gradient(90deg,#e23744,#ff6b6b)",
                          color:"#fff"
                        }}>
                        {inCart ? "✓ Added" : "+ Add to Cart"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Metrics Modal */}
      {showMetrics && metrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}
          onClick={() => setShowMetrics(false)}>
          <div className="rounded-3xl p-8 shadow-2xl"
            style={{ width:"520px", background:"linear-gradient(135deg,#1a1a2e,#16213e)", border:"1px solid rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-black text-xl">📊 System Metrics</h3>
              <button onClick={() => setShowMetrics(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background:"rgba(255,255,255,0.1)", color:"#fff" }}>×</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label:"Total Orders",    value:metrics.total_orders,          icon:"📦", color:"#e23744" },
                { label:"Total Users",     value:metrics.total_users,           icon:"👥", color:"#6366f1" },
                { label:"Avg Order Value", value:`₹${metrics.avg_order_value}`, icon:"💰", color:"#f59e0b" },
                { label:"Model AUC",       value:metrics.model_auc,             icon:"🎯", color:"#4ade80" },
                { label:"Precision@8",     value:metrics.precision_at_8,        icon:"📈", color:"#22d3ee" },
                { label:"Inference",       value:"<300ms",                      icon:"⚡", color:"#a78bfa" },
              ].map(m => (
                <div key={m.label} className="rounded-2xl p-4 text-center"
                  style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-2xl mb-1">{m.icon}</div>
                  <div className="text-xl font-black mb-1" style={{ color:m.color }}>{m.value}</div>
                  <div className="text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl p-4"
              style={{ background:"rgba(226,55,68,0.1)", border:"1px solid rgba(226,55,68,0.2)" }}>
              <div className="text-xs font-bold text-white mb-1">🧠 Model Info</div>
              <div className="text-xs" style={{ color:"rgba(255,255,255,0.5)" }}>
                LightGBM · 14 contextual features · Sequential cart logic · Cold start handled · &lt;300ms latency
              </div>
            </div>
            <button onClick={() => setShowMetrics(false)}
              className="mt-4 w-full py-3 rounded-2xl font-bold text-white transition-all hover:scale-105"
              style={{ background:"linear-gradient(90deg,#e23744,#ff6b6b)" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}