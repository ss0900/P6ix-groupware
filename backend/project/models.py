# backend/project/models.py
from django.db import models
from django.conf import settings


def task_attachment_path(instance, filename):
    """업무 첨부파일 저장 경로"""
    return f"project/tasks/{instance.task.id}/{filename}"


class Project(models.Model):
    """프로젝트"""
    STATUS_PREPARING = "preparing"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_ON_HOLD = "on_hold"
    STATUS_CHOICES = [
        (STATUS_PREPARING, "준비중"),
        (STATUS_IN_PROGRESS, "진행중"),
        (STATUS_COMPLETED, "완료"),
        (STATUS_ON_HOLD, "보류"),
    ]

    code = models.CharField("프로젝트 코드", max_length=50, unique=True)
    name = models.CharField("프로젝트 명칭", max_length=200)
    description = models.TextField("설명/메모", blank=True)
    
    start_date = models.DateField("시작일", null=True, blank=True)
    end_date = models.DateField("종료일", null=True, blank=True)
    
    status = models.CharField(
        "상태", 
        max_length=20, 
        choices=STATUS_CHOICES, 
        default=STATUS_PREPARING
    )
    progress = models.PositiveIntegerField("진행률", default=0, help_text="0~100%")
    
    is_public = models.BooleanField("공개 여부", default=False)
    is_important = models.BooleanField("중요 표시", default=False)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_projects",
        verbose_name="생성자"
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_projects",
        verbose_name="관리자"
    )
    
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "프로젝트"
        verbose_name_plural = "프로젝트"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["is_public"]),
            models.Index(fields=["-updated_at"]),
        ]

    def __str__(self):
        return f"[{self.code}] {self.name}"


class ProjectMember(models.Model):
    """프로젝트 멤버"""
    ROLE_ADMIN = "admin"
    ROLE_MEMBER = "member"
    ROLE_VIEWER = "viewer"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "관리자"),
        (ROLE_MEMBER, "멤버"),
        (ROLE_VIEWER, "뷰어"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="members",
        verbose_name="프로젝트"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
        verbose_name="사용자"
    )
    role = models.CharField(
        "역할",
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_MEMBER
    )
    is_active = models.BooleanField("활성 상태", default=True)
    joined_at = models.DateTimeField("참여일", auto_now_add=True)

    class Meta:
        verbose_name = "프로젝트 멤버"
        verbose_name_plural = "프로젝트 멤버"
        unique_together = ["project", "user"]
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.project.name} - {self.user.username} ({self.get_role_display()})"


class Task(models.Model):
    """업무/이슈"""
    STATUS_WAITING = "waiting"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_ON_HOLD = "on_hold"
    STATUS_CHOICES = [
        (STATUS_WAITING, "대기"),
        (STATUS_IN_PROGRESS, "진행중"),
        (STATUS_COMPLETED, "완료"),
        (STATUS_ON_HOLD, "보류"),
    ]

    PRIORITY_URGENT = "urgent"
    PRIORITY_HIGH = "high"
    PRIORITY_NORMAL = "normal"
    PRIORITY_LOW = "low"
    PRIORITY_CHOICES = [
        (PRIORITY_URGENT, "긴급"),
        (PRIORITY_HIGH, "높음"),
        (PRIORITY_NORMAL, "보통"),
        (PRIORITY_LOW, "낮음"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tasks",
        verbose_name="프로젝트",
        help_text="null이면 미분류"
    )
    title = models.CharField("업무명", max_length=300)
    content = models.TextField("내용", blank=True)
    
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_tasks",
        verbose_name="관리자"
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
        verbose_name="담당자"
    )
    
    status = models.CharField(
        "상태",
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_WAITING
    )
    priority = models.CharField(
        "우선순위",
        max_length=20,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_NORMAL
    )
    
    start_date = models.DateField("시작일", null=True, blank=True)
    due_date = models.DateField("마감일", null=True, blank=True)
    
    is_read = models.BooleanField("읽음 여부", default=False)
    is_disabled = models.BooleanField("사용중지", default=False)
    is_important = models.BooleanField("중요 표시", default=False)
    notify_enabled = models.BooleanField("알림 활성화", default=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tasks",
        verbose_name="작성자"
    )
    
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "업무"
        verbose_name_plural = "업무"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["assignee", "status"]),
            models.Index(fields=["-updated_at"]),
            models.Index(fields=["is_disabled"]),
        ]

    def __str__(self):
        project_name = self.project.name if self.project else "미분류"
        return f"[{project_name}] {self.title}"


