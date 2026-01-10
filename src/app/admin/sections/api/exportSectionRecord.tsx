// src/app/admin/sections/api/exportSectionRecord.ts
import { toast } from "sonner"

export async function downloadSectionRecord(sectionName: string, students: any[], schoolYear: string) {
  const toastId = toast.loading("Connecting to Grade Registry...");
  
  // 1. SET A TIMEOUT (Safety Valve)
  // If the server hangs for more than 45 seconds, we kill the request
  // so the browser doesn't stay 'Pending' forever.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); 

  try {
    const response = await fetch('/api/export-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal, // Connect the kill switch
      body: JSON.stringify({
        sectionName,
        students,
        schoolYear: schoolYear || "2025-2026"
      }),
    });

    clearTimeout(timeoutId); // Request finished, clear the timer

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Server processing failed");
    }

    // 2. CONVERT RESPONSE TO BLOB
    const blob = await response.blob();
    
    // Safety check: if blob is tiny, the file might be empty
    if (blob.size < 100) {
      throw new Error("Generated file appears to be corrupted or empty.");
    }

    // 3. TRIGGER DOWNLOAD (The "Alive" Way)
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none'; // Keep UI clean
    a.href = url;
    a.download = `E-Class_Record_${sectionName}.xlsx`;
    
    document.body.appendChild(a);
    a.click();
    
    // 4. CLEANUP (Prevent Memory Leaks)
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);

    toast.success("Masterlist Prepared Successfully!", { id: toastId });

  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("Export Error:", err);

    if (err.name === 'AbortError') {
      toast.error("Request Timed Out: The Excel template is too heavy.", { id: toastId });
    } else {
      toast.error(`System Error: ${err.message}`, { id: toastId });
    }
  }
}
