type CircleMeterProps = {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
};

export default function CircleMeter({
  value,
  min,
  max,
  label,
  unit,
}: CircleMeterProps) {
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100)
  );

  const radius = 92;
  const stroke = 16;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="circle-meter">
      <svg
        className="circle-meter__svg"
        width="240"
        height="240"
        viewBox="0 0 240 240"
      >
        <circle
          className="circle-meter__track"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx="120"
          cy="120"
        />
        <circle
          className="circle-meter__progress"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: dashOffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx="120"
          cy="120"
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