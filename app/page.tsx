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
    buttonBg: "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-300/25",
    accent: "from-cyan-300/40 to-cyan-500/10",
  },
  forest: {
    name: "Forest",
    image: "/images/forest.png",
    textColor: "text-emerald-50",
    buttonBg: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-300/25",
    accent: "from-emerald-300/40 to-emerald-500/10",
  },
  desert: {
    name: "Desert",
    image: "/images/desert.png",
    textColor: "text-orange-50",
    buttonBg: "bg-orange-500/15 hover:bg-orange-500/25 border-orange-300/25",
    accent: "from-orange-300/40 to-orange-500/10",
  },
  space: {
    name: "Space",
    image: "/images/space.png",
    textColor: "text-purple-50",
    buttonBg: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-300/25",
    accent: "from-purple-300/40 to-purple-500/10",
  },
} satisfies Record<Theme, any>

const LS_KEYS = {
  theme: "ekant_theme",
  sound: "ekant_sound",
  dark: "ekant_dark",
  sessions: "ekant_sessions_today",
  zen: "ekant_zen",
} as const

const sliderIndexToMinutes = (idx: number) => (idx <= 0 ? 1 : idx * 5)
const minutesToSliderIndex = (mins: number) => (mins <= 1 ? 0 : Math.round(mins / 5))

type SessionsPayload = { date: string; count: number }
const todayKey = () => new Date().toISOString().slice(0, 10)

