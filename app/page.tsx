"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Play, Pause, RotateCcw, Settings2, X, Volume2, VolumeX, Moon, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type Theme = "ocean" | "forest" | "desert" | "space"
type Mode = "timer" | "stopwatch"

const themes = {
  ocean: {
    name: "Ocean",
    image: "/images/ocean.png",
    textColor: "text-cyan-50",
    buttonBg: "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400/30",
    ring: "rgba(255,255,255,0.70)",
    ringTrack: "rgba(255,255,255,0.12)",
  },
  forest: {
    name: "Forest",
    image: "/images/forest.png",
    textColor: "text-emerald-50",
    buttonBg: "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/30",
    ring: "rgba(255,255,255,0.70)",
    ringTrack: "rgba(255,255,255,0.12)",
  },
  desert: {
    name: "Desert",
    image: "/images/desert.png",
    textColor: "text-orange-50",
    buttonBg: "bg-orange-500/20 hover:bg-orange-500/30 border-orange-400/30",
    ring: "rgba(255,255,255,0.72)",
    ringTrack: "rgba(255,255,255,0.12)",
  },
  space: {
    name: "Space",
    image: "/images/space.png",
    textColor: "text-purple-50",
    buttonBg: "bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/30",
    ring: "rgba(255,255,255,0.72)",
    ringTrack: "rgba(255,255,255,0.12)",
  },
} satisfies Record<Theme, any>

const LS_KEYS = {
  theme: "ekant_theme",
  sound: "ekant_sound",
  dark: "ekant_dark",
  sessions: "ekant_sessions_today",
  zen: "ekant_zen",
} as const

// Slider mapping: 0 -> 1 min, 1 -> 5 min, 2 -> 10 min, ... , 36 -> 180 min
const sliderIndexToMinutes = (idx: number) => (idx <= 0 ? 1 : idx * 5)
const minutesToSliderIndex = (mins: number) => (mins <= 1 ? 0 : Math.round(mins / 5))

type SessionsPayload = { date: string; count: number }
const todayKey = () => new Date().toISOString().slice(0, 10)

