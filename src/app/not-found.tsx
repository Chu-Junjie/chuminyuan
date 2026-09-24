import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>这条路暂时还没开通</h1>
      <p>回到学习地图，再找一条思路。</p>
      <Link className="button primary" href="/learn">
        回到学习
      </Link>
    </div>
  );
}
