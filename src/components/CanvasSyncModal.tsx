import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { useDashboardStore } from '../store/useDashboardStore';
import { parseIcsContent, ParsedIcsEvent } from '../lib/ics-parser';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface CanvasSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanvasSyncModal: React.FC<CanvasSyncModalProps> = ({ isOpen, onClose }) => {
  const { canvasIcsUrl, setCanvasIcsUrl, importCanvasEvents } = useDashboardStore();

  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'paste'>('url');
  const [urlInput, setUrlInput] = useState(canvasIcsUrl || '');
  const [pastedIcs, setPastedIcs] = useState('');
  const [parsedEvents, setParsedEvents] = useState<ParsedIcsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleSyncUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your Canvas calendar feed URL.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/fetch-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icsUrl: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const events = parseIcsContent(data.icsContent);
      if (events.length === 0) {
        setStatusMessage({
          type: 'info',
          text: 'Feed connected, but no upcoming calendar events or assignments were found in the feed.',
        });
      } else {
        setParsedEvents(events);
        setCanvasIcsUrl(urlInput.trim());
        setStatusMessage({
          type: 'success',
          text: `Successfully synced ${events.length} active assessments and schedule items from Canvas!`,
        });
      }
    } catch (err: any) {
      console.error('Canvas sync error:', err);
      setStatusMessage({
        type: 'error',
        text:
          err?.message ||
          'Failed to pull Canvas calendar. Ensure you copied the private Calendar Feed URL from Canvas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const text = await file.text();
      const events = parseIcsContent(text);
      if (events.length === 0) {
        setStatusMessage({
          type: 'info',
          text: 'The file was read, but no upcoming assessment events were recognized.',
        });
      } else {
        setParsedEvents(events);
        setStatusMessage({
          type: 'success',
          text: `Loaded ${events.length} events from ${file.name}!`,
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: 'Failed to read the .ics file. Please check the file format.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedIcs.trim()) return;

    const events = parseIcsContent(pastedIcs);
    if (events.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'No valid VEVENT records found in the pasted text.',
      });
    } else {
      setParsedEvents(events);
      setStatusMessage({
        type: 'success',
        text: `Extracted ${events.length} calendar events!`,
      });
    }
  };

  const handleImportToDashboard = () => {
    if (parsedEvents.length === 0) return;
    importCanvasEvents(parsedEvents);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Canvas LMS Calendar Sync"
      description="Connect your Canvas calendar to pull assignment due dates and lab checkpoints into your dashboard."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Method Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'url'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Live Feed URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'file'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Upload .ics File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'paste'
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Paste Calendar Text
          </button>
        </div>

        {/* Tab 1: Live Feed URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleSyncUrl} className="space-y-3">
            <div>
              <label className="text-xs font-mono text-zinc-700 dark:text-zinc-300 block mb-1">
                Canvas iCalendar (.ics) Feed URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://canvas.sydney.edu.au/feeds/calendars/user_xxxxx.ics"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
                <button
                  type="submit"
                  disabled={isLoading || !urlInput.trim()}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Pulling...</span>
                    </>
                  ) : (
                    <span>Pull Feed</span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                Where to get your link in Canvas:
              </p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Log into Canvas and click <strong>Calendar</strong> on the left bar.</li>
                <li>Scroll to the bottom right and click <strong>Calendar Feed</strong>.</li>
                <li>Copy the URL link (starts with <code>https://</code> or <code>webcal://</code>) and paste it above.</li>
              </ol>
            </div>
          </form>
        )}

        {/* Tab 2: Upload File */}
        {activeTab === 'file' && (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-6 text-center hover:border-zinc-400 transition-colors">
              <input
                type="file"
                id="canvas-ics-file"
                accept=".ics,text/calendar"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="canvas-ics-file"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-zinc-600 dark:text-zinc-300">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Upload downloaded .ics calendar file
                </span>
                <span className="text-[11px] font-mono text-zinc-400 mt-1">
                  Click to browse from your computer
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Paste Text */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-3">
            <textarea
              rows={5}
              placeholder="Paste raw BEGIN:VCALENDAR ... END:VCALENDAR content here"
              value={pastedIcs}
              onChange={(e) => setPastedIcs(e.target.value)}
              className="w-full p-2.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!pastedIcs.trim()}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                Parse Calendar Text
              </button>
            </div>
          </form>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Calendar className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Parsed Events Preview */}
        {parsedEvents.length > 0 && (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Discovered Assessment Due Dates ({parsedEvents.length})
              </span>
              <span className="text-[11px] font-mono text-zinc-400">Ready to Import</span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-56 overflow-y-auto">
              {parsedEvents.map((evt) => (
                <div key={evt.id} className="p-3 text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {evt.unitCode && (
                        <span className="font-mono font-bold px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-900 dark:text-zinc-100">
                          {evt.unitCode}
                        </span>
                      )}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {evt.summary}
                      </span>
                      {evt.tag && (
                        <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {evt.tag}
                        </span>
                      )}
                    </div>
                    {evt.description && (
                      <p className="text-zinc-500 text-[11px] mt-0.5 line-clamp-1">
                        {evt.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 font-medium shrink-0">
                    {evt.dueDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-700"
          >
            Close
          </button>
          {parsedEvents.length > 0 && (
            <button
              type="button"
              onClick={handleImportToDashboard}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Import {parsedEvents.length} Events to Timeline</span>
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
};
