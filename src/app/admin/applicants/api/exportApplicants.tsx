import { toast } from "sonner"

export async function downloadApplicantsExcel(filter: string) {
  const toastId = toast.loading("Preparing Excel export...")
  
  try {
    const response = await fetch('/admin/applicants/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter }),
    })

    if (!response.ok) {
      throw new Error('Export failed')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Applicants_MasterList_${filter}_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    toast.success("Export complete", { id: toastId })
  } catch (error) {
    console.error(error)
    toast.error("Failed to export applicants", { id: toastId })
  }
}