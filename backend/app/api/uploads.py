import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.messaging import MessageAttachment
from app.schemas.messaging import AttachmentRead
from app.services.storage import storage

router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.post("", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED, summary="Upload a file (image, PDF, or video)")
async def upload_file(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> AttachmentRead:
    try:
        saved = await storage.save(file, folder="chat")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")
    att = MessageAttachment(message_id=None, url=saved.url, filename=saved.original_filename, content_type=saved.content_type, size_bytes=saved.size_bytes)
    db.add(att)
    await db.commit()
    await db.refresh(att)
    return AttachmentRead.model_validate(att)
