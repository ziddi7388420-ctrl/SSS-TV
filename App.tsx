import React, { useState } from 'react';
import Header from './components/Header';
import ChannelList from './components/ChannelList';
import VideoPlayer from './components/VideoPlayer';
import { CHANNELS } from './constants';
import type { Channel } from './types';

const App: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(CHANNELS[0]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <Header />
      <div className="sticky top-0 z-10 bg-black shadow-lg shadow-cyan-400/20">
        {selectedChannel ? (
          <VideoPlayer 
            key={selectedChannel.url} 
            channel={selectedChannel}
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
            onSelectChannel={setSelectedChannel}
          />
      </main>
    </div>
  );
};

export default App;