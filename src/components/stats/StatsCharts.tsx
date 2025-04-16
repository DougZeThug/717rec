
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChartDataItem {
  name: string;
  wins: number;
  losses: number;
  winPercentage: number;
}

interface StatsChartsProps {
  chartData: ChartDataItem[];
  chartLimit: number;
}

const StatsCharts = ({ chartData, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      <Card className={`${isMobile ? '' : 'xl:col-span-2'}`}>
        <CardHeader>
          <CardTitle>Win-Loss Records</CardTitle>
          <CardDescription>Top {chartLimit} teams by win percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: isMobile ? 80 : 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={70}
                  interval={0}
                  tick={{fontSize: isMobile ? 10 : 12}}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="wins" fill="#2C5530" name="Wins" />
                <Bar dataKey="losses" fill="#1E3A5F" name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Win Percentage</CardTitle>
            <CardDescription>Top {chartLimit} teams by percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 60,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tickFormatter={(value) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="winPercentage" fill="#9E7E5A" name="Win %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCharts;
