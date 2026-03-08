export type AnalyticPoint = {
    year: string
    sortYear: number
    total: number
    historicalTotal?: number | null
    futureStable?: number | null
    futureDeclining?: number | null
    futureWavy?: number | null
    marketJHS: number 
    marketALS: number
    marketTransferees: number // <--- Added this
    gap?: [number, number] | null
    type: 'historical' | 'current' | 'future'
  }
  
  export type Metrics = {
    growth: string
    nextTotal: number
    lowestPossible: number
    highestPossible: number
  }
  
  export type SimulationMode = 'ongoing' | 'ended' | 'simulation'

export type HistoryRecord = {
  id: string
  school_year: string
  total_enrolled: number
  jhs_graduates_count: number
  als_passers_count: number
  others_count: number
  created_at?: string
}