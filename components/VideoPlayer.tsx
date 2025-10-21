import React, { useEffect, useRef, useState, ChangeEvent, useCallback } from 'react';
import { ArrowsPointingInIcon, ArrowsPointingOutIcon, PauseIcon, PlayIcon, SpeakerWaveIcon, SpeakerXMarkIcon, LiveIcon, CogIcon, PictureInPictureIcon } from './Icons';
import type { Channel } from '../types';

declare const Hls: any;

interface VideoPlayerProps {
  channel: Channel;
}

interface HlsLevel {
  height: number;
  bitrate: number;
}

const MAX_HLS_RETRIES = 5;
const HLS_RETRY_DELAY = 1000;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ channel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const hlsRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const lastVolumeRef = useRef(1);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [retryVersion, setRetryVersion] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isInPiP, setIsInPiP] = useState(false);

  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);
  const [currentHlsLevelIndex, setCurrentHlsLevelIndex] = useState(-1);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  const src = channel.url;
  
  useEffect(() => {
    setIsPiPSupported('pictureInPictureEnabled' in document && document.pictureInPictureEnabled);
  }, []);

  useEffect(() => {
    setRetryVersion(0);
    retryCountRef.current = 0;
    setError(null);
    setHlsLevels([]);
    setCurrentHlsLevelIndex(-1);
  }, [src]);

  const hideControls = () => {
    if (isPlaying && !isSettingsMenuOpen) {
      setAreControlsVisible(false);
    }
  };

  const showControls = () => {
    setAreControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(hideControls, 3500);
  };
  
  const togglePlayPause = useCallback(() => {
    setIsSettingsMenuOpen(false);
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      // State update is handled by the 'volumechange' event listener
    }
  }, []);
  
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    // State update is handled by the 'volumechange' event listener
  };

  const toggleFullscreen = useCallback(() => {
    setIsSettingsMenuOpen(false);
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);
  
  const togglePiP = useCallback(async () => {
    if (!videoRef.current || !isPiPSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP Error:", err);
    }
  }, [isPiPSupported]);


  const toggleSettingsMenu = () => {
    setIsSettingsMenuOpen(prev => !prev);
    showControls(); // Keep controls visible when menu is open
  };

  const handleQualityChange = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentHlsLevelIndex(levelIndex);
      setIsSettingsMenuOpen(false);
    }
  };
  
  useEffect(() => {
    const initializePlayer = () => {
      if (videoRef.current) {
        if (Hls.isSupported()) {
          const hls = new Hls({
             maxMaxBufferLength: 30,
             maxBufferSize: 60 * 1000 * 1000,
          });
          hlsRef.current = hls;

          hls.loadSource(src);
          hls.attachMedia(videoRef.current);
          
          hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
            setError(null);
            setIsBuffering(true);
            retryCountRef.current = 0;
            if (data.levels.length > 1) {
              setHlsLevels(data.levels);
            }
            videoRef.current?.play().catch(() => {
              setIsPlaying(false);
              setIsBuffering(false);
            });
          });
          
          hls.on(Hls.Events.LEVEL_SWITCHED, (_:any, data:any) => {
            setCurrentHlsLevelIndex(data.level);
          });
          
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              if (retryCountRef.current < MAX_HLS_RETRIES) {
                retryCountRef.current++;
                setError(`Stream interrupted. Reconnecting... (${retryCountRef.current}/${MAX_HLS_RETRIES})`);
                setTimeout(() => setRetryVersion(v => v + 1), HLS_RETRY_DELAY * retryCountRef.current);
              } else {
                 setError(`Unable to load stream. Please select another channel.`);
              }
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = src;
        }
        showControls();
      }
    };
    initializePlayer();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [src, retryVersion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => { setIsPlaying(true); setIsBuffering(false); showControls(); };
    const handlePause = () => {
        setIsPlaying(false);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        setAreControlsVisible(true);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleVolumeSync = () => {
      if (video) {
        const currentMuted = video.muted || video.volume === 0;
        setIsMuted(currentMuted);
        setVolume(video.muted ? 0 : video.volume);
        if(!currentMuted) lastVolumeRef.current = video.volume;
      }
    };
    
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    const handleEnterPiP = () => setIsInPiP(true);
    const handleLeavePiP = () => setIsInPiP(false);
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('volumechange', handleVolumeSync);
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    const progressInterval = setInterval(() => {
      if (video && video.buffered.length > 0 && isPlaying) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        const liveEdge = bufferEnd - 5;
        if (video.currentTime < liveEdge && video.currentTime > 0) {
            video.currentTime = liveEdge;
        }
        const bufferStart = video.buffered.start(video.buffered.length - 1);
        const duration = bufferEnd - bufferStart;
        if (duration > 0) {
          setProgress(((video.currentTime - bufferStart) / duration) * 100);
        } else {
          setProgress(0);
        }
      }
    }, 1000);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('volumechange', handleVolumeSync);
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(progressInterval);
    };
  }, [isPlaying, isSettingsMenuOpen]);

  const changeVolume = useCallback((delta: number) => {
    if (videoRef.current) {
        const newVolume = Math.max(0, Math.min(1, videoRef.current.volume + delta));
        videoRef.current.volume = newVolume;
        if (newVolume > 0 && videoRef.current.muted) {
            videoRef.current.muted = false;
        }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            return;
        }
        switch (e.code) {
            case 'Space': e.preventDefault(); togglePlayPause(); break;
            case 'KeyM': e.preventDefault(); toggleMute(); break;
            case 'KeyF': e.preventDefault(); toggleFullscreen(); break;
            case 'ArrowUp': case 'ArrowRight': e.preventDefault(); changeVolume(0.05); break;
            case 'ArrowDown': case 'ArrowLeft': e.preventDefault(); changeVolume(-0.05); break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, toggleMute, toggleFullscreen, changeVolume]);
  
  return (
    <div
      ref={containerRef}
      className="group w-full aspect-video bg-black relative select-none"
      onMouseMove={showControls}
      onMouseLeave={hideControls}
      onClick={togglePlayPause}
    >
      <video ref={videoRef} className="w-full h-full" playsInline autoPlay />

      <div className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity duration-300 pointer-events-none ${isBuffering || error ? 'opacity-100' : 'opacity-0'}`}>
         {error ? (
           <div className="text-center p-4">
             <p className="text-lg">{error}</p>
             {retryCountRef.current < MAX_HLS_RETRIES && !error.includes('another channel') && (
               <div className="w-12 h-12 border-4 border-t-cyan-400 border-gray-600 rounded-full animate-spin mx-auto mt-4"></div>
             )}
           </div>
         ) : (
           <div className="w-16 h-16 border-4 border-t-cyan-400 border-gray-600 rounded-full animate-spin"></div>
         )}
      </div>
      
      {!isPlaying && areControlsVisible && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button onClick={e => { e.stopPropagation(); togglePlayPause(); }} className="p-4 bg-black/50 rounded-full text-white hover:bg-cyan-500/80 transition-all duration-200 scale-150 pointer-events-auto" aria-label="Play">
              <PlayIcon className="w-12 h-12"/>
          </button>
        </div>
      )}

      <div 
        className={`absolute inset-0 z-20 transition-opacity duration-300 ${areControlsVisible ? 'opacity-100' : 'opacity-0'} ${isInPiP ? 'hidden' : ''}`}
        onClick={e => e.stopPropagation()}
       >
        {/* Top Info Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={channel.logo} alt="" className="h-10 w-10 rounded-full bg-gray-700 object-cover" />
              <span className="text-lg font-bold text-shadow-md">{channel.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-500 font-bold text-sm bg-black/50 px-2 py-1 rounded">
              <LiveIcon className="w-2.5 h-2.5 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="relative w-full mb-2">
            <div className="absolute w-full h-1.5 top-1/2 -translate-y-1/2 bg-white/20 rounded-full">
               <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-white">
            {/* Left Controls */}
            <div className="flex items-center gap-4">
              <button onClick={togglePlayPause} className="hover:text-cyan-400 transition-colors" aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
              </button>
              <div className="flex items-center group/volume gap-2">
                <button onClick={toggleMute} className="hover:text-cyan-400 transition-colors" aria-label={isMuted ? "Unmute" : "Mute"}>
                  {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-7 h-7" /> : <SpeakerWaveIcon className="w-7 h-7" />}
                </button>
                <div className="w-0 group-hover/volume:w-24 transition-all duration-300">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="player-range h-1.5 w-full"
                    aria-label="Volume"
                  />
                </div>
              </div>
            </div>
            {/* Right Controls */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {isSettingsMenuOpen && hlsLevels.length > 0 && (
                  <div className="absolute bottom-full right-0 mb-4 bg-black/80 backdrop-blur-sm rounded-lg p-2 text-sm w-32">
                    <h4 className="text-gray-400 text-xs font-bold px-2 pb-1 uppercase">Quality</h4>
                    <ul>
                      <li key="auto">
                        <button onClick={() => handleQualityChange(-1)} className={`w-full text-left px-2 py-1.5 rounded-md hover:bg-white/10 ${currentHlsLevelIndex === -1 ? 'font-bold text-cyan-400' : ''}`}>
                          Auto
                        </button>
                      </li>
                      {hlsLevels.map((level, index) => (
                        <li key={level.height}>
                           <button onClick={() => handleQualityChange(index)} className={`w-full text-left px-2 py-1.5 rounded-md hover:bg-white/10 ${currentHlsLevelIndex === index ? 'font-bold text-cyan-400' : ''}`}>
                              {level.height}p
                           </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hlsLevels.length > 0 && (
                  <button onClick={toggleSettingsMenu} className="hover:text-cyan-400 transition-colors" aria-label="Settings">
                    <CogIcon className={`w-7 h-7 transition-transform duration-300 ${isSettingsMenuOpen ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>
               {isPiPSupported && (
                <button onClick={togglePiP} className="hover:text-cyan-400 transition-colors" aria-label="Picture in Picture">
                  <PictureInPictureIcon className="w-7 h-7" />
                </button>
              )}
              <button onClick={toggleFullscreen} className="hover:text-cyan-400 transition-colors" aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                {isFullscreen ? <ArrowsPointingInIcon className="w-7 h-7" /> : <ArrowsPointingOutIcon className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;