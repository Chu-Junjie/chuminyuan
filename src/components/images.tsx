"use client";
import { useEffect, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { useStore } from "./provider";
import { saveImage } from "@/lib/db";
import { imageUrl } from "@/lib/sync";
import { browserImage, cropImage, validateImage } from "@/lib/images";
import type { Attachment, ImageKind } from "@/lib/types";
export const imageKinds: Record<ImageKind, string> = {
  question: "题目图片",
  wrong_work: "我的错误草稿",
  teacher_solution: "老师答案",
  other: "后续补充图",
};
export function PrivateImage({ id, alt }: { id: string; alt: string }) {
  const { scope } = useStore();
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      objectUrl = "";
    imageUrl(scope, id)
      .then((value) => {
        objectUrl = value;
        if (active) setUrl(value);
        else URL.revokeObjectURL(value);
      })
      .catch(() => setError("图片暂时无法打开，联网后重试"));
    return () => {
      active = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [scope, id]);
  return url ? (
    <img src={url} alt={alt} loading="lazy" />
  ) : (
    <p className="muted">{error || "正在读取图片…"}</p>
  );
}
export function ImageUploader({
  onAdd,
}: {
  onAdd: (attachment: Attachment) => Promise<void>;
}) {
  const { scope } = useStore();
  const [pending, setPending] = useState<{
      original: Blob;
      preview: Blob;
      name: string;
      mime: string;
    } | null>(null),
    [url, setUrl] = useState(""),
    [kind, setKind] = useState<ImageKind>("question"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  useEffect(() => {
    if (!pending) return;
    const value = URL.createObjectURL(pending.preview);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [pending]);
  async function select(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const mime = await validateImage(file);
      const preview = await browserImage(file, mime);
      setPending({
        original: file.slice(0, file.size, mime),
        preview,
        name: file.name,
        mime,
      });
      setCrop({ x: 0, y: 0, width: 100, height: 100 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法读取图片");
    } finally {
      setBusy(false);
    }
  }
  async function attach() {
    if (!pending) return;
    setBusy(true);
    try {
      const originalId = crypto.randomUUID(),
        id = crypto.randomUUID();
      const cropped = await cropImage(pending.preview, crop);
      await saveImage(scope, originalId, pending.original, pending.name);
      await saveImage(scope, id, cropped, pending.name);
      await onAdd({
        id,
        originalId,
        kind,
        name: pending.name,
        mime: "image/jpeg",
      });
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "图片保存失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="image-uploader">
      <div className="row wrap">
        <label className="button secondary file-label">
          <Camera size={18} />
          拍照
          <input
            aria-label="拍照"
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            capture="environment"
            disabled={busy}
            onChange={(e) => {
              void select(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className="button secondary file-label">
          <ImagePlus size={18} />
          相册上传
          <input
            aria-label="相册上传"
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif"
            disabled={busy}
            onChange={(e) => {
              void select(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <small className="muted">JPG / PNG / WebP / HEIC · 每张 ≤ 15 MB</small>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {busy && <p role="status">正在处理图片…</p>}
      {pending && (
        <div className="crop-panel">
          <h3>保留需要的部分</h3>
          <div className="crop-preview">
            <img src={url} alt="待裁剪图片" />
            <div
              className="crop-rectangle"
              style={{
                left: crop.x + "%",
                top: crop.y + "%",
                width: crop.width + "%",
                height: crop.height + "%",
              }}
            />
          </div>
          <div className="form-grid">
            {(["x", "y", "width", "height"] as const).map((key) => (
              <label key={key}>
                {
                  {
                    x: "左侧起点",
                    y: "顶部起点",
                    width: "裁剪宽度",
                    height: "裁剪高度",
                  }[key]
                }{" "}
                {crop[key]}%
                <input
                  type="range"
                  min={key === "x" || key === "y" ? 0 : 10}
                  max={
                    key === "x"
                      ? 100 - crop.width
                      : key === "y"
                        ? 100 - crop.height
                        : key === "width"
                          ? 100 - crop.x
                          : 100 - crop.y
                  }
                  value={crop[key]}
                  onChange={(e) =>
                    setCrop({ ...crop, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            图片用途
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ImageKind)}
            >
              {Object.entries(imageKinds).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="row wrap">
            <button
              disabled={busy}
              className="button primary"
              onClick={() => void attach()}
            >
              完成裁剪并添加
            </button>
            <button
              disabled={busy}
              className="text-button"
              onClick={() => setPending(null)}
            >
              取消
            </button>
            <small>原图会一并保留。</small>
          </div>
        </div>
      )}
    </div>
  );
}
