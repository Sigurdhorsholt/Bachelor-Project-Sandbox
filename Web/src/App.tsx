import { useState } from "react";

export default function Home() {
    const [status, setStatus] = useState<string>("");

    async function testBackend() {
        try {
            console.log("Testing backend connection...");

            const res =await fetch("/api/dev/pingdb", { headers: { Accept: "application/json" } });
            
             //await fetch("https://localhost:7029/api/dev/pingdb");
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            console.log("✅ Backend responded:", data);
            setStatus(`✅ Connected to backend! Found ${data.tables?.length ?? 0} tables.`);
        } catch (err: any) {
            console.error("❌ Backend connection failed:", err);
            setStatus(`❌ Failed to connect: ${err.message}`);
        }
    }

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-gray-50 p-8">
            <h1 className="text-2xl font-bold">Backend Connection Test</h1>

            <button
                onClick={testBackend}
                className="rounded-xl bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700"
            >
                Test Backend Connection XXXXX
            </button>

            <p className="text-gray-700">{status || "Click the button to test."}</p>
        </div>
    );
}