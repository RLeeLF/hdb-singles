import React, { useState } from 'react';
import { TOWN_CLUSTER_LOOKUP, APP_START_PSF_DATA, APP_GROWTH_DATA } from '../data/hdbData';
import { MapPin, Search, Plus, Check, TrendingUp, DollarSign } from 'lucide-react';

interface TownHeatmapExplorerProps {
  selectedTowns: string[];
  setSelectedTowns: (towns: string[]) => void;
}

export const TownHeatmapExplorer: React.FC<TownHeatmapExplorerProps> = ({
  selectedTowns,
  setSelectedTowns
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');

  const filteredTowns = TOWN_CLUSTER_LOOKUP.filter((t) => {
    const matchesSearch = t.town.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === 'ALL' || t.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const toggleTown = (townName: string) => {
    if (selectedTowns.includes(townName)) {
      if (selectedTowns.length > 1) {
        setSelectedTowns(selectedTowns.filter((t) => t !== townName));
      }
    } else {
      setSelectedTowns([...selectedTowns, townName]);
    }
  };

  return (
    <div className="bg-white border-4 border-[#1a1a1a] p-6 shadow-[5px_5px_0px_0px_#1a1a1a] space-y-6 text-[#1a1a1a]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-4 border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a]">
            <MapPin className="w-8 h-8 text-[#ff4b00]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff4b00]">GEOGRAPHIC ANALYTICS</span>
            <h3 className="text-xl sm:text-2xl font-[900] uppercase tracking-tight text-[#1a1a1a]">HDB TOWN PSF & GROWTH EXPLORER</h3>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mt-0.5">
              Empirical price per sqft (PSF) & growth vectors across all 26 HDB towns.
            </p>
          </div>
        </div>

        {/* Region Filter */}
        <div className="flex flex-wrap gap-1 text-xs">
          {['ALL', 'North', 'South', 'East', 'West', 'Central', 'North-East'].map((reg) => (
            <button
              key={reg}
              onClick={() => setRegionFilter(reg)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-[#1a1a1a] transition-all ${
                regionFilter === reg
                  ? 'bg-[#ff4b00] text-white'
                  : 'bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#1a1a1a] absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="FILTER TOWNS (E.G. QUEENSTOWN, JURONG EAST)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-[#fcfaf7] border-2 border-[#1a1a1a] pl-10 pr-4 py-2.5 text-[#1a1a1a] font-bold placeholder-gray-500 focus:outline-none focus:border-[#ff4b00]"
        />
      </div>

      {/* Towns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTowns.map((item) => {
          const isSelected = selectedTowns.includes(item.town);
          // Fetch PSF & Growth sample for 4-Room in this group
          const psfRow = APP_START_PSF_DATA.find((p) => p.townGroup === item.townGroup && p.flatType === '4_ROOM');
          const growthRow = APP_GROWTH_DATA.find((g) => g.townGroup === item.townGroup && g.flatTypeClean === '4_ROOM');

          const samplePsf = psfRow ? psfRow.predictedStartPsf : 600;
          const sampleGrowth = growthRow ? growthRow.centralGrowthAnnual : 0.015;

          return (
            <div
              key={item.town}
              onClick={() => toggleTown(item.town)}
              className={`p-4 border-2 border-[#1a1a1a] transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-[#1a1a1a] text-white shadow-[4px_4px_0px_0px_#ff4b00]'
                  : 'bg-[#fcfaf7] text-[#1a1a1a] hover:bg-gray-100 shadow-[3px_3px_0px_0px_#1a1a1a]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase">{item.town}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${
                      isSelected ? 'bg-[#ff4b00] text-white border-[#ff4b00]' : 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    }`}>
                      G{item.townGroup}
                    </span>
                  </div>
                  <div className={`text-[10px] font-bold uppercase mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {item.region} REGION
                  </div>
                </div>

                <button
                  className={`p-1.5 border-2 border-[#1a1a1a] text-xs font-black transition-all ${
                    isSelected
                      ? 'bg-[#ff4b00] text-white border-white'
                      : 'bg-white text-[#1a1a1a]'
                  }`}
                >
                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              <p className={`text-[11px] font-semibold leading-snug line-clamp-2 uppercase ${isSelected ? 'text-gray-300' : 'text-gray-600'}`}>
                {item.description}
              </p>

              <div className={`pt-2 border-t-2 ${isSelected ? 'border-gray-700' : 'border-[#1a1a1a]'} flex items-center justify-between text-xs`}>
                <div>
                  <div className={`text-[9px] font-black uppercase ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>Est. 4-Room PSF</div>
                  <div className="font-mono font-black">${samplePsf}/sqft</div>
                </div>

                <div className="text-right">
                  <div className={`text-[9px] font-black uppercase ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>4-Room Growth</div>
                  <div
                    className={`font-mono font-black flex items-center gap-0.5 ${
                      isSelected ? 'text-[#ff4b00]' : 'text-[#ff4b00]'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {(sampleGrowth * 100).toFixed(2)}% p.a.
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

