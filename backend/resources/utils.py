# backend/resources/utils.py
"""파일 보안 검증 유틸리티"""
import os
import hashlib
try:
    import magic  # python-magic 라이브러리 필요
except ImportError:
    magic = None

# 허용된 확장자 목록
ALLOWED_EXTENSIONS = [
    # 문서
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.hwp', '.hwpx',
    '.rtf', '.odt', '.ods', '.odp', '.csv',
    # 이미지
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico',
    # 압축
    '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz',
    # 비디오
    '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm',
    # 오디오
    '.mp3', '.wav', '.ogg', '.m4a',
]

# 허용된 MIME 타입
ALLOWED_MIME_TYPES = [
    # 문서
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/x-hwp',
    'application/haansofthwp',
    # 이미지
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    # 압축
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    # 비디오
    'video/mp4',
    'video/x-msvideo',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/webm',
    # 오디오
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
]

# 최대 파일 크기 (100MB)
MAX_FILE_SIZE = 100 * 1024 * 1024

# 위험한 확장자 (업로드 금지)
DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
    '.msi', '.dll', '.scr', '.com', '.pif', '.application',
    '.gadget', '.msc', '.hta', '.cpl', '.msp', '.inf',
]


class FileValidationError(Exception):
    """파일 검증 오류"""
    pass


def validate_extension(filename):
    """확장자 검증"""
    ext = os.path.splitext(filename)[1].lower()
    
    # 위험한 확장자 차단
    if ext in DANGEROUS_EXTENSIONS:
        raise FileValidationError(f"보안상 업로드가 금지된 파일 형식입니다: {ext}")
    
    # 허용된 확장자 확인
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(f"허용되지 않은 파일 형식입니다: {ext}")
    
    return True


def validate_file_size(file, max_size=None):
    """파일 크기 검증"""
    max_size = max_size or MAX_FILE_SIZE
    
    if hasattr(file, 'size'):
        size = file.size
    else:
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
    
    if size > max_size:
        max_mb = max_size / (1024 * 1024)
        current_mb = size / (1024 * 1024)
        raise FileValidationError(
            f"파일 크기가 제한을 초과합니다. (최대: {max_mb:.1f}MB, 현재: {current_mb:.1f}MB)"
        )
    
    return True


def validate_mime_type(file):
    """MIME 타입 검증 (매직 바이트 확인)"""
    if magic is None:
        return None

    try:
        # 파일의 처음 부분을 읽어 MIME 타입 감지
        file.seek(0)
        file_head = file.read(2048)
        file.seek(0)
        
        mime = magic.from_buffer(file_head, mime=True)
        
        if mime not in ALLOWED_MIME_TYPES:
            raise FileValidationError(f"허용되지 않은 파일 형식입니다: {mime}")
        
        return mime
    except Exception as e:
        if isinstance(e, FileValidationError):
            raise
        # magic 라이브러리가 없는 경우 확장자 기반으로 검증
        return None


def validate_file(file, filename=None):
    """
    파일 종합 검증
    - 확장자 검증
    - 파일 크기 검증
    - MIME 타입 검증 (optional)
    """
    filename = filename or getattr(file, 'name', '')
    
    # 1. 확장자 검증
    validate_extension(filename)
    
    # 2. 파일 크기 검증
    validate_file_size(file)
    
    # 3. MIME 타입 검증 (선택적)
    mime_type = None
    try:
        mime_type = validate_mime_type(file)
    except ImportError:
        # python-magic 미설치 시 스킵
        pass
    
    return {
        'valid': True,
        'filename': filename,
        'extension': os.path.splitext(filename)[1].lower(),
        'mime_type': mime_type,
    }


def calculate_checksum(file):
    """SHA256 체크섬 계산"""
    sha256 = hashlib.sha256()
    
    file.seek(0)
    for chunk in iter(lambda: file.read(8192), b''):
        sha256.update(chunk)
    file.seek(0)
    
    return sha256.hexdigest()


def get_safe_filename(filename):
    """안전한 파일명 생성 (특수문자 제거)"""
    import re
    import uuid
    
    # 확장자 분리
    name, ext = os.path.splitext(filename)
    
    # 특수문자 제거 (한글, 영문, 숫자, 일부 기호만 허용)
    safe_name = re.sub(r'[^\w\s가-힣.-]', '', name)
    
    # 빈 이름인 경우 UUID 사용
    if not safe_name.strip():
        safe_name = str(uuid.uuid4())[:8]
    
    return f"{safe_name}{ext}"


def format_file_size(size_bytes):
    """파일 크기 포맷팅"""
    if size_bytes == 0:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    i = 0
    size = float(size_bytes)
    
    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1
    
    return f"{size:.1f} {units[i]}"
