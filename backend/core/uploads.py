"""Безопасное сохранение загружаемых файлов."""
import os
from uuid import uuid4

from fastapi import HTTPException, UploadFile

UPLOAD_DIR = "uploads"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_EXCEL_BYTES = 10 * 1024 * 1024

_MAGIC = {
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".gif": (b"GIF87a", b"GIF89a"),
    ".webp": (b"RIFF",),
    ".pdf": (b"%PDF-",),
}


async def read_limited(file: UploadFile, max_bytes: int) -> bytes:
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(413, f"Файл слишком большой (максимум {max_bytes // 1024 // 1024} МБ)")
    return content


def _checked_ext(file: UploadFile, allowed: set[str], error: str) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, error)
    return ext


async def save_upload(
    file: UploadFile,
    subdir: str = "",
    *,
    kind: str = "image",
    prefix: str = "",
) -> str:
    """Сохраняет изображение или PDF под случайным именем, возвращает имя файла.

    Расширение — из белого списка, содержимое проверяется по сигнатуре,
    исходное имя файла нигде не используется (нет path traversal и .html/.svg).
    """
    if kind == "pdf":
        allowed, max_bytes, error = {".pdf"}, MAX_PDF_BYTES, "Разрешены только PDF-файлы"
    else:
        allowed, max_bytes, error = IMAGE_EXTENSIONS, MAX_IMAGE_BYTES, "Разрешены только изображения (jpg, png, gif, webp)"
    ext = _checked_ext(file, allowed, error)
    content = await read_limited(file, max_bytes)
    if not any(content.startswith(sig) for sig in _MAGIC[ext]):
        raise HTTPException(400, error)

    directory = os.path.join(UPLOAD_DIR, subdir) if subdir else UPLOAD_DIR
    os.makedirs(directory, exist_ok=True)
    filename = f"{prefix}{uuid4().hex}{ext}"
    with open(os.path.join(directory, filename), "wb") as f:
        f.write(content)
    return filename


def remove_upload(filename: str | None, subdir: str = "") -> None:
    """Удаляет файл, если он лежит внутри папки загрузок."""
    if not filename:
        return
    base = os.path.realpath(os.path.join(UPLOAD_DIR, subdir) if subdir else UPLOAD_DIR)
    path = os.path.realpath(os.path.join(base, filename))
    if os.path.dirname(path) == base and os.path.isfile(path):
        os.remove(path)
