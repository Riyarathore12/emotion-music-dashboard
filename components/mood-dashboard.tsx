"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Video, Music, Brain, Play, Pause, SkipForward, Heart, Volume2 } from "lucide-react"

interface Emotion {
  name: string
  confidence: number
  color: string
}

interface Song {
  title: string
  artist: string
  duration: string
  coverColor: string
}

interface Playlist {
  mood: string
  songs: Song[]
  description: string
}

const PLAYLISTS: Record<string, Playlist> = {
  happy: {
    mood: "Happy",
    description: "Uplifting tracks to amplify your joy",
    songs: [
      {
        title: "Good Vibrations",
        artist: "The Beach Boys",
        duration: "3:35",
        coverColor: "from-amber-500 to-orange-500",
      },
      {
        title: "Walking on Sunshine",
        artist: "Katrina and The Waves",
        duration: "3:58",
        coverColor: "from-yellow-400 to-amber-500",
      },
      { title: "Happy", artist: "Pharrell Williams", duration: "3:53", coverColor: "from-orange-400 to-amber-600" },
      { title: "Don't Stop Me Now", artist: "Queen", duration: "3:29", coverColor: "from-amber-500 to-yellow-500" },
    ],
  },
  sad: {
    mood: "Sad",
    description: "Gentle melodies for emotional release",
    songs: [
      { title: "Someone Like You", artist: "Adele", duration: "4:45", coverColor: "from-blue-600 to-indigo-700" },
      { title: "The Night We Met", artist: "Lord Huron", duration: "3:28", coverColor: "from-indigo-600 to-blue-700" },
      { title: "Skinny Love", artist: "Bon Iver", duration: "3:58", coverColor: "from-blue-700 to-slate-800" },
      { title: "Mad World", artist: "Gary Jules", duration: "3:09", coverColor: "from-slate-600 to-blue-800" },
    ],
  },
  calm: {
    mood: "Calm",
    description: "Peaceful sounds for mindful moments",
    songs: [
      { title: "Weightless", artist: "Marconi Union", duration: "8:09", coverColor: "from-teal-500 to-cyan-600" },
      { title: "Clair de Lune", artist: "Claude Debussy", duration: "5:02", coverColor: "from-cyan-500 to-teal-600" },
      { title: "Holocene", artist: "Bon Iver", duration: "5:36", coverColor: "from-teal-600 to-emerald-600" },
      { title: "Breathe", artist: "Télépopmusik", duration: "4:35", coverColor: "from-emerald-500 to-teal-500" },
    ],
  },
  angry: {
    mood: "Angry",
    description: "Intense tracks to channel your energy",
    songs: [
      { title: "Break Stuff", artist: "Limp Bizkit", duration: "2:46", coverColor: "from-red-600 to-rose-700" },
      {
        title: "Killing in the Name",
        artist: "Rage Against the Machine",
        duration: "5:13",
        coverColor: "from-rose-600 to-red-700",
      },
      { title: "Bodies", artist: "Drowning Pool", duration: "3:21", coverColor: "from-red-700 to-orange-700" },
      { title: "Last Resort", artist: "Papa Roach", duration: "3:20", coverColor: "from-orange-600 to-red-600" },
    ],
  },
  anxious: {
    mood: "Anxious",
    description: "Soothing rhythms to ease your mind",
    songs: [
      { title: "Breathe Me", artist: "Sia", duration: "4:33", coverColor: "from-violet-600 to-purple-700" },
      { title: "The Scientist", artist: "Coldplay", duration: "5:09", coverColor: "from-purple-600 to-indigo-600" },
      { title: "Fix You", artist: "Coldplay", duration: "4:54", coverColor: "from-indigo-600 to-violet-600" },
      { title: "Let It Be", artist: "The Beatles", duration: "4:03", coverColor: "from-purple-700 to-violet-700" },
    ],
  },
  energetic: {
    mood: "Energetic",
    description: "High-tempo beats to fuel your momentum",
    songs: [
      { title: "Eye of the Tiger", artist: "Survivor", duration: "4:04", coverColor: "from-lime-500 to-green-600" },
      { title: "Thunderstruck", artist: "AC/DC", duration: "4:52", coverColor: "from-green-500 to-emerald-600" },
      { title: "Till I Collapse", artist: "Eminem", duration: "4:57", coverColor: "from-emerald-500 to-lime-600" },
      { title: "Can't Hold Us", artist: "Macklemore", duration: "4:18", coverColor: "from-lime-600 to-green-500" },
    ],
  },
  neutral: {
    mood: "Neutral",
    description: "Balanced tunes for everyday moments",
    songs: [
      { title: "Sunflower", artist: "Post Malone", duration: "2:38", coverColor: "from-slate-500 to-gray-600" },
      { title: "Riptide", artist: "Vance Joy", duration: "3:24", coverColor: "from-gray-500 to-slate-600" },
      { title: "Budapest", artist: "George Ezra", duration: "3:20", coverColor: "from-slate-600 to-zinc-600" },
      { title: "Ho Hey", artist: "The Lumineers", duration: "2:43", coverColor: "from-zinc-500 to-slate-500" },
    ],
  },
}

