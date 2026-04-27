type CircleMeterProps = {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  size?: "sm" | "lg";
};

export default function CircleMeter({
  value,
  min,
  max,
  label,
  unit,
  size = "lg",
}: CircleMeterProps) {
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100)
  );

  const dimension = size === "sm" ? 150 : 240;
  const center = dimension / 2;
  const stroke = size === "sm" ? 12 : 16;
  const radius = size === "sm" ? 58 : 92;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`circle-meter circle-meter--${size}`}>
      <svg
        className="circle-meter__svg"
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
      >
        <circle
          className="circle-meter__track"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={center}
          cy={center}
        />
        <circle
          className="circle-meter__progress"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: dashOffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={center}
          cy={center}
        />
      </svg>

      <div className="circle-meter__content">
        <span className="circle-meter__label">{label}</span>
        <strong className="circle-meter__value">
          {value}
          <span>{unit}</span>
        </strong>
        <small className="circle-meter__range">
          {min} - {max}
          {unit}
        </small>
      </div>
    </div>
  );
}