export default function Ekant() {
  const [theme, setTheme] = useState<Theme>("ocean")
  const [darkMode, setDarkMode] = useState(false)

  const [mode, setMode] = useState<Mode>("timer")
  const [isActive, setIsActive] = useState(false)

  const [sliderIndex, setSliderIndex] = useState(() => minutesToSliderIndex(25))

  const initialTimerSeconds = useMemo(() => sliderIndexToMinutes(minutesToSliderIndex(25)) * 60, [])
  const [timerDuration, setTimerDuration] = useState(initialTimerSeconds)
  const [timeLeft, setTimeLeft] = useState(initialTimerSeconds)

  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [zenMode, setZenMode] = useState(false)

  const [showControls, setShowControls] = useState(true)
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [ringPhase, setRingPhase] = useState<"idle" | "ending">("idle")
  const [sessionsToday, setSessionsToday] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)
  const wakeLockRef = useRef<any>(null)

  const currentTheme = themes[theme]

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
    } catch {}

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
    } catch {}

    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWS57OahUhELTKXh8blsJAU2jdXwyoEnCBdfs+n2pUsZDlSr5O+1bSAFMIrS8NSFOwoXY7zp8qFaGgtJo+HyvmkfBSF+yu7fkj0MFl2465JjKRQZU6rs8KNeGggcgtHdqmcvDhE+ktTmrm85CB2x+rcnkwWDTya1uipcjwLFnyy5bJ3UhcQUK3j7ZlXFgsZfMvn2pRJFBRPpuTssm4tERVTs+PTmkYZD0mi4e25cyQFOY3U8MqBJwgXXrLo9axPGwpGouDutnckBSJ8yO7dkj0MFl2461NlKBQbU6vr7qVbGgsZftPn1qBMFhJOp+PsqWguEhZRrePtn1gXChh+0N7WolQYEE2n4+uoaS0WF1Ks6+2hWhsMGX7U59CVNQgcebDn8KFQGAtIo+HyvmkfBSJ7y+3ilz0LFmC76fKiUhMKTKXh8blsJAU2jdXwyoEnCBdfs+n2pUsZDlSr5O+1bSAFMIrS8NSFOwoXY7zp8qFaGgpKouHyv2oeBxyAy+7fkj0MF2G75+2eVBkLSKPh8r5pHwU="
    )
  }, [])

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

  useEffect(() => {
    if (!showSettings) return

    const handler = (e: MouseEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) setShowSettings(false)
    }

    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [showSettings])

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
  }, [isActive])

  const handleUserNudge = () => {
    if (!isActive) return
    setShowControls(true)
    scheduleHideControls()
  }

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        // @ts-ignore
        if (!("wakeLock" in navigator)) return
        // @ts-ignore
        wakeLockRef.current = await navigator.wakeLock.request("screen")
      } catch {}
    }

    const releaseWakeLock = async () => {
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release()
          wakeLockRef.current = null
        }
      } catch {}
    }

    if (isActive) requestWakeLock()
    else releaseWakeLock()

    return () => {
      releaseWakeLock()
    }
  }, [isActive])

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

      if (e.key === "Escape") setShowSettings(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mode, timerDuration])

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

            try {
              const raw = localStorage.getItem(LS_KEYS.sessions)
              const parsed: SessionsPayload | null = raw ? JSON.parse(raw) : null
              const t = todayKey()
              const next: SessionsPayload =
                parsed && parsed.date === t ? { date: t, count: (parsed.count || 0) + 1 } : { date: t, count: 1 }

              localStorage.setItem(LS_KEYS.sessions, JSON.stringify(next))
              setSessionsToday(next.count)
            } catch {}

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

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`
    }

    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const showRing = mode === "timer" && (isActive || ringPhase === "ending")

  const remainingRatio = useMemo(() => {
    if (mode !== "timer") return 0

    const total = Math.max(1, timerDuration)
    return Math.min(1, Math.max(0, timeLeft / total))
  }, [mode, timeLeft, timerDuration])

  const ringSize = 310
  const ringStroke = 18
  const r = (ringSize - ringStroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * remainingRatio

  const overlayClass = darkMode
    ? "bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.22),rgba(0,0,0,0.88))]"
    : "bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.12),rgba(0,0,0,0.68))]"

  const cardClass = darkMode
    ? "border-white/12 bg-black/42 shadow-black/45"
    : "border-white/12 bg-black/28 shadow-black/35"

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
        @keyframes ringPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.86; }
        }

        @keyframes ringExit {
          0%   { transform: scale(1); opacity: 1; }
          60%  { transform: scale(0.86); opacity: 0.92; }
          100% { transform: scale(0.94); opacity: 0; }
        }
      `}</style>

      <div
        className="absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url(${currentTheme.image})` }}
      >
        <div className={`absolute inset-0 ${overlayClass}`} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
      </div>

      <header className="relative z-[60] flex items-center justify-between p-6">
        <h1
          className={[
            "text-2xl font-semibold tracking-[0.22em] transition-opacity duration-300",
            currentTheme.textColor,
            zenMode ? "opacity-0 pointer-events-none" : "opacity-100",
          ].join(" ")}
        >
          Ekant
        </h1>

        <div ref={settingsRef} className="relative z-[70]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings((v) => !v)}
            className={[
              "h-11 w-11 rounded-full border backdrop-blur-xl transition-all duration-300",
              currentTheme.textColor,
              currentTheme.buttonBg,
            ].join(" ")}
          >
            {showSettings ? <X className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
          </Button>

          {showSettings && (
            <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-white/10 bg-black/45 p-4 shadow-2xl shadow-black/50 backdrop-blur-2xl">
              <div className="space-y-4">
                {!zenMode && (
                  <div>
                    <div
                      className={`mb-3 flex items-center gap-2 text-xs tracking-[0.28em] ${currentTheme.textColor} opacity-70`}
                    >
                      <ImageIcon className="h-4 w-4" />
                      BACKGROUND
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(themes) as Theme[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={[
                            "rounded-2xl border px-3 py-2.5 text-sm font-light transition-all",
                            "hover:scale-[1.015] active:scale-[0.99]",
                            themes[t].buttonBg,
                            themes[t].textColor,
                            theme === t ? "ring-2 ring-white/35" : "ring-0",
                          ].join(" ")}
                        >
                          {themes[t].name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setZenMode((v) => !v)}
                  className={[
                    "flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3",
                    "bg-white/[0.055] transition-all hover:bg-white/[0.085]",
                    currentTheme.textColor,
                  ].join(" ")}
                >
                  <span className="text-sm font-light">Zen mode</span>
                  <span className="text-sm font-light opacity-80">{zenMode ? "On" : "Off"}</span>
                </button>

                <button
                  onClick={() => setDarkMode((v) => !v)}
                  className={[
                    "flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3",
                    "bg-white/[0.055] transition-all hover:bg-white/[0.085]",
                    currentTheme.textColor,
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span className="text-sm font-light">Dark mode</span>
                  </div>
                  <span className="text-sm font-light opacity-80">{darkMode ? "On" : "Off"}</span>
                </button>

                <button
                  onClick={() => setSoundEnabled((v) => !v)}
                  className={[
                    "flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3",
                    "bg-white/[0.055] transition-all hover:bg-white/[0.085]",
                    currentTheme.textColor,
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <span className="text-sm font-light">End sound</span>
                  </div>
                  <span className="text-sm font-light opacity-80">{soundEnabled ? "On" : "Off"}</span>
                </button>

                <div className={`px-1 text-xs leading-relaxed ${currentTheme.textColor} opacity-55`}>
                  Space start/pause · R reset · T timer · S stopwatch · Z zen
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex h-[calc(100vh-96px)] items-center justify-center px-4 pb-10">
        <div className="w-full max-w-[560px]">
          <div
            className={[
              "relative overflow-hidden rounded-[2rem] border p-8 shadow-2xl backdrop-blur-2xl md:p-10",
              cardClass,
            ].join(" ")}
          >
            <div className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r ${currentTheme.accent}`} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)]" />

            <div className="relative mx-auto flex flex-col items-center">
              {showRing && (
                <div
                  className="pointer-events-none mb-8"
                  style={{
                    transformOrigin: "center",
                    animation: ringPhase === "ending" ? "ringExit 520ms ease-in forwards" : undefined,
                  }}
                >
                  <svg width={ringSize} height={ringSize} aria-hidden="true" className="overflow-visible">
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={r}
                      stroke="rgba(255,255,255,0.16)"
                      strokeWidth={ringStroke}
                      fill="transparent"
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={r}
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth={ringStroke}
                      fill="transparent"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${c - dash}`}
                      transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                      style={{
                        transition: "stroke-dasharray 250ms ease",
                        filter: "drop-shadow(0 0 16px rgba(255,255,255,0.38))",
                        animation: ringPhase === "ending" ? undefined : "ringPulse 6s ease-in-out infinite",
                      }}
                    />
                  </svg>
                </div>
              )}

              <div className={`text-center ${currentTheme.textColor}`}>
                <div className="text-7xl font-extralight tracking-[-0.05em] tabular-nums drop-shadow-2xl md:text-8xl">
                  {formatTime(timeLeft)}
                </div>

                {!zenMode && (
                  <>
                    <div className="mt-3 text-[11px] font-light tracking-[0.42em] opacity-65">{mode.toUpperCase()}</div>
                    <div className="mt-3 text-xs font-light opacity-55">Sessions today: {sessionsToday}</div>
                  </>
                )}
              </div>
            </div>

            <div
              className={[
                "relative z-10 mt-10 flex items-center justify-center gap-4 transition-all duration-300",
                isActive && !showControls ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100",
              ].join(" ")}
            >
              <Button
                onClick={() => {
                  setIsActive((v) => !v)
                  if (!isActive) scheduleHideControls()
                }}
                className={[
                  "h-14 w-14 rounded-full border p-0 shadow-lg shadow-black/25 backdrop-blur-xl",
                  "transition-all duration-300 hover:scale-[1.06] active:scale-[0.98]",
                  currentTheme.textColor,
                  currentTheme.buttonBg,
                ].join(" ")}
              >
                {isActive ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
              </Button>

              <Button
                onClick={handleReset}
                className={[
                  "h-14 w-14 rounded-full border p-0 shadow-lg shadow-black/25 backdrop-blur-xl",
                  "transition-all duration-300 hover:scale-[1.06] active:scale-[0.98]",
                  currentTheme.textColor,
                  currentTheme.buttonBg,
                ].join(" ")}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            {!zenMode && !isActive && mode === "timer" && (
              <div className="relative z-10 mt-10">
                <div className={`mb-3 flex items-center justify-between text-sm ${currentTheme.textColor} opacity-75`}>
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

                <div className={`mt-2 flex justify-between text-xs ${currentTheme.textColor} opacity-45`}>
                  <span>1m</span>
                  <span>180m</span>
                </div>
              </div>
            )}

            {!zenMode && !isActive && (
              <div className="relative z-10 mt-8 flex justify-center gap-2">
                <button
                  onClick={switchToTimer}
                  className={[
                    "rounded-full border px-5 py-2.5 text-sm font-light transition-all",
                    currentTheme.textColor,
                    currentTheme.buttonBg,
                    mode === "timer" ? "ring-2 ring-white/35" : "",
                    "hover:scale-[1.03] active:scale-[0.98]",
                  ].join(" ")}
                >
                  Timer
                </button>

                <button
                  onClick={switchToStopwatch}
                  className={[
                    "rounded-full border px-5 py-2.5 text-sm font-light transition-all",
                    currentTheme.textColor,
                    currentTheme.buttonBg,
                    mode === "stopwatch" ? "ring-2 ring-white/35" : "",
                    "hover:scale-[1.03] active:scale-[0.98]",
                  ].join(" ")}
                >
                  Stopwatch
                </button>
              </div>
            )}

            {!zenMode && isActive && !showControls && (
              <div className={`relative z-10 mt-8 text-center text-xs ${currentTheme.textColor} opacity-50`}>
                Tap anywhere to show controls
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}