export function MoodDashboard() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [detectedEmotion, setDetectedEmotion] = useState<string>("neutral")
  const [emotions, setEmotions] = useState<Emotion[]>([])
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist>(PLAYLISTS.neutral)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)

  useEffect(() => {
    loadModels()
  }, [])

  useEffect(() => {
    if (detectedEmotion) {
      const playlist = PLAYLISTS[detectedEmotion.toLowerCase()] || PLAYLISTS.neutral
      setCurrentPlaylist(playlist)
    }
  }, [detectedEmotion])

  const loadModels = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).faceapi) {
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model"
        await Promise.all([
          (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          (window as any).faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        setIsModelLoaded(true)
        console.log("[v0] Face detection models loaded successfully")
      }
    } catch (error) {
      console.error("[v0] Error loading models:", error)
    }
  }

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsWebcamActive(true)
          detectEmotion()
        }
      }
    } catch (error) {
      console.error("[v0] Error accessing webcam:", error)
      alert("Please allow camera access to detect your mood")
    }
  }

  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsWebcamActive(false)
    }
  }

  const detectEmotion = async () => {
    if (!videoRef.current || !canvasRef.current || !(window as any).faceapi) return

    const detect = async () => {
      if (!videoRef.current || !isWebcamActive) return

      const detections = await (window as any).faceapi
        .detectSingleFace(videoRef.current, new (window as any).faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions()

      if (detections) {
        const expressions = detections.expressions
        const emotionData: Emotion[] = [
          { name: "happy", confidence: expressions.happy * 100, color: "bg-amber-500" },
          { name: "sad", confidence: expressions.sad * 100, color: "bg-blue-600" },
          { name: "angry", confidence: expressions.angry * 100, color: "bg-red-600" },
          { name: "anxious", confidence: (expressions.fearful + expressions.surprised) * 50, color: "bg-violet-600" },
          { name: "calm", confidence: expressions.neutral * 100, color: "bg-teal-500" },
          { name: "energetic", confidence: expressions.happy * 80, color: "bg-lime-500" },
        ].sort((a, b) => b.confidence - a.confidence)

        setEmotions(emotionData)
        const dominantEmotion = emotionData[0].name
        setDetectedEmotion(dominantEmotion)
      }

      requestAnimationFrame(detect)
    }

    detect()
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const nextSong = () => {
    setCurrentSongIndex((prev) => (prev + 1) % currentPlaylist.songs.length)
  }

  const currentSong = currentPlaylist.songs[currentSongIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 text-balance">Emotion Music Therapy</h1>
            <p className="text-lg text-slate-400">AI-powered mood detection for personalized music discovery</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 px-4 py-2">
              <Brain className="w-4 h-4 mr-2" />
              AI Powered
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Webcam Section */}
          <Card className="lg:col-span-1 bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-indigo-400" />
                  Mood Detection
                </h2>
                {isWebcamActive && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-slate-400">Live</span>
                  </div>
                )}
              </div>

              <div className="relative aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {!isWebcamActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-500 text-sm">Camera inactive</p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={isWebcamActive ? stopWebcam : startWebcam}
                disabled={!isModelLoaded}
                className={`w-full ${
                  isWebcamActive ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isWebcamActive ? "Stop Camera" : "Start Camera"}
              </Button>

              {/* Current Mood */}
              {emotions.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Detected Mood</span>
                    <Badge className="bg-indigo-500 text-white capitalize">{detectedEmotion}</Badge>
                  </div>

                  {/* Emotion Bars */}
                  <div className="space-y-2">
                    {emotions.slice(0, 4).map((emotion) => (
                      <div key={emotion.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 capitalize">{emotion.name}</span>
                          <span className="text-slate-300">{emotion.confidence.toFixed(0)}%</span>
                        </div>
                        <Progress value={emotion.confidence} className="h-1.5 bg-slate-800" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Playlist Section */}
          <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
                    <Music className="w-6 h-6 text-indigo-400" />
                    {currentPlaylist.mood} Playlist
                  </h2>
                  <p className="text-sm text-slate-400">{currentPlaylist.description}</p>
                </div>
              </div>

              {/* Now Playing Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-6 text-white">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-24 h-24 rounded-lg bg-gradient-to-br ${currentSong.coverColor} flex-shrink-0 flex items-center justify-center shadow-lg`}
                  >
                    <Music className="w-10 h-10 text-white/90" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-indigo-200 mb-1">NOW PLAYING</p>
                    <h3 className="text-xl font-bold mb-1 truncate">{currentSong.title}</h3>
                    <p className="text-indigo-200 text-sm mb-4">{currentSong.artist}</p>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
                        onClick={togglePlayPause}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
                        onClick={nextSong}
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full ml-auto"
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-full"
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Song List */}
              <div className="space-y-2">
                {currentPlaylist.songs.map((song, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentSongIndex(index)}
                    className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all hover:bg-slate-800/50 ${
                      index === currentSongIndex ? "bg-slate-800/70" : ""
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-md bg-gradient-to-br ${song.coverColor} flex-shrink-0 flex items-center justify-center`}
                    >
                      <Music className="w-5 h-5 text-white/90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{song.title}</h4>
                      <p className="text-sm text-slate-400 truncate">{song.artist}</p>
                    </div>
                    <span className="text-sm text-slate-500">{song.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
