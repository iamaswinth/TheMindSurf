"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import {
  Card,
  Input,
  Button,
  Switch,
  Slider,
} from "@/components/ui/Components";
import { MenuIcon, CheckIcon } from "@/components/ui/Icons";

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  // API Settings
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:8000/api/v1");

  // Chat Settings
  const [defaultTemperature, setDefaultTemperature] = useState(0.3);
  const [defaultMaxTokens, setDefaultMaxTokens] = useState(1000);
  const [defaultTopK, setDefaultTopK] = useState(5);
  const [useHybridSearch, setUseHybridSearch] = useState(true);
  const [streamResponses, setStreamResponses] = useState(false);

  // Upload Settings
  const [defaultChunkSize, setDefaultChunkSize] = useState(500);
  const [defaultChunkOverlap, setDefaultChunkOverlap] = useState(50);
  const [extractTables, setExtractTables] = useState(true);

  const handleSave = () => {
    // Save settings to localStorage or API
    localStorage.setItem(
      "ragchat_settings",
      JSON.stringify({
        apiBaseUrl,
        chat: {
          temperature: defaultTemperature,
          maxTokens: defaultMaxTokens,
          topK: defaultTopK,
          useHybridSearch,
          streamResponses,
        },
        upload: {
          chunkSize: defaultChunkSize,
          chunkOverlap: defaultChunkOverlap,
          extractTables,
        },
      })
    );

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-screen bg-[#FFFEF0]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Neo-Brutalist Header */}
        <header
          className="h-20 bg-[#9D00FF] border-b-4 border-black flex items-center px-6"
          style={{ boxShadow: "0 4px 0px #000000" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-12 h-12 bg-black text-white flex items-center justify-center border-4 border-black hover:bg-[#FF006E] transition-colors mr-4"
          >
            <MenuIcon size={20} />
          </button>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            ⚙️ SETTINGS
          </h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* API Configuration */}
            <Card color="white" className="p-0 overflow-hidden">
              <div className="px-6 py-4 bg-[#FF006E] border-b-4 border-black">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  🔗 API CONFIGURATION
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  label="API BASE URL"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="http://localhost:8000/api/v1"
                />
                <div
                  className="p-3 bg-[#00FFFF] border-2 border-black text-sm font-bold text-black"
                  style={{ boxShadow: "2px 2px 0px #000000" }}
                >
                  💡 THE BASE URL FOR YOUR RAG BACKEND API. MAKE SURE YOUR
                  BACKEND SERVER IS RUNNING.
                </div>
              </div>
            </Card>

            {/* Chat Settings */}
            <Card color="white" className="p-0 overflow-hidden">
              <div className="px-6 py-4 bg-[#FFFF00] border-b-4 border-black">
                <h2 className="text-lg font-black text-black uppercase tracking-tight">
                  💬 DEFAULT CHAT SETTINGS
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <Slider
                    label="DEFAULT TEMPERATURE"
                    value={defaultTemperature}
                    onChange={setDefaultTemperature}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="mt-2 text-sm font-bold text-black/60 uppercase">
                    Higher = more creative, Lower = more focused
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-black text-black uppercase tracking-wide mb-2">
                    DEFAULT MAX TOKENS
                  </label>
                  <Input
                    type="number"
                    value={defaultMaxTokens}
                    onChange={(e) =>
                      setDefaultMaxTokens(parseInt(e.target.value))
                    }
                  />
                </div>

                <div>
                  <Slider
                    label="DEFAULT TOP K RESULTS"
                    value={defaultTopK}
                    onChange={setDefaultTopK}
                    min={1}
                    max={20}
                    step={1}
                  />
                  <p className="mt-2 text-sm font-bold text-black/60 uppercase">
                    Number of relevant document chunks to retrieve
                  </p>
                </div>

                <div
                  className="p-4 bg-[#FFFEF0] border-4 border-black space-y-4"
                  style={{ boxShadow: "4px 4px 0px #000000" }}
                >
                  <Switch
                    checked={useHybridSearch}
                    onChange={setUseHybridSearch}
                    label="USE HYBRID SEARCH BY DEFAULT"
                  />
                  <p className="text-sm font-bold text-black/60 uppercase">
                    Combines semantic and keyword search
                  </p>

                  <div className="border-t-2 border-black pt-4">
                    <Switch
                      checked={streamResponses}
                      onChange={setStreamResponses}
                      label="STREAM RESPONSES BY DEFAULT"
                    />
                    <p className="mt-2 text-sm font-bold text-black/60 uppercase">
                      Show responses as they are generated
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Upload Settings */}
            <Card color="white" className="p-0 overflow-hidden">
              <div className="px-6 py-4 bg-[#CCFF00] border-b-4 border-black">
                <h2 className="text-lg font-black text-black uppercase tracking-tight">
                  📤 DEFAULT UPLOAD SETTINGS
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <Slider
                    label="DEFAULT CHUNK SIZE (TOKENS)"
                    value={defaultChunkSize}
                    onChange={setDefaultChunkSize}
                    min={100}
                    max={2000}
                    step={50}
                  />
                  <p className="mt-2 text-sm font-bold text-black/60 uppercase">
                    Size of text chunks for document processing
                  </p>
                </div>

                <div>
                  <Slider
                    label="DEFAULT CHUNK OVERLAP (TOKENS)"
                    value={defaultChunkOverlap}
                    onChange={setDefaultChunkOverlap}
                    min={0}
                    max={200}
                    step={10}
                  />
                  <p className="mt-2 text-sm font-bold text-black/60 uppercase">
                    Overlap between consecutive chunks
                  </p>
                </div>

                <div
                  className="p-4 bg-[#FFFEF0] border-4 border-black"
                  style={{ boxShadow: "4px 4px 0px #000000" }}
                >
                  <Switch
                    checked={extractTables}
                    onChange={setExtractTables}
                    label="EXTRACT TABLES BY DEFAULT"
                  />
                  <p className="mt-2 text-sm font-bold text-black/60 uppercase">
                    Attempt to extract and preserve table structures
                  </p>
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div
              className="flex justify-end gap-4 p-4 bg-white border-4 border-black"
              style={{ boxShadow: "6px 6px 0px #000000" }}
            >
              <Button variant="ghost">RESET DEFAULTS</Button>
              <Button
                variant="primary"
                onClick={handleSave}
                leftIcon={saved ? <CheckIcon size={16} /> : undefined}
              >
                {saved ? "✓ SAVED!" : "SAVE SETTINGS →"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
