import React, { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface TickChartProps {
  frequencies: number[];
}

export function TickChart({ frequencies }: TickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!chartInstance.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
            datasets: [
              {
                label: "Frequency",
                data: frequencies,
                backgroundColor: "rgba(0, 198, 255, 0.5)",
                borderColor: "rgba(0, 198, 255, 1)",
                borderWidth: 1,
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 300,
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(18, 18, 26, 0.9)",
                titleColor: "#fff",
                bodyColor: "#00c6ff",
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: "rgba(255, 255, 255, 0.05)",
                },
                ticks: { color: "rgba(255,255,255,0.5)" }
              },
              x: {
                grid: {
                  display: false,
                },
                ticks: { color: "rgba(255,255,255,0.5)", font: { family: "'JetBrains Mono', monospace" } }
              },
            },
          },
        });
      }
    } else {
      chartInstance.current.data.datasets[0].data = frequencies;
      
      // Update colors to highlight hot/cold
      const max = Math.max(...frequencies);
      const min = Math.min(...frequencies);
      
      chartInstance.current.data.datasets[0].backgroundColor = frequencies.map(f => {
        if (f === max) return "rgba(0, 198, 255, 0.8)";
        if (f === min) return "rgba(239, 68, 68, 0.5)";
        return "rgba(255, 255, 255, 0.1)";
      });
      chartInstance.current.data.datasets[0].borderColor = frequencies.map(f => {
        if (f === max) return "rgba(0, 198, 255, 1)";
        if (f === min) return "rgba(239, 68, 68, 1)";
        return "rgba(255, 255, 255, 0.2)";
      });

      chartInstance.current.update();
    }
  }, [frequencies]);

  return (
    <div className="w-full h-full min-h-[200px] relative">
      <canvas ref={canvasRef} />
    </div>
  );
}