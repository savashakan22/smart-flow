import { useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Metric, TimeRange } from "../types/dashboard";
import { buildChartData, buildChartPoints, type ChartDatum } from "../lib/metric-history-chart";

type MetricHistoryChartProps = {
  metric: Metric;
  timeRange: TimeRange;
};

function getChartDisplaySettings(timeRange: TimeRange, pointCount: number) {
  const denseRange = pointCount > 18;

  if (timeRange === "hourly") {
    return {
      minTickGap: denseRange ? 26 : 20,
      actualDot: denseRange ? false : { r: 4, fill: "var(--primary)", strokeWidth: 0 },
      forecastDot: denseRange
        ? false
        : { r: 3.5, fill: "var(--surface)", stroke: "var(--primary)", strokeWidth: 2 },
    };
  }

  if (timeRange === "daily") {
    return {
      minTickGap: 40,
      actualDot: false,
      forecastDot: false,
    };
  }

  return {
    minTickGap: 52,
    actualDot: false,
    forecastDot: false,
  };
}

function getLineType(timeRange: TimeRange) {
  return timeRange === "hourly" ? "monotone" : "linear";
}

function shouldEnableZoom(timeRange: TimeRange, pointCount: number) {
  if (timeRange === "hourly") {
    return pointCount > 8;
  }

  if (timeRange === "daily") {
    return pointCount > 4;
  }

  return pointCount > 3;
}

function formatAxisTick(value: number) {
  const rounded = Number(value.toFixed(2));

  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  return rounded.toString();
}

function ChartTooltip({
  active,
  payload,
  timeRange,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartDatum }>;
  timeRange: TimeRange;
  unit: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload as ChartDatum | undefined;

  if (!point) {
    return null;
  }

  return (
    <div className="detail-panel__tooltip">
      <p>{new Date(point.timestamp).toLocaleString([], getTooltipDateFormat(timeRange))}</p>
      <strong>
        {point.value.toFixed(2)}
        {unit}
      </strong>
      <span>{point.predicted ? "Forecast" : "Actual reading"}</span>
    </div>
  );
}

function getTooltipDateFormat(timeRange: TimeRange): Intl.DateTimeFormatOptions {
  if (timeRange === "hourly") {
    return {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    };
  }

  if (timeRange === "daily") {
    return {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    };
  }

  return {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
}

export default function MetricHistoryChart({ metric, timeRange }: MetricHistoryChartProps) {
  const showForecast = timeRange === "hourly";
  const chartPoints = useMemo(
    () => buildChartPoints(metric, timeRange, showForecast),
    [metric, showForecast, timeRange]
  );
  const chartData = useMemo(
    () => buildChartData(chartPoints, showForecast),
    [chartPoints, showForecast]
  );
  const displaySettings = useMemo(
    () => getChartDisplaySettings(timeRange, chartData.length),
    [chartData.length, timeRange]
  );
  const chartScope = `${metric.id}:${timeRange}:${chartData.length}`;
  const [zoomRange, setZoomRange] = useState(() => ({
    startIndex: 0,
    endIndex: Math.max(chartData.length - 1, 0),
    scope: chartScope,
  }));

  const chartMin = Math.min(metric.min, ...chartPoints.map((point) => point.value));
  const chartMax = Math.max(metric.max, ...chartPoints.map((point) => point.value));
  const yAxisPadding = Math.max((chartMax - chartMin) * 0.12, 1);
  const canZoom = shouldEnableZoom(timeRange, chartData.length);
  const lineType = getLineType(timeRange);
  const effectiveZoomRange =
    zoomRange.scope === chartScope
      ? zoomRange
      : {
          startIndex: 0,
          endIndex: Math.max(chartData.length - 1, 0),
          scope: chartScope,
        };
  const isZoomed =
    effectiveZoomRange.startIndex > 0 ||
    effectiveZoomRange.endIndex < Math.max(chartData.length - 1, 0);

  function handleBrushChange(range: { startIndex?: number; endIndex?: number } | null) {
    if (!range) {
      return;
    }

    setZoomRange({
      startIndex: range.startIndex ?? 0,
      endIndex: range.endIndex ?? Math.max(chartData.length - 1, 0),
      scope: chartScope,
    });
  }

  return (
    <div className="detail-panel__chart-wrap">
      <div className="detail-panel__chart-toolbar">
        <span>
          {canZoom
            ? "Use the zoom handles below to focus on a smaller slice."
            : "All available data is visible in this range."}
        </span>
        {isZoomed ? (
          <button
            type="button"
            className="detail-panel__chart-reset"
            onClick={() =>
              setZoomRange({
                startIndex: 0,
                endIndex: Math.max(chartData.length - 1, 0),
                scope: chartScope,
              })
            }
          >
            Reset zoom
          </button>
        ) : null}
      </div>

      <div className="detail-panel__chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 8, bottom: canZoom ? 26 : 0, left: 0 }}
          >
            <CartesianGrid
              stroke="color-mix(in srgb, var(--text-muted) 18%, transparent)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <ReferenceArea
              y1={metric.idealMin}
              y2={metric.idealMax}
              fill="var(--primary)"
              fillOpacity={0.08}
              ifOverflow="extendDomain"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={displaySettings.minTickGap}
              interval="preserveStartEnd"
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            />
            <YAxis
              domain={[chartMin - yAxisPadding, chartMax + yAxisPadding]}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={52}
              tickFormatter={formatAxisTick}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--primary)", strokeOpacity: 0.2, strokeWidth: 1 }}
              content={<ChartTooltip timeRange={timeRange} unit={metric.unit} />}
            />
            <Line
              type={lineType}
              dataKey="actual"
              name="Actual"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={displaySettings.actualDot}
              activeDot={{ r: 6, fill: "var(--primary)" }}
            />
            {showForecast ? (
              <Line
                type={lineType}
                dataKey="forecast"
                name="Linear Regression"
                stroke="var(--primary)"
                strokeWidth={3}
                strokeDasharray="8 7"
                dot={displaySettings.forecastDot}
                activeDot={{
                  r: 5,
                  fill: "var(--surface)",
                  stroke: "var(--primary)",
                  strokeWidth: 2,
                }}
                connectNulls
              />
            ) : null}
            {canZoom ? (
              <Brush
                dataKey="label"
                height={26}
                travellerWidth={10}
                stroke="var(--primary)"
                fill="color-mix(in srgb, var(--primary) 10%, var(--surface))"
                startIndex={effectiveZoomRange.startIndex}
                endIndex={effectiveZoomRange.endIndex}
                onChange={handleBrushChange}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="detail-panel__chart-footnote">
        <span>Shaded band marks the ideal operating range.</span>
        <span>
          {showForecast
            ? "Hover or tap the chart to inspect each reading and forecast."
            : "Hover or tap the chart to inspect each reading."}
        </span>
      </div>
    </div>
  );
}
