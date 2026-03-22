import { useState } from "react";
import { Search, Filter, Download } from "lucide-react";

const MOCK_LOGS = [
  { id: "LOG-9921", admin: "Super Admin", action: "Approved Withdrawal #WD-551", ip: "192.168.1.1", date: "2026-03-19 14:30:12" },
  { id: "LOG-9920", admin: "Finance Manager", action: "Rejected Deposit #DEP-1022", ip: "10.0.0.5", date: "2026-03-19 13:45:00" },
  { id: "LOG-9919", admin: "Super Admin", action: "Changed Platform Setting: Min Trade = $1", ip: "192.168.1.1", date: "2026-03-18 09:12:44" },
];

const AuditLogs = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-sm text-gray-400 mt-1">Immutable tracking of all administrative actions securely logged.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1A1F26] hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
          <Download size={16} /> Export Logs
        </button>
      </div>
      
      <div className="bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1A1F26]">
          <div className="flex items-center gap-4 w-full">
            <div className="flex gap-2 relative w-full max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
               <input type="text" placeholder="Search logs..." className="w-full bg-[#0b0e14] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="flex relative items-center">
              <Filter className="absolute left-3 text-gray-500 w-4 h-4 pointer-events-none" />
              <select className="bg-[#0b0e14] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none focus:outline-none focus:border-blue-500 transition-colors">
                <option>All Actions</option>
                <option>Finance</option>
                <option>Settings</option>
                <option>Users</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-[#11161d] text-gray-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-3 font-semibold">Log ID</th>
                <th className="px-6 py-3 font-semibold">Admin / IP</th>
                <th className="px-6 py-3 font-semibold">Action Detail</th>
                <th className="px-6 py-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {MOCK_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-gray-500">{log.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{log.admin}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5 whitespace-nowrap">{log.ip}</div>
                  </td>
                  <td className="px-6 py-4 text-blue-200">{log.action}</td>
                  <td className="px-6 py-4 font-mono text-gray-400 whitespace-nowrap">{log.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
