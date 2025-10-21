import React from 'react';
import type { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({ channels, selectedChannel, onSelectChannel }) => {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
        {channels.map((channel) => {
          const isSelected = selectedChannel?.url === channel.url;
          return (
            <button
              key={channel.name + channel.url}
              onClick={() => onSelectChannel(channel)}
              className="flex flex-col items-center justify-start text-center p-2 rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 group"
              aria-label={`Select channel: ${channel.name}`}
              aria-pressed={isSelected}
            >
              <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                <img
                  src={channel.logo}
                  alt={`${channel.name} logo`}
                  className={`w-full h-full rounded-full object-cover bg-gray-700 ring-4 transition-all duration-300 ${
                    isSelected ? 'ring-cyan-500 scale-105' : 'ring-gray-600 group-hover:ring-cyan-400 group-hover:scale-105'
                  }`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://i.imgur.com/gNf4A4D.png'; // Fallback image
                  }}
                />
              </div>
              <span className={`mt-2 text-xs sm:text-sm break-words w-full transition-colors duration-300 ${isSelected ? 'font-bold text-white' : 'text-gray-300 group-hover:text-white'}`}>
                {channel.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelList;