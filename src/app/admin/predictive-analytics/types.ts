export type AnalyticPoint = {
    year: string
    sortYear: number
    total: number
    historicalTotal?: number | null
    futureTotal?: number | null
    marketJHS: number 
    marketALS: number
    marketTransferees: number // <--- Added this
    type: 'historical' | 'current' | 'future'
  }
  
  export type Metrics = {
    growth: string
    nextTotal: number
    lowestPossible: number
    highestPossible: number
  }
  
  export type SimulationMode = 'ongoing' | 'ended' | 'simulation'