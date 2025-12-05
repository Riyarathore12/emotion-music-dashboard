"use client"
import React from 'react';
import { useRef, useState, useEffect } from "react"
import playlists from "./playlists.json"
import { Howl } from "howler"

import * as faceapi from "face-api.js"

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)

  const [status, setStatus] = useState("Initializing AI models...")
  const [mood, setMood] = useState(null)
  const [moodConfidence, setMoodConfidence] = useState(0)
  const [tracks, setTracks] = useState([])
  const [playing, setPlaying] = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [expressions, setExpressions] = useState({})

  useEffect(() => {
    async function loadModels() {
      setStatus("Loading AI emotion recognition models...")
      const MODEL_URL = "/models"
      try {
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        setStatus("AI models loaded. Starting webcam...")
        startWebcam()
      } catch (e) {
        setStatus("Error loading models: " + e.message)
      }
    }
    loadModels()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (playing) playing.stop()
    }
  }, [])

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      })
      videoRef.current.srcObject = stream
      videoRef.current.play()
      setStatus('Ready! Click "Start Detection" to analyze your mood.')
    } catch (e) {
      setStatus("Unable to access webcam. Please grant camera permissions.")
    }
  }

  function mapExpressionsToMood(expressions) {
    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1])
    const top = sorted[0]

    setExpressions(expressions)

    if (expressions.happy > 0.6) return "happy"
    if (expressions.sad > 0.5) return "sad"
    if (expressions.angry > 0.5) return "angry"
    if (expressions.fearful > 0.4) return "anxious"
    if (expressions.surprised > 0.5) return "energetic"
    if (expressions.disgusted > 0.4) return "frustrated"

    return "calm"
  }

  async function startContinuousDetection() {
    setIsDetecting(true)
    setStatus("Analyzing your emotions in real-time...")

    const detect = async () => {
      if (!videoRef.current) return

      const result = await window.faceapi
        .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions()

      if (result) {
        const detected = mapExpressionsToMood(result.expressions)
        const confidence = Math.max(...Object.values(result.expressions)) * 100

        setMood(detected)
        setMoodConfidence(confidence.toFixed(1))

        const newTracks = playlists[detected] || playlists["calm"]
        if (JSON.stringify(newTracks) !== JSON.stringify(tracks)) {
          setTracks(newTracks)
          setStatus(`Mood detected: ${detected} (${confidence.toFixed(0)}% confidence)`)
        }

        if (canvasRef.current) {
          const canvas = canvasRef.current
          const displaySize = { width: 640, height: 480 }
          window.faceapi.matchDimensions(canvas, displaySize)
          const resizedDetections = window.faceapi.resizeResults(result, displaySize)
          const ctx = canvas.getContext("2d")
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          window.faceapi.draw.drawDetections(canvas, resizedDetections)
        }
      } else {
        setStatus("No face detected. Please face the camera.")
      }
    }

    intervalRef.current = setInterval(detect, 1000)
  }

  function stopDetection() {
    setIsDetecting(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setStatus('Detection paused. Click "Start Detection" to resume.')
  }

  function playTrack(track) {
    if (playing) playing.stop()

    const sound = new Howl({
      src: [track.url],
      html5: true,
      onend: () => {
        setCurrentTrack(null)
        setPlaying(null)
      },
    })

    sound.play()
    setPlaying(sound)
    setCurrentTrack(track)
  }

  function stopTrack() {
    if (playing) {
      playing.stop()
      setPlaying(null)
      setCurrentTrack(null)
    }
  }

  function getMoodEmoji(moodType) {
    const emojis = {
      happy: "😊",
      sad: "😢",
      angry: "😠",
      anxious: "😰",
      energetic: "⚡",
      frustrated: "😤",
      calm: "😌",
    }
    return emojis[moodType] || "🎭"
  }

  function getMoodColor(moodType) {
    const colors = {
      happy: "#FFD700",
      sad: "#4A90E2",
      angry: "#E74C3C",
      anxious: "#9B59B6",
      energetic: "#FF6B6B",
      frustrated: "#E67E22",
      calm: "#1DB954",
    }
    return colors[moodType] || "#1DB954"
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🎵</span>
          <h1>MoodTune AI</h1>
        </div>
        <p className="tagline">Real-time emotion detection for personalized music therapy</p>
      </header>

      <main className="main">
        <section className="video-panel">
          <div className="video-container">
            <video ref={videoRef} autoPlay muted playsInline className="webcam" />
            <canvas ref={canvasRef} className="overlay-canvas" width="640" height="480" />

            {mood && (
              <div className="mood-overlay" style={{ borderColor: getMoodColor(mood) }}>
                <div className="mood-display">
                  <span className="mood-emoji">{getMoodEmoji(mood)}</span>
                  <span className="mood-text">{mood.toUpperCase()}</span>
                  <span className="confidence">{moodConfidence}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="controls">
            {!isDetecting ? (
              <button onClick={startContinuousDetection} className="btn primary pulse">
                <span className="btn-icon">🎯</span> Start Detection
              </button>
            ) : (
              <button onClick={stopDetection} className="btn secondary">
                <span className="btn-icon">⏸</span> Pause Detection
              </button>
            )}
          </div>

          <p className="status-text">{status}</p>

          {Object.keys(expressions).length > 0 && (
            <div className="emotion-bars">
              <h3>Emotion Analysis</h3>
              {Object.entries(expressions)
                .sort((a, b) => b[1] - a[1])
                .map(([emotion, value]) => (
                  <div key={emotion} className="emotion-bar">
                    <span className="emotion-label">{emotion}</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${value * 100}%`,
                          backgroundColor: getMoodColor(mood),
                        }}
                      />
                    </div>
                    <span className="emotion-value">{(value * 100).toFixed(0)}%</span>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="playlist-panel">
          <div className="playlist-header">
            <h2>
              {mood ? (
                <>
                  <span className="mood-emoji-large">{getMoodEmoji(mood)}</span>
                  Your {mood.charAt(0).toUpperCase() + mood.slice(1)} Playlist
                </>
              ) : (
                "Your Personalized Playlist"
              )}
            </h2>
            <p className="playlist-subtitle">
              {tracks.length > 0
                ? `${tracks.length} tracks curated for your mood`
                : "Start detection to discover music for your current emotion"}
            </p>
          </div>

          {currentTrack && (
            <div className="now-playing" style={{ borderLeftColor: getMoodColor(mood) }}>
              <div className="now-playing-info">
                <span className="playing-indicator">▶ Now Playing</span>
                <h3>{currentTrack.title}</h3>
                <p>{currentTrack.artist}</p>
              </div>
              <button onClick={stopTrack} className="btn-stop">
                <span>⏹</span>
              </button>
            </div>
          )}

          {tracks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🎧</span>
              <p>Start mood detection to see your personalized playlist</p>
            </div>
          ) : (
            <ul className="track-list">
              {tracks.map((track, i) => (
                <li
                  key={i}
                  className={`track-item ${currentTrack?.title === track.title ? "active" : ""}`}
                  style={{
                    borderLeftColor: currentTrack?.title === track.title ? getMoodColor(mood) : "transparent",
                  }}
                >
                  <div className="track-info">
                    <span className="track-number">{i + 1}</span>
                    <div className="track-details">
                      <strong className="track-title">{track.title}</strong>
                      <span className="track-artist">{track.artist}</span>
                    </div>
                  </div>
                  <button
                    className="btn-play"
                    onClick={() => playTrack(track)}
                    disabled={currentTrack?.title === track.title}
                  >
                    {currentTrack?.title === track.title ? "▶" : "▷"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Powered by face-api.js emotion recognition • Designed for music therapy & mood discovery</p>
      </footer>
    </div>
  )
}
