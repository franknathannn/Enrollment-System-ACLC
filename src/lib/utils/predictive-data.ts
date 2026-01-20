// lib/utils/predictive-data.ts
import { supabase } from '@/lib/supabase/client';

export const getSchoolYearInt = (year: string): number => {
  const [startYear] = year.split('-').map(Number);
  return startYear;
};

export const generateAvailableYears = (currentYear: string): string[] => {
  const years: string[] = [];
  const currentYearInt = getSchoolYearInt(currentYear);
  
  // Generate from 2021-2022 to 10 years in the future
  for (let i = 2021; i <= currentYearInt + 10; i++) {
    years.push(`${i}-${i + 1}`);
  }
  
  return years;
};

export const fetchSystemConfig = async () => {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .limit(1)
    .single();
  
  if (error) throw error;
  return data;
};

export const fetchHistoricalEnrollmentData = async () => {
  const { data, error } = await supabase
    .from('enrollment_predictions_data')
    .select('*')
    .order('school_year', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const predictARIMA = (
  historicalData: any[], 
  capacity: number, 
  targetYear: string
) => {
  if (historicalData.length === 0) {
    return { predicted: 0, lowerBound: 0, upperBound: 0, confidence: 0 };
  }

  // Calculate trend
  const enrollments = historicalData.map(d => d.enrolled);
  const n = enrollments.length;
  
  // Simple linear regression
  const xMean = (n - 1) / 2;
  const yMean = enrollments.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (enrollments[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Predict next value
  const predicted = Math.round(slope * n + intercept);
  
  // Calculate confidence based on data quality
  const variance = enrollments.reduce((sum, val) => {
    const expected = slope * enrollments.indexOf(val) + intercept;
    return sum + Math.pow(val - expected, 2);
  }, 0) / n;
  
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(60, Math.min(95, 100 - (stdDev / yMean) * 100));
  
  // Calculate bounds (±10-15%)
  const lowerBound = Math.round(predicted * 0.90);
  const upperBound = Math.round(predicted * 1.10);
  
  return {
    predicted: Math.min(predicted, capacity * 1.5),
    lowerBound: Math.min(lowerBound, capacity * 1.5),
    upperBound: Math.min(upperBound, capacity * 1.5),
    confidence: Math.round(confidence)
  };
};

export const predictQualifiedPool = (
  historicalData: any[], 
  capacity: number, 
  targetYear: string
) => {
  if (historicalData.length === 0) {
    return {
      predicted: 0,
      lowerBound: 0,
      upperBound: 0,
      factors: { new_from_jhs: 0, new_from_als: 0, transfers_in: 0, continuing_students: 0 },
      breakdown: {
        total_jhs_als_pool: 0,
        eligible_pool_after_conversion: 0,
        your_market_share_percent: 0,
        new_students_from_pool: 0,
        continuing_from_g11: 0,
        transfer_students: 0
      }
    };
  }

  const recent = historicalData[historicalData.length - 1];
  
  // Total JHS + ALS pool
  const totalPool = recent.jhs_graduates + recent.als_passers;
  
  // Apply SHS conversion rate to get eligible pool
  const conversionRate = recent.shs_conversion_rate / 100;
  const eligiblePool = Math.round(totalPool * conversionRate);
  
  // Calculate your school's market share from historical data
  const avgMarketShare = historicalData.reduce((sum, d) => {
    const pool = (d.jhs_graduates + d.als_passers) * (d.shs_conversion_rate / 100);
    return sum + (d.enrolled / pool);
  }, 0) / historicalData.length;
  
  // Predict new students from eligible pool
  const newStudents = Math.round(eligiblePool * avgMarketShare);
  
  // Calculate continuing students (G11 → G12)
  // Assume 50% of total enrollment are G11 students who will continue
  const continuingStudents = Math.round(recent.enrolled * 0.50);
  
  // Calculate transfer students
  const transferRate = recent.transfer_rate / 100;
  const transferStudents = Math.round(recent.enrolled * transferRate);
  
  // Total prediction
  const predicted = newStudents + continuingStudents + transferStudents;
  
  // Calculate bounds (±15-20% for pool model due to market volatility)
  const lowerBound = Math.round(predicted * 0.85);
  const upperBound = Math.round(predicted * 1.15);
  
  return {
    predicted: Math.min(predicted, capacity * 1.5),
    lowerBound: Math.min(lowerBound, capacity * 1.5),
    upperBound: Math.min(upperBound, capacity * 1.5),
    factors: {
      new_from_jhs: Math.round(newStudents * 0.97), // ~97% from JHS
      new_from_als: Math.round(newStudents * 0.03), // ~3% from ALS
      transfers_in: transferStudents,
      continuing_students: continuingStudents
    },
    breakdown: {
      total_jhs_als_pool: totalPool,
      eligible_pool_after_conversion: eligiblePool,
      your_market_share_percent: Number((avgMarketShare * 100).toFixed(3)),
      new_students_from_pool: newStudents,
      continuing_from_g11: continuingStudents,
      transfer_students: transferStudents
    }
  };
};

export const projectMultipleYears = (
  historicalData: any[], 
  capacity: number, 
  startYear: string, 
  yearsAhead: number
) => {
  const projections = [];
  let currentYear = startYear;
  let workingData = [...historicalData];
  
  for (let i = 0; i <= yearsAhead; i++) {
    const prediction = predictARIMA(workingData, capacity, currentYear);
    
    projections.push({
      year: currentYear,
      predicted: prediction.predicted,
      lowerBound: prediction.lowerBound,
      upperBound: prediction.upperBound,
      confidence: Math.round(prediction.confidence * Math.pow(0.9, i))
    });
    
    // Add prediction to working data for next iteration
    workingData.push({
      year: currentYear,
      enrolled: prediction.predicted,
      jhs_graduates: historicalData[historicalData.length - 1].jhs_graduates,
      als_passers: historicalData[historicalData.length - 1].als_passers,
      transfer_rate: historicalData[historicalData.length - 1].transfer_rate,
      shs_conversion_rate: historicalData[historicalData.length - 1].shs_conversion_rate
    });
    
    // Move to next year
    const [start] = currentYear.split('-').map(Number);
    currentYear = `${start + 1}-${start + 2}`;
  }
  
  return projections;
};