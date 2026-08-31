import React, { useState } from "react";
import { FileSpreadsheet, Download, ShieldCheck, Search, CheckCircle2, Clock, DollarSign, Check, Trash2, PieChart, XCircle, FileText } from "lucide-react";
import { BatchLogItem } from "../types";

interface BatchAuditLedgerProps {
  logs: BatchLogItem[];
  onToggleComplete: (logId: string) => void;
  onMarkShredded?: (logId: string) => void;
  onDeleteLog?: (logId: string) => void;
  onClearAllLogs?: () => void;
  onDownloadPdf?: (log: BatchLogItem) => void;
}

export const BatchAuditLedger: React.FC<BatchAuditLedgerProps> = ({
  logs,
  onToggleComplete,
  onMarkShredded,
  onDeleteLog,
  onClearAllLogs,
  onDownloadPdf,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "shredded">("all");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.issuer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.station_prefix.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? log.status === "active" || !log.status
        : statusFilter === "completed"
        ? log.status === "completed"
        : log.status === "shredded";

    if (selectedMonth === "all") return matchesSearch && matchesStatus;
    const logMonth = new Date(log.printed_at).toISOString().substring(0, 7);
    return matchesSearch && matchesStatus && logMonth === selectedMonth;
  });

  // Calculate Active Total Value (EXCLUDING Destroyed/Shredded Batches)
  const activeLogs = filteredLogs.filter((item) => item.status !== "shredded");
  const totalValueActive = activeLogs.reduce((sum, item) => sum + item.drawer_amount, 0);

  const completedBatchesCount = logs.filter((l) => l.status === "completed").length;
  const shreddedBatchesCount = logs.filter((l) => l.status === "shredded").length;
  const activeBatchesCount = logs.filter((l) => l.status === "active" || !l.status).length;

  const totalCount = logs.length || 1;
  const completedPct = Math.round((completedBatchesCount / totalCount) * 100);
  const activePct = Math.round((activeBatchesCount / totalCount) * 100);
  const shreddedPct = Math.round((shreddedBatchesCount / totalCount) * 100);

  const exportMonthlyCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No logs available to export.");
      return;
    }

    const headers = [
      "Log ID",
      "Timestamp",
      "Batch Status",
      "Status Date",
      "Batch ID",
      "Station",
      "Issuer Name",
      "Issuer Role",
      "Department",
      "Mode",
      "Total Amount ($)",
      "Total Bills",
      "$20 Bills",
      "$10 Bills",
      "$5 Bills",
      "$1 Bills",
      "Serial Range",
      "Issue Reason",
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.id}"`,
      `"${new Date(log.printed_at).toLocaleString()}"`,
      `"${log.status === "completed" ? "Completed & Collected" : log.status === "shredded" ? "Shredded / Destroyed" : "Active in Circulation"}"`,
      `"${log.completed_at ? new Date(log.completed_at).toLocaleString() : log.shredded_at ? new Date(log.shredded_at).toLocaleString() : "N/A"}"`,
      `"${log.batch_id}"`,
      `"${log.station_prefix}"`,
      `"${log.issuer_name}"`,
      `"${log.issuer_role}"`,
      `"${log.department}"`,
      `"${log.mode}"`,
      log.drawer_amount.toFixed(2),
      log.total_bills_count,
      log.itemized_breakdown.bill20,
      log.itemized_breakdown.bill10,
      log.itemized_breakdown.bill5,
      log.itemized_breakdown.bill1,
      `"${log.serial_start} - ${log.serial_end}"`,
      `"${log.issue_reason}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    const monthStr = selectedMonth === "all" ? "All_Months" : selectedMonth;
    link.setAttribute("download", `DartBucks_Monthly_Audit_Log_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8 bg-card p-6 rounded-2xl border border-border shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            Department Allotment & Shred Destruction Audit Ledger
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track department allocations, register turn-ins, download stored PDF documents, and record unused bills sent to the DART Shredding Department.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onClearAllLogs && logs.length > 0 && (
            <button
              onClick={onClearAllLogs}
              className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold px-3.5 py-2.5 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear Test Logs
            </button>
          )}

          <button
            onClick={exportMonthlyCSV}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            Export Monthly Audit Log (.CSV)
          </button>
        </div>
      </div>

      {/* Circulation Lifecycle Progress Bar */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-2">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="flex items-center gap-1.5 text-foreground">
            <PieChart className="w-4 h-4 text-primary" />
            Currency Circulation Lifecycle Breakdown
          </span>
          <span className="text-muted-foreground">{logs.length} Batches Total</span>
        </div>

        {/* Multi-Segment Bar */}
        <div className="h-3 w-full bg-background rounded-full overflow-hidden flex border border-input">
          <div style={{ width: `${completedPct}%` }} className="bg-emerald-500 transition-all" title={`Collected: ${completedPct}%`} />
          <div style={{ width: `${activePct}%` }} className="bg-amber-500 transition-all" title={`Active: ${activePct}%`} />
          <div style={{ width: `${shreddedPct}%` }} className="bg-red-500 transition-all" title={`Shredded: ${shreddedPct}%`} />
        </div>

        <div className="flex justify-between text-[11px] font-semibold pt-1">
          <span className="text-emerald-600 dark:text-emerald-400">● Collected at Register: {completedPct}% ({completedBatchesCount})</span>
          <span className="text-amber-600 dark:text-amber-400">● Active in Field: {activePct}% ({activeBatchesCount})</span>
          <span className="text-red-600 dark:text-red-400">● Shredded / Destroyed: {shreddedPct}% ({shreddedBatchesCount})</span>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Active Value in Circulation</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ${totalValueActive.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              (Excludes Destroyed & Shredded Batches)
            </span>
          </div>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-blue-600 shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Register Turn-Ins Completed</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {completedBatchesCount} / {logs.length} Batches
            </span>
          </div>
        </div>

        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <Trash2 className="w-8 h-8 text-red-600 shrink-0" />
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Shredded / Destroyed</span>
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {shreddedBatchesCount} Batches
            </span>
          </div>
        </div>
      </div>

      {/* Filter Controls & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        <div className="flex gap-1 bg-muted p-1 rounded-lg text-xs font-bold w-fit">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Batches ({logs.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "active"
                ? "bg-background text-foreground shadow text-amber-600 dark:text-amber-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active In Circulation ({activeBatchesCount})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "completed"
                ? "bg-background text-foreground shadow text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed Turn-Ins ({completedBatchesCount})
          </button>
          <button
            onClick={() => setStatusFilter("shredded")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "shredded"
                ? "bg-background text-foreground shadow text-red-600 dark:text-red-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Shredded ({shreddedBatchesCount})
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Issuer, Department..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-input rounded-lg"
            />
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs bg-background border border-input rounded-lg font-semibold"
          >
            <option value="all">All Months</option>
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
            <option value="2026-05">May 2026</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted text-muted-foreground font-bold border-b border-border">
            <tr>
              <th className="p-3">Batch Status</th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Batch ID</th>
              <th className="p-3">Authorized Issuer</th>
              <th className="p-3">Department</th>
              <th className="p-3">Drawer Value</th>
              <th className="p-3">Bills Breakdown</th>
              <th className="p-3 text-right">Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground italic">
                  No print batch logs found matching your filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isCompleted = log.status === "completed";
                const isShredded = log.status === "shredded";

                return (
                  <tr key={log.id} className={`hover:bg-muted/50 transition-colors ${isCompleted ? "bg-emerald-500/5" : isShredded ? "bg-red-500/5 line-through opacity-70" : ""}`}>
                    <td className="p-3 whitespace-nowrap">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Collected at Register
                        </span>
                      ) : isShredded ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 bg-red-500/10 text-red-600 rounded-full border border-red-500/30">
                          <Trash2 className="w-3.5 h-3.5" />
                          Shredded / Destroyed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" />
                          Active in Circulation
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.printed_at).toLocaleDateString()} {new Date(log.printed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono font-bold text-primary">
                      {log.batch_id}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-foreground">{log.issuer_name}</span>
                      <span className="block text-[10px] text-muted-foreground">{log.issuer_role}</span>
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {log.department}
                    </td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      ${log.drawer_amount.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      20s:{log.itemized_breakdown.bill20} | 10s:{log.itemized_breakdown.bill10} | 5s:{log.itemized_breakdown.bill5} | 1s:{log.itemized_breakdown.bill1}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {log.pdf_url && !isShredded && onDownloadPdf && (
                          <button
                            onClick={() => onDownloadPdf(log)}
                            title="Re-Download Stored Prepress PDF Document"
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/30 transition-all flex items-center gap-1 font-bold text-[11px]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        )}

                        <button
                          onClick={() => onToggleComplete(log.id)}
                          className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                            isCompleted
                              ? "bg-muted text-muted-foreground border border-input hover:bg-background"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          {isCompleted ? "Reopen" : "Turned In"}
                        </button>

                        {onMarkShredded && !isCompleted && (
                          <button
                            onClick={() => onMarkShredded(log.id)}
                            className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                              isShredded
                                ? "bg-muted text-muted-foreground border border-input"
                                : "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30"
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            {isShredded ? "Shredded" : "Shred Unused"}
                          </button>
                        )}

                        {onDeleteLog && (
                          <button
                            onClick={() => onDeleteLog(log.id)}
                            title="Delete Log Entry & PDF Record"
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg border border-red-500/30 transition-all"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