class TaskWatcher(models.Model):
    """업무 참조인"""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="watchers",
        verbose_name="업무"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="watching_tasks",
        verbose_name="참조인"
    )
    created_at = models.DateTimeField("추가일", auto_now_add=True)

    class Meta:
        verbose_name = "참조인"
        verbose_name_plural = "참조인"
        unique_together = ["task", "user"]

    def __str__(self):
        return f"{self.task.title} - {self.user.username}"


class TaskAttachment(models.Model):
    """업무 첨부파일"""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="attachments",
        verbose_name="업무"
    )
    file = models.FileField("파일", upload_to=task_attachment_path)
    original_name = models.CharField("원본 파일명", max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField("파일 크기", default=0)
    
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="업로더"
    )
    uploaded_at = models.DateTimeField("업로드일", auto_now_add=True)

    class Meta:
        verbose_name = "첨부파일"
        verbose_name_plural = "첨부파일"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.original_name or self.file.name

    def save(self, *args, **kwargs):
        if self.file and not self.original_name:
            self.original_name = self.file.name
        if self.file and not self.file_size:
            self.file_size = self.file.size
        super().save(*args, **kwargs)


class TaskComment(models.Model):
    """업무 댓글"""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name="업무"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="작성자"
    )
    content = models.TextField("내용")
    
    created_at = models.DateTimeField("작성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "댓글"
        verbose_name_plural = "댓글"
        ordering = ["created_at"]

    def __str__(self):
        author_name = self.author.username if self.author else "알수없음"
        return f"{self.task.title} - {author_name}"


class ActivityLog(models.Model):
    """활동 로그"""
    ACTION_CHOICES = [
        ("created", "생성됨"),
        ("updated", "수정됨"),
        ("deleted", "삭제됨"),
        ("status_changed", "상태 변경"),
        ("assigned", "담당자 지정"),
        ("commented", "댓글 작성"),
        ("file_uploaded", "파일 업로드"),
        ("member_added", "멤버 추가"),
        ("member_removed", "멤버 제거"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activity_logs",
        verbose_name="프로젝트"
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="activity_logs",
        verbose_name="업무"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="사용자"
    )
    
    action = models.CharField("활동 유형", max_length=30, choices=ACTION_CHOICES)
    description = models.TextField("설명", blank=True)
    
    created_at = models.DateTimeField("일시", auto_now_add=True)

    class Meta:
        verbose_name = "활동 로그"
        verbose_name_plural = "활동 로그"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "-created_at"]),
            models.Index(fields=["task", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.get_action_display()} - {self.user}"


class TimesheetEntry(models.Model):
    """타임시트 (시간 기록)"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="timesheet_entries",
        verbose_name="사용자"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="timesheet_entries",
        verbose_name="프로젝트"
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timesheet_entries",
        verbose_name="업무"
    )
    work_date = models.DateField("작업일")
    hours = models.DecimalField(
        "시간",
        max_digits=4,
        decimal_places=1,
        default=0,
        help_text="소수점 1자리까지 (예: 1.5시간)"
    )
    memo = models.TextField("메모", blank=True)
    
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "타임시트"
        verbose_name_plural = "타임시트"
        ordering = ["-work_date", "-created_at"]
        unique_together = ["user", "project", "task", "work_date"]
        indexes = [
            models.Index(fields=["user", "work_date"]),
            models.Index(fields=["project", "work_date"]),
        ]

    def __str__(self):
        project_name = self.project.name if self.project else "미분류"
        return f"{self.user.username} - {project_name} - {self.work_date} ({self.hours}h)"


class WorkDiaryEntry(models.Model):
    """업무일지"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="work_diary_entries",
        verbose_name="사용자"
    )
    date = models.DateField("날짜")
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_diary_entries",
        verbose_name="프로젝트"
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_diary_entries",
        verbose_name="업무"
    )
    content = models.TextField("내용")
    
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "업무일지"
        verbose_name_plural = "업무일지"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["user", "date"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.date}"

