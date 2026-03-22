import { Search, ChevronRight, FileText, PlayCircle, MessageCircle } from "lucide-react";

export const WorkspaceHelp = () => {
  const FAQS = [
    "How to verify my account?",
    "Withdrawal methods and limits",
    "How to trade Options?",
    "What is the VIP status?",
  ];

  return (
    <div className="w-full h-full text-white flex flex-col">
      <div className="p-6 bg-gradient-to-b from-[#1A1F26] to-transparent">
        <h2 className="text-[20px] font-bold mb-4">Hello, how can we help?</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search for answers..." 
            className="w-full bg-[#ffffff0a] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-[14px] text-white focus:outline-none focus:border-[#0b65c2] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 space-y-6 no-scrollbar">
        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button className="bg-[#1A1F26] border border-white/5 rounded-xl p-4 flex flex-col hover:border-white/20 transition-all text-left">
            <FileText className="w-5 h-5 text-blue-400 mb-2" />
            <div className="text-[13px] font-bold">Trading Guide</div>
          </button>
          <button className="bg-[#1A1F26] border border-white/5 rounded-xl p-4 flex flex-col hover:border-white/20 transition-all text-left">
            <PlayCircle className="w-5 h-5 text-orange-400 mb-2" />
            <div className="text-[13px] font-bold">Video Tutorials</div>
          </button>
        </div>

        {/* Popular Articles */}
        <div>
          <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">Popular Articles</h3>
          <div className="bg-[#1A1F26] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {FAQS.map((q, i) => (
              <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left group">
                <span className="text-[13px] text-gray-300 group-hover:text-white transition-colors">{q}</span>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Need More Help */}
        <div>
          <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">Need More Help?</h3>
          <button className="w-full bg-[#0b65c2] hover:bg-[#094e96] text-white rounded-xl p-4 flex items-center justify-center gap-2 font-bold text-[14px] transition-colors shadow-lg">
            <MessageCircle className="w-5 h-5" /> Chat with Support Array
          </button>
        </div>
      </div>
    </div>
  );
};
