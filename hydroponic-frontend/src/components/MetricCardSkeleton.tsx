import Skeleton from "react-loading-skeleton";

export default function MetricCardSkeleton() {
  return (
    <div className="metric-card metric-card--compact metric-card--skeleton">
      <div className="metric-card__top">
        <Skeleton width={120} height={22} borderRadius={6} />
        <Skeleton width={68} height={32} borderRadius={999} />
      </div>

      <div className="metric-card__meter metric-card__meter--skeleton">
        <div className="circle-skeleton">
          <Skeleton circle width={132} height={132} />
        </div>
      </div>

      <div className="metric-card__bottom">
        <Skeleton width={88} height={18} borderRadius={6} />
        <Skeleton width={78} height={18} borderRadius={6} />
      </div>
    </div>
  );
}
