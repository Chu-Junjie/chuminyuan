"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>这一页暂时没打开</h1>
      <p>你的本机学习记录不会因为页面错误被删除。</p>
      <button className="button primary" onClick={reset}>
        重新打开
      </button>
    </div>
  );
}
