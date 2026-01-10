import { useState, useCallback } from "react"

export function useStudentUI() {
  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewingFile, setViewingFile] = useState<{url: string, label: string} | null>(null)
  const [docList, setDocList] = useState<{url: string, label: string}[]>([])
  const [rotation, setRotation] = useState(0)

  // Modal States
  const [declineModalOpen, setDeclineModalOpen] = useState(false)
  const [activeDeclineStudent, setActiveDeclineStudent] = useState<any>(null)
  const [declineReason, setDeclineReason] = useState("")
  const [bulkDeclineModalOpen, setBulkDeclineModalOpen] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [activeDeleteStudent, setActiveDeleteStudent] = useState<any>(null) 
  const [openStudentDialog, setOpenStudentDialog] = useState<string | null>(null)

  const openDocumentViewer = useCallback((url: string, label: string, allDocs: {url: string, label: string}[] = []) => {
    setViewingFile({ url, label }); 
    setDocList(allDocs.length > 0 ? allDocs : [{url, label}]);
    setRotation(0); 
    setViewerOpen(true);
  }, [])

  const navigateDocument = useCallback((direction: number) => {
    if (!viewingFile || docList.length === 0) return;
    const currentIndex = docList.findIndex(d => d.url === viewingFile.url && d.label === viewingFile.label);
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < docList.length) {
      setViewingFile(docList[newIndex]);
      setRotation(0);
    }
  }, [viewingFile, docList]);

  const currentIndex = viewingFile ? docList.findIndex(d => d.url === viewingFile.url && d.label === viewingFile.label) : -1;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex !== -1 && currentIndex < docList.length - 1;

  return {
    viewerOpen, setViewerOpen,
    viewingFile, setViewingFile,
    rotation, setRotation,
    declineModalOpen, setDeclineModalOpen,
    activeDeclineStudent, setActiveDeclineStudent,
    declineReason, setDeclineReason,
    bulkDeclineModalOpen, setBulkDeclineModalOpen,
    bulkDeleteModalOpen, setBulkDeleteModalOpen,
    deleteModalOpen, setDeleteModalOpen,
    activeDeleteStudent, setActiveDeleteStudent,
    openStudentDialog, setOpenStudentDialog,
    openDocumentViewer,
    navigateDocument,
    canNavigatePrev,
    canNavigateNext
  }
}