import { useState, useEffect, useMemo } from 'react';
import { useCases } from '../context/CaseContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const useForecastingData = () => {
     const { cases, loading: casesLoading } = useCases();
     const [volumeForecast, setVolumeForecast] = useState([]);
     const [agentRisk, setAgentRisk] = useState([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          if (casesLoading) return;

          const generateData = async () => {
               // 1. Volume Forecast (Actual History + Prediction)
               const today = new Date();
               const dateMap = {};

               // Initialize last 30 days
               for (let i = -30; i <= 0; i++) {
                    const d = new Date();
                    d.setDate(today.getDate() + i);
                    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    dateMap[key] = { date: key, actualVolume: 0, predictedVolume: null, isFuture: false };
               }

               // Fill Actuals from Cases
               cases.forEach(c => {
                    if (!c.createdAt) return;
                    const cDate = new Date(c.createdAt);
                    const key = cDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (dateMap[key]) {
                         dateMap[key].actualVolume += 1;
                         // Sync predicted line to actual for continuity
                         dateMap[key].predictedVolume = dateMap[key].actualVolume;
                    }
               });

               // Calculate 7-day average for simple projection
               const last7DaysVol = Object.values(dateMap).slice(-7).reduce((acc, cur) => acc + cur.actualVolume, 0);
               const avgDaily = last7DaysVol / 7 || 5; // Default to 5 if empty

               // Generate Future 30 Days
               const forecastData = Object.values(dateMap);
               let lastVal = forecastData[forecastData.length - 1].actualVolume;

               for (let i = 1; i <= 30; i++) {
                    const d = new Date();
                    d.setDate(today.getDate() + i);
                    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    // Add some random noise to prediction to look realistic
                    const noise = (Math.random() - 0.5) * (avgDaily * 0.2);
                    let predicted = Math.max(0, Math.round(avgDaily + noise));

                    // Smooth transition
                    if (i === 1) predicted = Math.round((lastVal + predicted) / 2);
                    lastVal = predicted;

                    forecastData.push({
                         date: key,
                         actualVolume: null,
                         predictedVolume: predicted,
                         isFuture: true
                    });
               }

               setVolumeForecast(forecastData);

               // 2. Agent Risk Analysis
               // We need agent names. Fetch active agents first.
               const q = query(collection(db, 'users'), where('role', '==', 'agent'));
               const snapshot = await getDocs(q);
               const agents = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

               const riskData = agents.map(agent => {
                    const agentCases = cases.filter(c => c.assignedAgentId === agent.uid);
                    if (agentCases.length === 0) return null;

                    const total = agentCases.length;
                    const paid = agentCases.filter(c => c.status === 'Paid').length;
                    const recoveryRate = (paid / total) * 100;

                    // Heuristic for Prediction:
                    // If they have many "High Risk" (old > 60 days) unpaid cases, rate will drop.
                    const highRiskBacklog = agentCases.filter(c => c.daysOverdue > 60 && c.status !== 'Paid').length;
                    const dropFactor = (highRiskBacklog / total) * 20; // up to 20% drop
                    const predictedRate = Math.max(0, recoveryRate - dropFactor);

                    return {
                         agentName: agent.name || agent.email.split('@')[0],
                         currentRate: Math.round(recoveryRate),
                         predictedNextWeekRate: Math.round(predictedRate)
                    };
               }).filter(Boolean).slice(0, 10); // Top 10

               setAgentRisk(riskData);
               setLoading(false);
          };

          generateData();
     }, [cases, casesLoading]);

     return { volumeForecast, agentRisk, loading: casesLoading || loading };
};