export default function Ekant() {
  const [theme, setTheme] = useState<Theme>("ocean")
  const [darkMode, setDarkMode] = useState(false)

  const [mode, setMode] = useState<Mode>("timer")
  const [isActive, setIsActive] = useState(false)

  // Slider index (0..36)
  const [sliderIndex, setSliderIndex] = useState(() => minutesToSliderIndex(25))

  const initialTimerSeconds = useMemo(() => sliderIndexToMinutes(minutesToSliderIndex(25)) * 60, [])
  const [timerDuration, setTimerDuration] = useState(initialTimerSeconds)
  const [timeLeft, setTimeLeft] = useState(initialTimerSeconds)

  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Zen mode
  const [zenMode, setZenMode] = useState(false)

  // Auto-hide controls while running
  const [showControls, setShowControls] = useState(true)
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // End animation: ring shrink -> pop -> disappear
  const [ringPhase, setRingPhase] = useState<"idle" | "ending">("idle")

  // Sessions today
  const [sessionsToday, setSessionsToday] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  // Wake Lock
  const wakeLockRef = useRef<any>(null)

  const currentTheme = themes[theme]

  /* ---------- init ---------- */
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(LS_KEYS.theme) as Theme | null
      const savedSound = localStorage.getItem(LS_KEYS.sound)
      const savedDark = localStorage.getItem(LS_KEYS.dark)
      const savedZen = localStorage.getItem(LS_KEYS.zen)

      if (savedTheme && savedTheme in themes) setTheme(savedTheme)
      if (savedSound === "1") setSoundEnabled(true)
      if (savedDark === "1") setDarkMode(true)
      if (savedZen === "1") setZenMode(true)
    } catch {
      // ignore
    }

    // Sessions today init (localStorage)
    try {
      const raw = localStorage.getItem(LS_KEYS.sessions)
      const parsed: SessionsPayload | null = raw ? JSON.parse(raw) : null
      const t = todayKey()
      if (!parsed || parsed.date !== t) {
        const fresh: SessionsPayload = { date: t, count: 0 }
        localStorage.setItem(LS_KEYS.sessions, JSON.stringify(fresh))
        setSessionsToday(0)
      } else {
        setSessionsToday(parsed.count || 0)
      }
    } catch {
      // ignore
    }

    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWS57OahUhELTKXh8blsJAU2jdXwyoEnCBdfs+n2pUsZDlSr5O+1bSAFMIrS8NSFOwoXY7zp8qFaGgtJo+HyvmkfBSF+yu7fkj0MFl2465JjKRQZU6rs8KNeGggcgtHdqmcvDhE+ktTmrm85CB2x+rcnkwWDTya1uipcjwLFnyy5bJ3UhcQUK3j7ZlXFgsZfMvn2pRJFBRPpuTssm4tERVTs+PTmkYZD0mi4e25cyQFOY3U8MqBJwgXXrLo9axPGwpGouDutnckBSJ8yO7dkj0MFl2461NlKBQbU6vr7qVbGgsZftPn1qBMFhJOp+PsqWguEhZRrePtn1gXChh+0N7WolQYEE2n4+uoaS0WF1Ks6+2hWhsMGX7U59CVNQgcebDn8KFQGAtIo+HyvmkfBSJ7y+3ilz0LFmC76fKiUhMKTKXh8blsJAU2jdXwyoEnCBdfs+n2pUsZDlSr5O+1bSAFMIrS8NSFOwoXY7zp8qFaGgpKouHyv2oeBxyAy+7fkj0MF2G75+2eVBkLSKPh8r5pHwU="
    )
  }, [])

  /* ---------- persist prefs ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.theme, theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.sound, soundEnabled ? "1" : "0")
    } catch {}
  }, [soundEnabled])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.dark, darkMode ? "1" : "0")
    } catch {}
  }, [darkMode])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.zen, zenMode ? "1" : "0")
    } catch {}
  }, [zenMode])

  /* ---------- outside click closes settings ---------- */
  useEffect(() => {
    if (!showSettings) return
    const handler = (e: MouseEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) setShowSettings(false)
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [showSettings])

  /* ---------- controls auto-hide helpers ---------- */
  const scheduleHideControls = () => {
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 4000)
  }

  useEffect(() => {
    if (isActive) {
      setShowControls(true)
      scheduleHideControls()
    } else {
      setShowControls(true)
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  const handleUserNudge = () => {
    if (!isActive) return
    setShowControls(true)
    scheduleHideControls()
  }

  /* ---------- Wake Lock (best effort) ---------- */
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        // @ts-ignore
        if (!("wakeLock" in navigator)) return
        // @ts-ignore
        wakeLockRef.current = await navigator.wakeLock.request("screen")
      } catch {
        // silent
      }
    }

    const releaseWakeLock = async () => {
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
        }
      } catch {
        // silent
      }
    }

    if (isActive) requestWakeLock()
    else releaseWakeLock()

    return () => {
      releaseWakeLock()
    }
  }, [isActive])

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || (target as any)?.isContentEditable

      if (isTyping) return

      if (e.key.toLowerCase() === "z") {
        e.preventDefault()
        setZenMode((v) => !v)
        return
      }

      if (e.key === " ") {
        e.preventDefault()
        setIsActive((v) => !v)
        return
      }

      if (e.key.toLowerCase() === "r") {
        e.preventDefault()
        setIsActive(false)
        setRingPhase("idle")
        setTimeLeft(mode === "timer" ? timerDuration : 0)
        return
      }

      if (e.key.toLowerCase() === "t") {
        e.preventDefault()
        setMode("timer")
        setIsActive(false)
        setRingPhase("idle")
        setTimeLeft(timerDuration)
        return
      }

      if (e.key.toLowerCase() === "s") {
        e.preventDefault()
        setMode("stopwatch")
        setIsActive(false)
        setRingPhase("idle")
        setTimeLeft(0)
        return
      }

      if (e.key === "Escape") {
        setShowSettings(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mode, timerDuration])

  /* ---------- ticking ---------- */
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!isActive) return

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (mode === "timer") {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }

            setIsActive(false)

            if (soundEnabled && audioRef.current) {
              audioRef.current.currentTime = 0
              audioRef.current.play().catch(() => {})
            }

            // Session complete -> increment sessions today
            try {
              const raw = localStorage.getItem(LS_KEYS.sessions)
              const parsed: SessionsPayload | null = raw ? JSON.parse(raw) : null
              const t = todayKey()
              const next: SessionsPayload =
                parsed && parsed.date === t ? { date: t, count: (parsed.count || 0) + 1 } : { date: t, count: 1 }
              localStorage.setItem(LS_KEYS.sessions, JSON.stringify(next))
              setSessionsToday(next.count)
            } catch {
              // ignore
            }

            setRingPhase("ending")
            setTimeout(() => setRingPhase("idle"), 520)

            return 0
          }
          return prev - 1
        }
        return prev + 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, mode, soundEnabled])

  /* ---------- helpers ---------- */
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Progress ring should appear while running, and during ending animation.
  const showRing = mode === "timer" && (isActive || ringPhase === "ending")

  const remainingRatio = useMemo(() => {
    if (mode !== "timer") return 0
    const total = Math.max(1, timerDuration)
    return Math.min(1, Math.max(0, timeLeft / total))
  }, [mode, timeLeft, timerDuration])

  const ringSize = 300
  const ringStroke = 18
  const r = (ringSize - ringStroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * remainingRatio

  const overlayClass = darkMode
    ? "bg-gradient-to-b from-black/70 via-black/45 to-black/75"
    : "bg-gradient-to-b from-black/45 via-black/25 to-black/55"

  const cardClass = darkMode ? "bg-black/35 border-white/12" : "bg-white/[0.06] border-white/10"

  /* ---------- actions ---------- */
  const applyTimerMinutes = (mins: number) => {
    const seconds = mins * 60
    setMode("timer")
    setTimerDuration(seconds)
    setTimeLeft(seconds)
    setIsActive(false)
    setRingPhase("idle")
  }

  const handleSliderChange = (idx: number) => {
    setSliderIndex(idx)
    const mins = sliderIndexToMinutes(idx)
    applyTimerMinutes(mins)
  }

  const handleReset = () => {
    setIsActive(false)
    setRingPhase("idle")
    setTimeLeft(mode === "timer" ? timerDuration : 0)
  }

  const switchToStopwatch = () => {
    setMode("stopwatch")
    setIsActive(false)
    setRingPhase("idle")
    setTimeLeft(0)
  }

  const switchToTimer = () => {
    setMode("timer")
    setIsActive(false)
    setRingPhase("idle")
    setTimeLeft(timerDuration)
  }

  const displayedMinutes = sliderIndexToMinutes(sliderIndex)

  return (
    <div className="relative min-h-screen w-full overflow-hidden" onPointerDown={handleUserNudge}>
      <style>{`
        @font-face {
          font-family: "Quarters";
          src: url("/fonts/Quarters.woff2") format("woff2");
          font-display: swap;
        }

        @keyframes ringPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }

        @keyframes ringExit {
          0%   { transform: scale(1); opacity: 1; }
          60%  { transform: scale(0.86); opacity: 0.92; }
          100% { transform: scale(0.92); opacity: 0; }
        }
      `}</style>

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url(${currentTheme.image})` }}
      >
        <div className={`absolute inset-0 ${overlayClass}`} />
      </div>

      {/* Header (keep layout; in Zen we hide only the title text) */}
      <header className="relative z-[60] flex items-center justify-between p-6">
        <h1
          className={`text-2xl font-light tracking-wider ${currentTheme.textColor} ${zenMode ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          style={{ fontFamily: `"Quarters", ui-sans-serif, system-ui` }}
        >
          Ekant
        </h1>

        <div ref={settingsRef} className="relative z-[70]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings((v) => !v)}
            className={`${currentTheme.textColor} ${currentTheme.buttonBg} border`}
          >
            {showSettings ? <X className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
          </Button>

          {showSettings && (
            <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/40">
              <div className="p-4 space-y-4">
                {/* Theme / Background image (hidden in Zen) */}
                {!zenMode && (
                  <div>
                    <div className={`mb-2 flex items-center gap-2 text-xs tracking-[0.25em] ${currentTheme.textColor} opacity-70`}>
                      <ImageIcon className="h-4 w-4" />
                      BACKGROUND
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(themes) as Theme[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={[
                            "rounded-xl border px-3 py-2 text-sm font-light transition-all",
                            "hover:scale-[1.01] active:scale-[0.99]",
                            themes[t].buttonBg,
                            themes[t].textColor,
                            theme === t ? "ring-2 ring-white/40" : "ring-0",
                          ].join(" ")}
                        >
                          {themes[t].name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zen mode toggle */}
                <button
                  onClick={() => setZenMode((v) => !v)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-3",
                    "bg-white/[0.06] transition-all hover:bg-white/[0.08]",
                    currentTheme.textColor,
                  ].join(" ")}
                >
                  <span className="text-sm font-light">Zen mode</span>
                  <span className="text-sm font-light opacity-80">{zenMode ? "On" : "Off"}</span>
                </button>

                {/* Dark mode */}
                <button
                  onClick={() => setDarkMode((v) => !v)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-3",
                    "bg-white/[0.06] transition-all hover:bg-white/[0.08]",
                    currentTheme.textColor,
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span className="text-sm font-light">Dark mode</span>
                  </div>
                  <span className="text-sm font-light opacity-80">{darkMode ? "On" : "Off"}</span>
                </button>

                {/* Sound */}
                <button
                  onClick={() => setSoundEnabled((v) => !v)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-3",
                    "bg-white/[0.06] transition-all hover:bg-white/[0.08]",
                    currentTheme.textColor,
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <span className="text-sm font-light">End sound</span>
                  </div>
                  <span className="text-sm font-light opacity-80">{soundEnabled ? "On" : "Off"}</span>
                </button>

                <div className={`text-xs ${currentTheme.textColor} opacity-60`}>
                  Shortcuts: Space (start/pause), R (reset), T (timer), S (stopwatch), Z (zen), Esc (close)
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex h-[calc(100vh-96px)] items-center justify-center px-4 pb-10">
        <div className="w-full max-w-xl">
          <div className={["rounded-3xl backdrop-blur-xl border p-10 shadow-2xl shadow-black/30", cardClass].join(" ")}>
            {/* Ring + Time */}
            <div className="relative mx-auto flex flex-col items-center">
              {/* Ring */}
              {showRing && (
                <div
                  className="pointer-events-none mb-8"
                  style={{
                    transformOrigin: "center",
                    animation: ringPhase === "ending" ? "ringExit 520ms ease-in forwards" : undefined,
                  }}
                >
                  <svg width={ringSize} height={ringSize} aria-hidden="true">
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={r}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={ringStroke}
                      fill="transparent"
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={r}
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={ringStroke}
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${c - dash}`}
                      transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                      style={{
                        transition: "stroke-dasharray 250ms ease",
                        filter: "drop-shadow(0 0 12px rgba(255,255,255,0.35))",
                        animation: ringPhase === "ending" ? undefined : "ringPulse 6s ease-in-out infinite",
                      }}
                    />
                  </svg>
                </div>
              )}

              {/* Timer text */}
              <div className={`text-center ${currentTheme.textColor}`}>
                <div className="text-7xl md:text-8xl font-extralight tracking-tight tabular-nums">{formatTime(timeLeft)}</div>

                {/* Hide extra labels in Zen */}
                {!zenMode && (
                  <>
                    <div className="mt-2 text-xs font-light tracking-[0.35em] opacity-70">{mode.toUpperCase()}</div>
                    <div className="mt-3 text-xs font-light opacity-60">Sessions today: {sessionsToday}</div>
                  </>
                )}
              </div>
            </div>

            {/* Controls (auto-hide while running) */}
            <div
              className={[
                "mt-10 relative z-10 flex items-center justify-center gap-4 transition-all duration-300",
                isActive && !showControls ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100",
              ].join(" ")}
            >
              <Button
                onClick={() => {
                  setIsActive((v) => !v)
                  if (!isActive) scheduleHideControls()
                }}
                className={`${currentTheme.textColor} ${currentTheme.buttonBg} border rounded-full h-14 w-14 p-0`}
              >
                {isActive ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
              </Button>

              <Button
                onClick={handleReset}
                className={`${currentTheme.textColor} ${currentTheme.buttonBg} border rounded-full h-14 w-14 p-0`}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            {/* Slider (Timer only, not active) - hidden in Zen */}
            {!zenMode && !isActive && mode === "timer" && (
              <div className="mt-10">
                <div className={`mb-3 flex items-center justify-between text-sm ${currentTheme.textColor} opacity-80`}>
                  <span className="font-light">Duration</span>
                  <span className="tabular-nums font-light">{displayedMinutes} min</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={36}
                  step={1}
                  value={sliderIndex}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="w-full accent-white/80"
                />

                <div className={`mt-2 flex justify-between text-xs ${currentTheme.textColor} opacity-60`}>
                  <span>1m</span>
                  <span>180m</span>
                </div>
              </div>
            )}

            {/* Mode Switch (not active) - hidden in Zen */}
            {!zenMode && !isActive && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={switchToTimer}
                  className={[
                    "rounded-full border px-5 py-2 text-sm font-light transition-all",
                    currentTheme.textColor,
                    currentTheme.buttonBg,
                    mode === "timer" ? "ring-2 ring-white/40" : "",
                    "hover:scale-[1.03] active:scale-[0.98]",
                  ].join(" ")}
                >
                  Timer
                </button>

                <button
                  onClick={switchToStopwatch}
                  className={[
                    "rounded-full border px-5 py-2 text-sm font-light transition-all",
                    currentTheme.textColor,
                    currentTheme.buttonBg,
                    mode === "stopwatch" ? "ring-2 ring-white/40" : "",
                    "hover:scale-[1.03] active:scale-[0.98]",
                  ].join(" ")}
                >
                  Stopwatch
                </button>
              </div>
            )}

            {/* Hint to show controls while running (hidden in Zen) */}
            {!zenMode && isActive && !showControls && (
              <div className={`mt-8 text-center text-xs ${currentTheme.textColor} opacity-60`}>Tap anywhere to show controls</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
