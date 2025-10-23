import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ChannelList from './components/ChannelList';
import VideoPlayer from './components/VideoPlayer';
import { CHANNELS } from './constants';
import type { Channel } from './types';

const App: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(CHANNELS[0]);

  const handleSelectChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
  }, []);

  const handleNextChannel = useCallback(() => {
    if (!selectedChannel) {
      setSelectedChannel(CHANNELS[0]);
      return;
    }
    const currentIndex = CHANNELS.findIndex(c => c.url === selectedChannel.url);
    const nextIndex = (currentIndex + 1) % CHANNELS.length;
    setSelectedChannel(CHANNELS[nextIndex]);
  }, [selectedChannel]);

  const handlePrevChannel = useCallback(() => {
    if (!selectedChannel) {
      setSelectedChannel(CHANNELS[CHANNELS.length - 1]);
      return;
    }
    const currentIndex = CHANNELS.findIndex(c => c.url === selectedChannel.url);
    const prevIndex = (currentIndex - 1 + CHANNELS.length) % CHANNELS.length;
    setSelectedChannel(CHANNELS[prevIndex]);
  }, [selectedChannel]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <Header />
      <div className="sticky top-0 z-10 bg-black shadow-lg shadow-yellow-400/30 border-2 border-yellow-400 rounded-lg overflow-hidden">
        {selectedChannel ? (
          <VideoPlayer 
            key={selectedChannel.url} 
            channel={selectedChannel}
            onNextChannel={handleNextChannel}
            onPrevChannel={handlePrevChannel}
          />
        ) : (
          <div className="aspect-video w-full flex items-center justify-center bg-black text-gray-500">
            <p>Select a channel to begin.</p>
          </div>
        )}
      </div>
      <main className="flex-1 overflow-y-auto">
          <ChannelList
            channels={CHANNELS}
            selectedChannel={selectedChannel}
            onSelectChannel={handleSelectChannel}
          />
      </main>
    </div>
  );
};

export default App;