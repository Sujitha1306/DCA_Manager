import { useState, useEffect } from 'react';

export const useForecastingData = () => {
     const [volumeForecast, setVolumeForecast] = useState([]);
     const [agentRisk, setAgentRisk] = useState([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          // Simulate API call delay
          const timer = setTimeout(() => {
               const generateVolumeData = () => {
                    const data = [];
                    const today = new Date();

                    // Generate 30 days past + 30 days future
                    for (let i = -30; i <= 30; i++) {
                         const date = new Date(today);
                         date.setDate(today.getDate() + i);

                         // Sine wave pattern for seasonality: base + amplitude * sin(time)
                         const baseVolume = 150;
                         const seasonality = Math.sin(i * 0.2) * 40;
                         const noise = Math.random() * 20 - 10;
                         const value = Math.round(baseVolume + seasonality + noise);

                         const isFuture = i > 0;

                         data.push({
                              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              // Past has actual, future is null. Future has predicted, past is null (or same for continuity)
                              actualVolume: isFuture ? null : value,
                              predictedVolume: isFuture ? value : (i === 0 ? value : null), // Overlap at 0 for continuity
                              isFuture
                         });
                    }
                    return data;
               };

               const generateAgentRiskData = () => {
                    return [
                         { agentName: 'Sarah J.', currentRate: 85, predictedNextWeekRate: 88 },
                         { agentName: 'Mike T.', currentRate: 72, predictedNextWeekRate: 65 }, // Risk
                         { agentName: 'Jessica L.', currentRate: 91, predictedNextWeekRate: 90 },
                         { agentName: 'David B.', currentRate: 68, predictedNextWeekRate: 55 }, // High Risk
                         { agentName: 'Emily W.', currentRate: 78, predictedNextWeekRate: 82 }
                    ];
               };

               setVolumeForecast(generateVolumeData());
               setAgentRisk(generateAgentRiskData());
               setLoading(false);
          }, 800);

          return () => clearTimeout(timer);
     }, []);

     return { volumeForecast, agentRisk, loading };
};
